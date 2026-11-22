import asyncio
from urllib.parse import urlparse
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import Monitor
from app.monitoring.checker import validate_url_ssrf
from app.schemas.monitor import (
    MonitorCreate,
    MonitorHistoryResponse,
    MonitorResponse,
    MonitorUpdate,
)
from app.services.monitor_service import (
    execute_monitor_check,
    get_monitor_history,
    serialize_monitor,
)

router = APIRouter(prefix="/monitors", tags=["Monitors"])


@router.get("", response_model=list[MonitorResponse])
def list_monitors(
    status_filter: str | None = Query(default=None, alias="status"),
    method: str | None = Query(default=None),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[MonitorResponse]:
    """Return all monitors formatted to match the frontend Monitor TypeScript interface."""
    query = db.query(Monitor).order_by(Monitor.created_at.desc())

    if status_filter and status_filter.upper() != "ALL":
        query = query.filter(Monitor.status == status_filter.upper())
    if method and method.upper() != "ALL":
        query = query.filter(Monitor.method == method.upper())
    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(
            (Monitor.name.ilike(pattern)) | (Monitor.url.ilike(pattern))
        )

    monitors = query.all()
    return [serialize_monitor(db, m) for m in monitors]


@router.post("", response_model=MonitorResponse, status_code=status.HTTP_201_CREATED)
async def create_monitor(
    payload: MonitorCreate,
    db: Session = Depends(get_db),
) -> MonitorResponse:
    """
    Validate URL protocol + SSRF rules, create monitor, execute an immediate
    initial check so it doesn't stay pending, and return the created monitor.
    """
    target_url = payload.url.strip()
    parsed = urlparse(target_url)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid URL: must start with http:// or https:// and include a valid hostname.",
        )

    is_safe, _, _, ssrf_error = await asyncio.to_thread(validate_url_ssrf, target_url)
    if not is_safe and ssrf_error and "SSRF protection blocked" in ssrf_error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ssrf_error,
        )

    monitor = Monitor(
        name=payload.name.strip(),
        url=target_url,
        method=payload.method.upper(),
        status="UP",
        latency=None,
        interval=payload.interval,
        latency_threshold=payload.latencyThreshold,
        uptime_percentage=100.0,
        http_status_code=200,
        region=payload.region,
        alert_email=payload.alertChannels.email,
        alert_discord=payload.alertChannels.discord,
        alert_slack=bool(payload.alertChannels.slack),
    )
    db.add(monitor)
    db.commit()
    db.refresh(monitor)

    # Run immediate initial check so monitor has live status, latency, and SSL info right away
    await execute_monitor_check(db, monitor)
    return serialize_monitor(db, monitor)


@router.get("/{monitor_id}", response_model=MonitorResponse)
def get_monitor(
    monitor_id: str,
    db: Session = Depends(get_db),
) -> MonitorResponse:
    """Fetch a single monitor by ID."""
    monitor = db.query(Monitor).filter(Monitor.id == monitor_id).first()
    if not monitor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Monitor '{monitor_id}' not found.",
        )
    return serialize_monitor(db, monitor)


@router.delete("/{monitor_id}")
def delete_monitor(
    monitor_id: str,
    db: Session = Depends(get_db),
) -> dict[str, object]:
    """Delete a monitor and cascade delete its check history and incidents."""
    monitor = db.query(Monitor).filter(Monitor.id == monitor_id).first()
    if not monitor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Monitor '{monitor_id}' not found.",
        )
    db.delete(monitor)
    db.commit()
    return {"deleted": True, "id": monitor_id}


@router.post("/{monitor_id}/check", response_model=MonitorResponse)
@router.post("/{monitor_id}/ping", response_model=MonitorResponse)
async def check_monitor_now(
    monitor_id: str,
    db: Session = Depends(get_db),
) -> MonitorResponse:
    """Trigger an immediate on-demand health check for a monitor and return the updated Monitor."""
    monitor = db.query(Monitor).filter(Monitor.id == monitor_id).first()
    if not monitor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Monitor '{monitor_id}' not found.",
        )

    await execute_monitor_check(db, monitor)
    return serialize_monitor(db, monitor)


@router.patch("/{monitor_id}/pause", response_model=MonitorResponse)
async def toggle_pause_monitor(
    monitor_id: str,
    db: Session = Depends(get_db),
) -> MonitorResponse:
    """Toggle a monitor between PAUSED and active (UP/DOWN via immediate check)."""
    monitor = db.query(Monitor).filter(Monitor.id == monitor_id).first()
    if not monitor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Monitor '{monitor_id}' not found.",
        )

    if monitor.status == "PAUSED":
        monitor.status = "UP"
        db.commit()
        db.refresh(monitor)
        await execute_monitor_check(db, monitor)
    else:
        monitor.status = "PAUSED"
        monitor.latency = None
        db.commit()
        db.refresh(monitor)

    return serialize_monitor(db, monitor)


@router.patch("/{monitor_id}", response_model=MonitorResponse)
def update_monitor(
    monitor_id: str,
    payload: MonitorUpdate,
    db: Session = Depends(get_db),
) -> MonitorResponse:
    """Update a monitor's configuration or status."""
    monitor = db.query(Monitor).filter(Monitor.id == monitor_id).first()
    if not monitor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Monitor '{monitor_id}' not found.",
        )

    if payload.name is not None:
        monitor.name = payload.name.strip()
    if payload.url is not None:
        monitor.url = payload.url.strip()
    if payload.method is not None:
        monitor.method = payload.method.upper()
    if payload.status is not None:
        monitor.status = payload.status.upper()
        if monitor.status == "PAUSED":
            monitor.latency = None
    if payload.interval is not None:
        monitor.interval = payload.interval
    if payload.latencyThreshold is not None:
        monitor.latency_threshold = payload.latencyThreshold
    if payload.region is not None:
        monitor.region = payload.region
    if payload.alertChannels is not None:
        monitor.alert_email = payload.alertChannels.email
        monitor.alert_discord = payload.alertChannels.discord
        monitor.alert_slack = bool(payload.alertChannels.slack)

    db.commit()
    db.refresh(monitor)
    return serialize_monitor(db, monitor)


@router.get("/{monitor_id}/history", response_model=MonitorHistoryResponse)
def get_monitor_check_history(
    monitor_id: str,
    range_str: str = Query(default="24h", alias="range"),
    db: Session = Depends(get_db),
) -> MonitorHistoryResponse:
    """Return historical check records and 24h ticks for TelemetryChart."""
    monitor = db.query(Monitor).filter(Monitor.id == monitor_id).first()
    if not monitor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Monitor '{monitor_id}' not found.",
        )
    return get_monitor_history(db, monitor, range_str=range_str)
