"""Standalone verification script for SentinelCloud SQLite database setup."""

from app.config import settings
from app.database.connection import Base, SessionLocal, engine
from app.database.models import CheckResult, Incident, Monitor


def run_verification() -> None:
    print(f"[1/4] Connecting to database: {settings.DATABASE_URL}")
    Base.metadata.create_all(bind=engine)
    print("      SQLite tables created successfully (monitors, check_results, incidents).")

    db = SessionLocal()
    test_monitor_id = "mon-test-verify"

    try:
        # Clean up any leftover test row from a previous interrupted run
        existing = db.query(Monitor).filter(Monitor.id == test_monitor_id).first()
        if existing:
            db.delete(existing)
            db.commit()

        print("[2/4] Inserting test monitor with sample check result and incident...")
        test_monitor = Monitor(
            id=test_monitor_id,
            name="Test Production API",
            url="https://api.sentinelcloud.io/v1/health",
            method="GET",
            status="UP",
            latency=38,
            interval="30s",
            latency_threshold=200,
            uptime_percentage=99.98,
            http_status_code=200,
            region="us-east-1",
            alert_email=True,
            alert_discord=True,
            alert_slack=False,
        )
        db.add(test_monitor)
        db.flush()

        sample_check = CheckResult(
            monitor_id=test_monitor.id,
            status="UP",
            latency=38,
            http_status_code=200,
            region="us-east-1",
            is_spike=False,
        )
        sample_incident = Incident(
            id="inc-test-verify",
            monitor_id=test_monitor.id,
            type="DEGRADED",
            status_code=429,
            reason="Rate limit threshold hit on secondary ingress",
            duration="4m 12s",
            resolved=True,
            timestamp_label="3 days ago at 04:12 UTC",
        )
        db.add_all([sample_check, sample_incident])
        db.commit()

        print("[3/4] Querying test monitor back from SQLite...")
        queried = db.query(Monitor).filter(Monitor.id == test_monitor_id).first()
        if not queried:
            raise RuntimeError("Failed to query inserted test monitor!")

        print(f"      Queried Monitor : {queried}")
        print(f"      Created At (UTC): {queried.created_at.isoformat()}")
        print(f"      Check Results   : {queried.check_results}")
        print(f"      Incidents       : {queried.incidents}")

        print("[4/4] Deleting test monitor row...")
        db.delete(queried)
        db.commit()

        remaining = db.query(Monitor).filter(Monitor.id == test_monitor_id).first()
        assert remaining is None, "Test monitor was not deleted!"
        print("      Test monitor and cascaded child rows deleted cleanly.")
        print("\n✅ Stage 2 Database Verification Passed!")
    finally:
        db.close()


if __name__ == "__main__":
    run_verification()
