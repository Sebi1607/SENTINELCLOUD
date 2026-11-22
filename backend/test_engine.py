"""Standalone verification script for Stage 3 Headless Monitoring, Incident & Notification Engines."""

import asyncio

from app.database.connection import Base, SessionLocal, engine
from app.database.models import Incident, Monitor
from app.monitoring.checker import check_endpoint
from app.notifications.discord import send_discord_alert
from app.services.incident_service import handle_status_transition
from app.services.monitor_service import (
    compute_dashboard_stats,
    compute_uptime_history_24h,
    compute_uptime_percentage,
)


async def run_engine_tests() -> None:
    print("==================================================================")
    print("  SentinelCloud Stage 3: Core Headless Engines Verification")
    print("==================================================================\n")

    # 1. Live HTTP + TLS Check on https://www.google.com (expecting UP)
    print("[1/5] Probing live endpoint: https://www.google.com ...")
    google_result = await check_endpoint("https://www.google.com", method="GET", timeout=10.0)
    print(f"      Status          : {google_result.status}")
    print(f"      HTTP Status Code: {google_result.http_status_code}")
    print(f"      Latency (ms)    : {google_result.latency_ms} ms")
    print(
        f"      TLS Certificate : valid={google_result.ssl_valid}, "
        f"issuer={google_result.ssl_issuer!r}, "
        f"expires_in={google_result.ssl_expiry_days} days, "
        f"protocol={google_result.ssl_protocol!r}"
    )
    if google_result.error_message:
        print(f"      Error Message   : {google_result.error_message}")
    assert google_result.status == "UP", f"Expected google.com to be UP, got {google_result.status}"

    # 2. Unreachable URL + SSRF Protection Checks (expecting DOWN)
    unreachable_url = "https://unreachable.sentinelcloud-invalid-domain.test/healthz"
    print(f"\n[2/5] Probing unreachable endpoint: {unreachable_url} ...")
    down_result = await check_endpoint(unreachable_url, method="GET", timeout=5.0)
    print(f"      Status          : {down_result.status}")
    print(f"      Error Reason    : {down_result.error_message}")
    assert down_result.status == "DOWN", f"Expected unreachable URL to be DOWN, got {down_result.status}"

    ssrf_url = "http://127.0.0.1:8000/admin"
    print(f"\n[3/5] Testing SSRF guard on restricted loopback URL: {ssrf_url} ...")
    ssrf_result = await check_endpoint(ssrf_url, method="GET", timeout=3.0)
    print(f"      Status          : {ssrf_result.status}")
    print(f"      SSRF Block Msg  : {ssrf_result.error_message}")
    assert ssrf_result.status == "DOWN", "Expected SSRF-blocked URL to return DOWN"

    # 3. Verify Incident Open / Deduplication / Resolve State Machine in SQLite
    print("\n[4/5] Verifying Incident State Machine & Deduplication in SQLite...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    test_monitor_id = "mon-stage3-engine-test"

    try:
        # Clean up any leftover test monitor
        old = db.query(Monitor).filter(Monitor.id == test_monitor_id).first()
        if old:
            db.delete(old)
            db.commit()

        monitor = Monitor(
            id=test_monitor_id,
            name="Stage 3 Engine Test Service",
            url="https://api.sentinelcloud.io/v1/health",
            method="GET",
            status="UP",
            latency=40,
            interval="30s",
            latency_threshold=200,
        )
        db.add(monitor)
        db.commit()
        db.refresh(monitor)

        # Step A: UP -> DOWN (Should open 1 new incident)
        inc_1, action_1 = handle_status_transition(
            db=db,
            monitor=monitor,
            previous_status="UP",
            current_status="DOWN",
            http_status_code=504,
            reason="504 Gateway Timeout: Origin unreachable",
        )
        monitor.status = "DOWN"
        db.commit()
        open_count_1 = (
            db.query(Incident)
            .filter(Incident.monitor_id == monitor.id, Incident.resolved.is_(False))
            .count()
        )
        print(
            f"      Transition UP -> DOWN  : action={action_1!r}, "
            f"incident_id={inc_1.id if inc_1 else None}, "
            f"status={inc_1.status if inc_1 else None}, open_incidents={open_count_1}"
        )
        assert action_1 == "OPENED" and open_count_1 == 1, "Expected exactly 1 open incident on UP -> DOWN"

        # Step B: DOWN -> DOWN (Should keep existing incident active, NO duplicate)
        inc_2, action_2 = handle_status_transition(
            db=db,
            monitor=monitor,
            previous_status="DOWN",
            current_status="DOWN",
            http_status_code=504,
            reason="504 Gateway Timeout: Still unreachable",
        )
        total_count_2 = (
            db.query(Incident).filter(Incident.monitor_id == monitor.id).count()
        )
        print(
            f"      Transition DOWN -> DOWN: action={action_2!r}, "
            f"incident_id={inc_2.id if inc_2 else None}, "
            f"total_incidents_in_db={total_count_2} (no duplicates!)"
        )
        assert action_2 == "ONGOING" and total_count_2 == 1, "Duplicate incident created on DOWN -> DOWN!"
        assert inc_1 is not None and inc_2 is not None and inc_1.id == inc_2.id

        # Step C: DOWN -> UP (Should resolve the open incident)
        inc_3, action_3 = handle_status_transition(
            db=db,
            monitor=monitor,
            previous_status="DOWN",
            current_status="UP",
            http_status_code=200,
        )
        monitor.status = "UP"
        db.commit()
        open_count_3 = (
            db.query(Incident)
            .filter(Incident.monitor_id == monitor.id, Incident.resolved.is_(False))
            .count()
        )
        print(
            f"      Transition DOWN -> UP  : action={action_3!r}, "
            f"incident_id={inc_3.id if inc_3 else None}, "
            f"status={inc_3.status if inc_3 else None}, "
            f"duration={inc_3.duration if inc_3 else None}, "
            f"open_incidents={open_count_3}"
        )
        assert action_3 == "RESOLVED" and open_count_3 == 0 and inc_3 is not None and inc_3.resolved is True

        # 4. Verify Monitor Service & Discord Notification Graceful Skip
        print("\n[5/5] Verifying Monitor Service Helpers & Discord Notifier...")
        uptime_pct = compute_uptime_percentage(db, monitor.id, fallback=99.95)
        ticks_24h = compute_uptime_history_24h(db, monitor)
        dash_stats = compute_dashboard_stats(db)
        discord_res = await send_discord_alert(
            monitor_name=monitor.name,
            monitor_url=monitor.url,
            event_type="OUTAGE",
            reason="Test alert check",
        )
        print(f"      Computed Uptime %     : {uptime_pct}%")
        print(f"      24h Uptime Ticks Count: {len(ticks_24h)} hourly bars")
        print(
            f"      Dashboard Summary KPI : total={dash_stats.totalMonitors}, "
            f"up={dash_stats.operational}, down={dash_stats.down}, avgLatency={dash_stats.avgLatency}ms"
        )
        print(f"      Discord Alert Result  : {discord_res}")

        # Cleanup test monitor
        db.delete(monitor)
        db.commit()
        print("\n✅ Stage 3 Headless Engine Verification Passed!")
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(run_engine_tests())
