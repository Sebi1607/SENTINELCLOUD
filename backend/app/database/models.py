import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.connection import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def generate_monitor_id() -> str:
    return f"mon-{uuid.uuid4().hex[:8]}"


def generate_incident_id() -> str:
    return f"inc-{uuid.uuid4().hex[:8]}"


class Monitor(Base):
    __tablename__ = "monitors"

    id: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
        default=generate_monitor_id,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    url: Mapped[str] = mapped_column(String(2048), nullable=False)
    method: Mapped[str] = mapped_column(String(16), nullable=False, default="GET")
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="UP", index=True
    )
    latency: Mapped[int | None] = mapped_column(Integer, nullable=True, default=None)
    interval: Mapped[str] = mapped_column(String(16), nullable=False, default="30s")
    latency_threshold: Mapped[int] = mapped_column(
        Integer, nullable=False, default=200
    )
    uptime_percentage: Mapped[float] = mapped_column(
        Float, nullable=False, default=100.0
    )
    http_status_code: Mapped[int | None] = mapped_column(
        Integer, nullable=True, default=200
    )
    region: Mapped[str] = mapped_column(
        String(64), nullable=False, default="us-east-1"
    )

    # SSL metadata
    ssl_valid: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    ssl_issuer: Mapped[str] = mapped_column(
        String(255), nullable=False, default="Let's Encrypt Authority X3"
    )
    ssl_expires_days: Mapped[int] = mapped_column(Integer, nullable=False, default=90)
    ssl_protocol: Mapped[str] = mapped_column(
        String(64), nullable=False, default="TLS 1.3 / HTTP/2"
    )

    # Alert channel flags
    alert_email: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    alert_discord: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    alert_slack: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Optional serialized snapshots for 4-region latencies & 24h ticks
    region_latencies: Mapped[list | None] = mapped_column(JSON, nullable=True)
    uptime_history_24h: Mapped[list | None] = mapped_column(JSON, nullable=True)

    # UTC timestamps
    last_checked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=utc_now
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
    )

    # Relationships
    check_results: Mapped[list["CheckResult"]] = relationship(
        "CheckResult",
        back_populates="monitor",
        cascade="all, delete-orphan",
        order_by="desc(CheckResult.checked_at)",
    )
    incidents: Mapped[list["Incident"]] = relationship(
        "Incident",
        back_populates="monitor",
        cascade="all, delete-orphan",
        order_by="desc(Incident.started_at)",
    )

    __table_args__ = (
        Index("ix_monitors_status_region", "status", "region"),
    )

    def __repr__(self) -> str:
        return (
            f"<Monitor(id={self.id!r}, name={self.name!r}, "
            f"url={self.url!r}, status={self.status!r}, latency={self.latency!r})>"
        )


class CheckResult(Base):
    __tablename__ = "check_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    monitor_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("monitors.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="UP", index=True
    )
    latency: Mapped[int | None] = mapped_column(Integer, nullable=True)
    http_status_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    region: Mapped[str] = mapped_column(
        String(64), nullable=False, default="us-east-1"
    )
    is_spike: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    annotation: Mapped[str | None] = mapped_column(String(255), nullable=True)
    error_message: Mapped[str | None] = mapped_column(String(512), nullable=True)
    checked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, index=True
    )

    monitor: Mapped["Monitor"] = relationship("Monitor", back_populates="check_results")

    __table_args__ = (
        Index("ix_check_results_monitor_checked_at", "monitor_id", "checked_at"),
    )

    def __repr__(self) -> str:
        return (
            f"<CheckResult(id={self.id!r}, monitor_id={self.monitor_id!r}, "
            f"status={self.status!r}, latency={self.latency!r})>"
        )


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
        default=generate_incident_id,
    )
    monitor_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("monitors.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type: Mapped[str] = mapped_column(
        String(32), nullable=False, default="OUTAGE"
    )
    status_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reason: Mapped[str] = mapped_column(String(512), nullable=False)
    duration: Mapped[str] = mapped_column(
        String(64), nullable=False, default="Ongoing"
    )
    resolved: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, index=True
    )
    timestamp_label: Mapped[str | None] = mapped_column(String(128), nullable=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, index=True
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    monitor: Mapped["Monitor"] = relationship("Monitor", back_populates="incidents")

    __table_args__ = (
        Index("ix_incidents_monitor_resolved", "monitor_id", "resolved", "started_at"),
    )

    @property
    def status(self) -> str:
        return "RESOLVED" if self.resolved else "OPEN"

    @status.setter
    def status(self, value: str) -> None:
        self.resolved = value.upper() == "RESOLVED"

    def __repr__(self) -> str:
        return (
            f"<Incident(id={self.id!r}, monitor_id={self.monitor_id!r}, "
            f"type={self.type!r}, status={self.status!r}, resolved={self.resolved!r})>"
        )
