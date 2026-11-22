from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from app.database.connection import get_db
from app.database.models import Incident
from app.schemas.monitor import IncidentRecordSchema

router = APIRouter(prefix="/incidents", tags=["Incidents"])


@router.get("", response_model=list[IncidentRecordSchema])
def list_incidents(
    status_filter: str | None = Query(default=None, alias="status"),
    monitor_id: str | None = Query(default=None, alias="monitorId"),
    db: Session = Depends(get_db),
) -> list[IncidentRecordSchema]:
    """Return incident records formatted to match the frontend IncidentRecord interface."""
    query = (
        db.query(Incident)
        .options(joinedload(Incident.monitor))
        .order_by(Incident.resolved.asc(), Incident.started_at.desc())
    )

    if status_filter:
        norm = status_filter.upper()
        if norm in ("ACTIVE", "OPEN"):
            query = query.filter(Incident.resolved.is_(False))
        elif norm == "RESOLVED":
            query = query.filter(Incident.resolved.is_(True))

    if monitor_id:
        query = query.filter(Incident.monitor_id == monitor_id)

    incidents = query.all()
    result: list[IncidentRecordSchema] = []

    for inc in incidents:
        mon = inc.monitor
        timestamp_str = inc.timestamp_label or (
            f"Active since {inc.started_at.strftime('%H:%M UTC')}"
            if not inc.resolved
            else inc.started_at.strftime("%Y-%m-%d %H:%M UTC")
        )
        inc_type = (
            inc.type
            if inc.type in ("OUTAGE", "DEGRADED", "SSL_WARNING", "RESOLVED")
            else "OUTAGE"
        )
        result.append(
            IncidentRecordSchema(
                id=inc.id,
                timestamp=timestamp_str,
                type=inc_type,  # type: ignore[arg-type]
                statusCode=inc.status_code,
                reason=inc.reason,
                duration=inc.duration,
                resolved=inc.resolved,
                monitorId=inc.monitor_id,
                monitorName=mon.name if mon else "Monitored Endpoint",
                monitorUrl=mon.url if mon else "",
            )
        )

    return result
