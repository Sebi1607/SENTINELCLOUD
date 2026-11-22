import asyncio
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.database.connection import SessionLocal
from app.database.models import Monitor
from app.services.monitor_service import execute_monitor_check

logger = logging.getLogger("sentinelcloud.scheduler")

INTERVAL_SECONDS_MAP: dict[str, int] = {
    "30s": 30,
    "1m": 60,
    "5m": 300,
}

# Track monitors currently being probed to prevent overlapping concurrent checks
_active_monitor_checks: set[str] = set()

scheduler = AsyncIOScheduler(
    job_defaults={
        "coalesce": True,
        "max_instances": 1,
        "misfire_grace_time": 15,
    }
)


async def run_single_monitor_check_safe(monitor_id: str) -> None:
    """
    Execute a single monitor check inside its own SQLAlchemy session,
    guarded against overlapping runs for the same monitor_id.
    """
    if monitor_id in _active_monitor_checks:
        logger.debug("Skipping overlapping check for monitor %s", monitor_id)
        return

    _active_monitor_checks.add(monitor_id)
    db = SessionLocal()
    try:
        monitor = db.query(Monitor).filter(Monitor.id == monitor_id).first()
        if not monitor or monitor.status == "PAUSED":
            return
        await execute_monitor_check(db, monitor)
    except Exception as exc:
        logger.warning("Scheduled check error for monitor %s: %s", monitor_id, exc)
    finally:
        db.close()
        _active_monitor_checks.discard(monitor_id)


async def run_interval_batch(interval_label: str) -> None:
    """
    Query all active (non-PAUSED) monitors configured for `interval_label`
    ('30s', '1m', or '5m') and probe them concurrently.
    """
    db = SessionLocal()
    try:
        monitor_ids = [
            row[0]
            for row in db.query(Monitor.id)
            .filter(
                Monitor.interval == interval_label,
                Monitor.status != "PAUSED",
            )
            .all()
        ]
    except Exception as exc:
        logger.warning("Failed to query monitors for interval %s: %s", interval_label, exc)
        monitor_ids = []
    finally:
        db.close()

    if not monitor_ids:
        return

    await asyncio.gather(
        *(run_single_monitor_check_safe(mid) for mid in monitor_ids),
        return_exceptions=True,
    )


def start_scheduler() -> None:
    """
    Register interval jobs ('30s', '1m', '5m') with replace_existing=True
    and start the AsyncIOScheduler if not already running.
    """
    for interval_label, seconds in INTERVAL_SECONDS_MAP.items():
        job_id = f"sentinel_probe_batch_{interval_label}"
        scheduler.add_job(
            run_interval_batch,
            trigger=IntervalTrigger(seconds=seconds),
            args=[interval_label],
            id=job_id,
            name=f"Probe monitors every {interval_label}",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )

    if not scheduler.running:
        scheduler.start()
        logger.info("SentinelCloud AsyncIOScheduler started (30s, 1m, 5m probe loops).")


def stop_scheduler() -> None:
    """Cleanly stop the AsyncIOScheduler on application shutdown."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("SentinelCloud AsyncIOScheduler stopped.")
