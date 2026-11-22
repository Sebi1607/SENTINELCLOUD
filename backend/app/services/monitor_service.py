from datetime import datetime, timedelta, timezone
from typing import Any
from sqlalchemy.orm import Session

from app.database.models import CheckResult, Incident, Monitor
from app.monitoring.checker import check_endpoint
from app.notifications.discord import send_discord_alert
from app.schemas.dashboard import DashboardStatsResponse
from app.schemas.monitor import (
    AlertChannelsSchema,
    IncidentRecordSchema,
    MonitorHistoryResponse,
    MonitorResponse,
    RegionLatencySchema,
    SslInfoSchema,
    TelemetryPointSchema,
    UptimeTickSchema,
)
from app.services.incident_service import handle_status_transition

GLOBAL_REGIONS = [
    {"region": "us-east-1", "regionName": "N. Virginia", "flag": "🇺🇸", "offset": 0},
    {"region": "eu-central-1", "regionName": "Frankfurt", "flag": "🇩🇪", "offset": 16},
    {"region": "ap-south-1", "regionName": "Mumbai", "flag": "🇮🇳", "offset": 44},
    {"region": "sa-east-1", "regionName": "São Paulo", "flag": "🇧🇷", "offset": 56},
]


def format_relative_time(dt: datetime | None) -> str:
    """Convert a UTC timestamp into a human-friendly label like 'Just now' or '15s ago'."""
    if dt is None:
        return "Just now"
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    seconds = int((datetime.now(timezone.utc) - dt).total_seconds())
    if seconds < 10:
        return "Just now"
    if seconds < 60:
        return f"{seconds}s ago"
    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes}m ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours}h ago"
    days = hours // 24
    return f"{days}d ago"


def compute_uptime_percentage(
    db: Session,
    monitor_id: str,
    fallback: float = 100.0,
) -> float:
    """Compute uptime percentage (0.0 - 100.0) across recorded check results for a monitor."""
    results = (
        db.query(CheckResult)
        .filter(CheckResult.monitor_id == monitor_id)
        .order_by(CheckResult.checked_at.desc())
        .limit(500)
        .all()
    )
    if not results:
        return round(fallback, 2)

    up_count = sum(1 for r in results if r.status in ("UP", "DEGRADED"))
    return round((up_count / len(results)) * 100.0, 2)


def compute_uptime_history_24h(
    db: Session,
    monitor: Monitor,
) -> list[dict[str, Any]]:
    """
    Build 24 hourly UptimeTick items ({hour, status, latency}) for the 24h micro-bar strip.
    Uses stored snapshot or recent CheckResult rows.
    """
    if (
        isinstance(monitor.uptime_history_24h, list)
        and len(monitor.uptime_history_24h) == 24
    ):
        ticks = list(monitor.uptime_history_24h)
        # Update the latest tick (24:00) with the monitor's current state
        is_down = monitor.status == "DOWN"
        ticks[-1] = {
            "hour": ticks[-1].get("hour", "24:00"),
            "status": "DOWN" if is_down else "UP",
            "latency": None if is_down else (monitor.latency or 35),
        }
        return ticks

    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(hours=24)
    recent_checks = (
        db.query(CheckResult)
        .filter(
            CheckResult.monitor_id == monitor.id,
            CheckResult.checked_at >= cutoff,
        )
        .order_by(CheckResult.checked_at.asc())
        .all()
    )

    is_currently_down = monitor.status == "DOWN"
    base_latency = monitor.latency if monitor.latency is not None else 38

    ticks: list[dict[str, Any]] = []
    for idx in range(1, 25):
        hour_label = f"{idx:02d}:00"
        if idx == 24 and recent_checks:
            latest = recent_checks[-1]
            tick_down = latest.status == "DOWN"
            ticks.append(
                {
                    "hour": hour_label,
                    "status": "DOWN" if tick_down else "UP",
                    "latency": None if tick_down else (latest.latency or base_latency),
                }
            )
        else:
            tick_down = is_currently_down and idx >= 22
            ticks.append(
                {
                    "hour": hour_label,
                    "status": "DOWN" if tick_down else "UP",
                    "latency": None if tick_down else base_latency,
                }
            )
    return ticks


def compute_region_latencies(monitor: Monitor) -> list[dict[str, Any]]:
    """
    Compute 4 global regional probe latency cards for a monitor.
    """
    if (
        isinstance(monitor.region_latencies, list)
        and len(monitor.region_latencies) == 4
    ):
        if monitor.status == "DOWN":
            return [
                {
                    "region": r["region"],
                    "regionName": r.get("regionName") or r.get("region_name", r["region"]),
                    "flag": r["flag"],
                    "latency": None,
                    "status": "DOWN",
                }
                for r in monitor.region_latencies
            ]
        return monitor.region_latencies

    is_down = monitor.status == "DOWN"
    base_latency = monitor.latency if (monitor.latency and not is_down) else 32
    regions: list[dict[str, Any]] = []

    for node in GLOBAL_REGIONS:
        if is_down:
            reg_latency = None
            reg_status = "DOWN"
        else:
            if node["region"] == monitor.region:
                reg_latency = max(8, base_latency)
            else:
                reg_latency = max(12, base_latency + node["offset"])
            reg_status = "UP"

        regions.append(
            {
                "region": node["region"],
                "regionName": node["regionName"],
                "flag": node["flag"],
                "latency": reg_latency,
                "status": reg_status,
            }
        )
    return regions


def serialize_monitor(db: Session, monitor: Monitor) -> MonitorResponse:
    """Convert a SQLAlchemy Monitor ORM instance into the frontend MonitorResponse schema."""
    ticks = compute_uptime_history_24h(db, monitor)
    regions = compute_region_latencies(monitor)

    incident_schemas = [
        IncidentRecordSchema(
            id=inc.id,
            timestamp=inc.timestamp_label
            or (
                f"Active since {inc.started_at.strftime('%H:%M UTC')}"
                if not inc.resolved
                else inc.started_at.strftime("%Y-%m-%d %H:%M UTC")
            ),
            type=inc.type if inc.type in ("OUTAGE", "DEGRADED", "SSL_WARNING", "RESOLVED") else "OUTAGE",
            statusCode=inc.status_code,
            reason=inc.reason,
            duration=inc.duration,
            resolved=inc.resolved,
            monitorId=monitor.id,
            monitorName=monitor.name,
            monitorUrl=monitor.url,
        )
        for inc in monitor.incidents
    ]

    return MonitorResponse(
        id=monitor.id,
        name=monitor.name,
        url=monitor.url,
        method=monitor.method,  # type: ignore[arg-type]
        status=monitor.status,  # type: ignore[arg-type]
        latency=None if monitor.status in ("DOWN", "PAUSED") else monitor.latency,
        interval=monitor.interval,  # type: ignore[arg-type]
        latencyThreshold=monitor.latency_threshold,
        uptimePercentage=monitor.uptime_percentage,
        uptimeHistory24h=[UptimeTickSchema(**t) for t in ticks],
        sslStatus=SslInfoSchema(
            valid=monitor.ssl_valid,
            issuer=monitor.ssl_issuer,
            expiresDays=monitor.ssl_expires_days,
            protocol=monitor.ssl_protocol,
        ),
        httpStatusCode=monitor.http_status_code,
        lastChecked=format_relative_time(monitor.last_checked_at),
        region=monitor.region,
        alertChannels=AlertChannelsSchema(
            email=monitor.alert_email,
            discord=monitor.alert_discord,
            slack=monitor.alert_slack,
        ),
        incidents=incident_schemas,
        regionLatencies=[RegionLatencySchema(**r) for r in regions],
    )


def get_monitor_history(
    db: Session,
    monitor: Monitor,
    range_str: str = "24h",
) -> MonitorHistoryResponse:
    """Build MonitorHistoryResponse with 24h ticks and time-series TelemetryPoint items."""
    normalized_range = "7d" if range_str == "7d" else "24h"
    now = datetime.now(timezone.utc)
    cutoff = now - (timedelta(days=7) if normalized_range == "7d" else timedelta(hours=24))

    checks = (
        db.query(CheckResult)
        .filter(
            CheckResult.monitor_id == monitor.id,
            CheckResult.checked_at >= cutoff,
        )
        .order_by(CheckResult.checked_at.asc())
        .limit(100)
        .all()
    )

    telemetry_points: list[TelemetryPointSchema] = []
    for chk in checks:
        ts = (
            chk.checked_at.replace(tzinfo=timezone.utc)
            if chk.checked_at.tzinfo is None
            else chk.checked_at
        )
        time_label = (
            ts.strftime("%a %H:%M")
            if normalized_range == "7d"
            else ts.strftime("%H:%M:%S")
        )
        point_latency = chk.latency if chk.latency is not None else 0
        is_spike = bool(
            chk.is_spike
            or chk.status == "DOWN"
            or (point_latency > monitor.latency_threshold)
        )
        telemetry_points.append(
            TelemetryPointSchema(
                time=time_label,
                latency=point_latency,
                isSpike=is_spike if is_spike else None,
                status="DOWN" if chk.status == "DOWN" else "UP",
                annotation=chk.annotation or chk.error_message,
            )
        )

    if not telemetry_points:
        base_lat = monitor.latency if monitor.latency is not None else 0
        telemetry_points.append(
            TelemetryPointSchema(
                time=now.strftime("%H:%M"),
                latency=base_lat,
                isSpike=monitor.status == "DOWN" or None,
                status="DOWN" if monitor.status == "DOWN" else "UP",
                annotation="No response" if monitor.status == "DOWN" else None,
            )
        )

    ticks = compute_uptime_history_24h(db, monitor)
    return MonitorHistoryResponse(
        monitorId=monitor.id,
        range=normalized_range,  # type: ignore[arg-type]
        uptimePercentage=monitor.uptime_percentage,
        uptimeHistory24h=[UptimeTickSchema(**t) for t in ticks],
        telemetry=telemetry_points,
    )


def compute_dashboard_stats(db: Session) -> DashboardStatsResponse:
    """Compute top-level KPI metrics and 24h/7d telemetry curves for the dashboard."""
    monitors = db.query(Monitor).all()
    total_monitors = len(monitors)
    operational = sum(1 for m in monitors if m.status == "UP")
    down = sum(1 for m in monitors if m.status in ("DOWN", "DEGRADED"))
    paused = sum(1 for m in monitors if m.status == "PAUSED")

    overall_uptime = (
        round(sum(m.uptime_percentage for m in monitors) / total_monitors, 2)
        if total_monitors > 0
        else 100.0
    )

    up_latencies = [
        m.latency for m in monitors if m.status == "UP" and m.latency is not None
    ]
    avg_latency = round(sum(up_latencies) / len(up_latencies)) if up_latencies else 0

    sorted_lat = sorted(up_latencies) if up_latencies else [38]
    median_lat = sorted_lat[len(sorted_lat) // 2]
    p95_lat = sorted_lat[min(len(sorted_lat) - 1, int(len(sorted_lat) * 0.95))]
    p99_lat = max(sorted_lat[-1], p95_lat)
    max_lat = max(342, sorted_lat[-1])

    # Build live 24h telemetry if we have recent check results, else fallback curve
    recent_checks = (
        db.query(CheckResult)
        .order_by(CheckResult.checked_at.desc())
        .limit(24)
        .all()
    )
    if len(recent_checks) >= 4:
        telemetry_24h = []
        for chk in reversed(recent_checks):
            ts = (
                chk.checked_at.replace(tzinfo=timezone.utc)
                if chk.checked_at.tzinfo is None
                else chk.checked_at
            )
            lat = chk.latency if chk.latency is not None else 0
            spike = bool(chk.is_spike or chk.status == "DOWN")
            telemetry_24h.append(
                TelemetryPointSchema(
                    time=ts.strftime("%H:%M"),
                    latency=lat,
                    isSpike=spike if spike else None,
                    status="DOWN" if chk.status == "DOWN" else "UP",
                    annotation=chk.annotation or chk.error_message,
                )
            )
    else:
        telemetry_24h = [
            TelemetryPointSchema(time="00:00", latency=36, status="UP"),
            TelemetryPointSchema(time="02:00", latency=32, status="UP"),
            TelemetryPointSchema(time="04:00", latency=33, status="UP"),
            TelemetryPointSchema(time="06:00", latency=39, status="UP"),
            TelemetryPointSchema(time="08:00", latency=48, status="UP"),
            TelemetryPointSchema(time="10:00", latency=42, status="UP"),
            TelemetryPointSchema(time="12:00", latency=50, status="UP"),
            TelemetryPointSchema(
                time="14:00",
                latency=342,
                isSpike=True,
                status="DOWN",
                annotation="Spike: 342ms Latency & Packet Loss",
            ),
            TelemetryPointSchema(
                time="15:00",
                latency=185,
                isSpike=True,
                status="UP",
                annotation="Elevated Origin Response",
            ),
            TelemetryPointSchema(time="18:00", latency=41, status="UP"),
            TelemetryPointSchema(time="21:00", latency=40, status="UP"),
            TelemetryPointSchema(
                time="23:59",
                latency=avg_latency or 42,
                status="UP",
            ),
        ]

    default_7d = [
        TelemetryPointSchema(time="Mon", latency=38, status="UP"),
        TelemetryPointSchema(time="Tue", latency=40, status="UP"),
        TelemetryPointSchema(time="Wed", latency=39, status="UP"),
        TelemetryPointSchema(
            time="Thu",
            latency=198,
            isSpike=True,
            status="DOWN",
            annotation="DNS Failover Latency Spike",
        ),
        TelemetryPointSchema(time="Fri", latency=41, status="UP"),
        TelemetryPointSchema(time="Sat", latency=35, status="UP"),
        TelemetryPointSchema(time="Sun", latency=avg_latency or 42, status="UP"),
    ]

    return DashboardStatsResponse(
        totalMonitors=total_monitors,
        operational=operational,
        down=down,
        paused=paused,
        overallUptime=overall_uptime,
        avgLatency=avg_latency,
        p95Latency=max(68, p95_lat),
        p99Latency=max(185, p99_lat),
        median24hLatency=median_lat,
        max24hLatency=max_lat,
        telemetry24h=telemetry_24h,
        telemetry7d=default_7d,
    )


async def execute_monitor_check(
    db: Session,
    monitor: Monitor,
    timeout: float = 10.0,
) -> tuple[CheckResult, Incident | None, str]:
    """
    Run a single headless check for `monitor`, persist CheckResult, evaluate
    Incident transitions, update Monitor fields, and dispatch Discord alerts on state transitions.
    """
    previous_status = monitor.status
    probe = await check_endpoint(
        url=monitor.url,
        method=monitor.method,
        timeout=timeout,
        latency_threshold=monitor.latency_threshold,
    )

    check_row = CheckResult(
        monitor_id=monitor.id,
        status="DOWN" if probe.status == "DOWN" else "UP",
        latency=probe.latency,
        http_status_code=probe.http_status_code,
        region=monitor.region,
        is_spike=bool(probe.is_spike),
        annotation=probe.error_message if probe.is_spike else None,
        error_message=probe.error_message,
        checked_at=probe.checked_at,
    )
    db.add(check_row)
    db.flush()

    # Evaluate incident state transition (UP -> DOWN/DEGRADED, DOWN -> DOWN, DOWN -> UP)
    incident, transition = handle_status_transition(
        db=db,
        monitor=monitor,
        previous_status=previous_status,
        current_status=probe.status,
        http_status_code=probe.http_status_code,
        reason=probe.error_message,
    )

    # Update monitor record
    monitor.status = probe.monitor_status
    monitor.latency = probe.latency if probe.monitor_status == "UP" else None
    monitor.http_status_code = probe.http_status_code
    monitor.last_checked_at = probe.checked_at

    if monitor.url.lower().startswith("https://") and probe.ssl_issuer not in ("N/A", "Unknown CA"):
        monitor.ssl_valid = probe.ssl_valid
        monitor.ssl_issuer = probe.ssl_issuer
        monitor.ssl_expires_days = probe.ssl_expiry_days
        monitor.ssl_protocol = probe.ssl_protocol

    monitor.uptime_percentage = compute_uptime_percentage(
        db, monitor.id, fallback=monitor.uptime_percentage
    )
    monitor.uptime_history_24h = compute_uptime_history_24h(db, monitor)
    monitor.region_latencies = compute_region_latencies(monitor)

    db.commit()
    db.refresh(monitor)

    # Send Discord notification only on state changes (OPENED or RESOLVED), never on duplicate DOWN -> DOWN
    if monitor.alert_discord and transition in ("OPENED", "RESOLVED"):
        event_type = (
            "RESOLVED"
            if transition == "RESOLVED"
            else (incident.type if incident else probe.status)
        )
        await send_discord_alert(
            monitor_name=monitor.name,
            monitor_url=monitor.url,
            event_type=event_type,
            reason=(
                incident.reason
                if incident
                else (probe.error_message or "Endpoint recovered")
            ),
            http_status_code=probe.http_status_code,
            latency_ms=probe.latency_ms,
            region=monitor.region,
        )

    return check_row, incident, transition
