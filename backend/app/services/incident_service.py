from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.database.models import Incident, Monitor


def format_duration(started_at: datetime, ended_at: datetime) -> str:
    """Format duration between two timestamps as human-readable e.g. '4m 12s' or '18s'."""
    if started_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=timezone.utc)
    if ended_at.tzinfo is None:
        ended_at = ended_at.replace(tzinfo=timezone.utc)

    total_seconds = max(1, int((ended_at - started_at).total_seconds()))
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)

    if hours > 0:
        return f"{hours}h {minutes}m"
    if minutes > 0:
        return f"{minutes}m {seconds}s"
    return f"{seconds}s"


def get_open_incident(db: Session, monitor_id: str) -> Incident | None:
    """Return the active (unresolved) incident for a monitor, if one exists."""
    return (
        db.query(Incident)
        .filter(Incident.monitor_id == monitor_id, Incident.resolved.is_(False))
        .order_by(Incident.started_at.desc())
        .first()
    )


def handle_status_transition(
    db: Session,
    monitor: Monitor,
    previous_status: str,
    current_status: str,
    http_status_code: int | None = None,
    reason: str | None = None,
) -> tuple[Incident | None, str]:
    """
    Evaluate state transition between previous_status and current_status:
      - UP -> DOWN (or DEGRADED): Open ONE new Incident record (status="OPEN", resolved=False, started_at=now(UTC)).
      - DOWN -> DOWN (or ongoing unhealthy state): Keep existing open incident active (NO duplicate incident/alert).
      - DOWN (or DEGRADED) -> UP: Resolve the open incident (status="RESOLVED", resolved=True, resolved_at=now(UTC)).

    Returns (incident, transition_action) where transition_action is one of:
      "OPENED" | "ONGOING" | "RESOLVED" | "NONE"
    """
    now = datetime.now(timezone.utc)
    prev = (previous_status or "UP").upper()
    curr = (current_status or "UP").upper()

    open_incident = get_open_incident(db, monitor.id)

    # Case 1: Target is unhealthy (DOWN or DEGRADED)
    if curr in ("DOWN", "DEGRADED"):
        if open_incident is not None:
            # DOWN -> DOWN: Keep existing open incident active, do NOT duplicate
            elapsed = format_duration(open_incident.started_at, now)
            started_utc = (
                open_incident.started_at.replace(tzinfo=timezone.utc)
                if open_incident.started_at.tzinfo is None
                else open_incident.started_at
            )
            open_incident.timestamp_label = (
                f"Active since {started_utc.strftime('%H:%M UTC')} ({elapsed} ago)"
            )
            if curr == "DOWN" and open_incident.type == "DEGRADED":
                open_incident.type = "OUTAGE"
            if http_status_code is not None:
                open_incident.status_code = http_status_code
            if reason:
                open_incident.reason = reason
            db.commit()
            db.refresh(open_incident)
            return open_incident, "ONGOING"

        # UP -> DOWN (or DEGRADED) with no open incident: Open ONE new incident
        incident_type = "OUTAGE" if curr == "DOWN" else "DEGRADED"
        default_reason = (
            f"HTTP {http_status_code}: Endpoint unreachable or returned error"
            if http_status_code
            else "Endpoint connection timeout or DNS failure"
        )
        if curr == "DEGRADED" and not reason:
            default_reason = (
                f"Elevated response latency exceeded threshold ({monitor.latency_threshold}ms)"
            )

        new_incident = Incident(
            monitor_id=monitor.id,
            type=incident_type,
            status_code=http_status_code,
            reason=reason or default_reason,
            duration="Ongoing",
            resolved=False,
            timestamp_label=f"Active since {now.strftime('%H:%M UTC')} (Just now)",
            started_at=now,
            resolved_at=None,
        )
        db.add(new_incident)
        db.commit()
        db.refresh(new_incident)
        return new_incident, "OPENED"

    # Case 2: Target is healthy (UP)
    if curr == "UP":
        if open_incident is not None or prev in ("DOWN", "DEGRADED"):
            if open_incident is not None:
                open_incident.resolved = True
                open_incident.resolved_at = now
                open_incident.duration = format_duration(open_incident.started_at, now)
                open_incident.timestamp_label = f"Resolved at {now.strftime('%H:%M UTC')}"
                db.commit()
                db.refresh(open_incident)
                return open_incident, "RESOLVED"

    return None, "NONE"
