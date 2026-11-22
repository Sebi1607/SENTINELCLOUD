from typing import Literal
from pydantic import AliasChoices, BaseModel, ConfigDict, Field

MonitorStatus = Literal["UP", "DOWN", "PAUSED"]
HttpMethod = Literal["GET", "POST", "HEAD", "PUT"]
MonitorInterval = Literal["30s", "1m", "5m"]
IncidentType = Literal["OUTAGE", "DEGRADED", "SSL_WARNING", "RESOLVED"]
ProbeStatus = Literal["UP", "DOWN"]


class SslInfoSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    valid: bool = True
    issuer: str = "Let's Encrypt Authority X3"
    expiresDays: int = Field(
        default=90,
        validation_alias=AliasChoices("expiresDays", "expires_days", "ssl_expires_days"),
    )
    protocol: str = "TLS 1.3 / HTTP/2"


class UptimeTickSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    hour: str
    status: ProbeStatus
    latency: int | None = None


class IncidentRecordSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: str
    timestamp: str = Field(
        validation_alias=AliasChoices("timestamp", "timestamp_label"),
    )
    type: IncidentType
    statusCode: int | None = Field(
        default=None,
        validation_alias=AliasChoices("statusCode", "status_code"),
    )
    reason: str
    duration: str
    resolved: bool
    monitorId: str | None = Field(
        default=None,
        validation_alias=AliasChoices("monitorId", "monitor_id"),
    )
    monitorName: str | None = Field(
        default=None,
        validation_alias=AliasChoices("monitorName", "monitor_name"),
    )
    monitorUrl: str | None = Field(
        default=None,
        validation_alias=AliasChoices("monitorUrl", "monitor_url"),
    )


class RegionLatencySchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    region: str
    regionName: str = Field(
        validation_alias=AliasChoices("regionName", "region_name"),
    )
    flag: str
    latency: int | None = None
    status: ProbeStatus


class AlertChannelsSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    email: bool = True
    discord: bool = True
    slack: bool | None = False


class MonitorCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(..., min_length=1, max_length=255)
    url: str = Field(..., min_length=1, max_length=2048)
    method: HttpMethod = "GET"
    interval: MonitorInterval = "30s"
    latencyThreshold: int = Field(
        default=200,
        ge=50,
        le=2000,
        validation_alias=AliasChoices("latencyThreshold", "latency_threshold"),
    )
    region: str = "us-east-1"
    alertChannels: AlertChannelsSchema = Field(
        default_factory=AlertChannelsSchema,
        validation_alias=AliasChoices("alertChannels", "alert_channels"),
    )


class MonitorUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str | None = None
    url: str | None = None
    method: HttpMethod | None = None
    status: MonitorStatus | None = None
    interval: MonitorInterval | None = None
    latencyThreshold: int | None = Field(
        default=None,
        validation_alias=AliasChoices("latencyThreshold", "latency_threshold"),
    )
    region: str | None = None
    alertChannels: AlertChannelsSchema | None = Field(
        default=None,
        validation_alias=AliasChoices("alertChannels", "alert_channels"),
    )


class MonitorResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: str
    name: str
    url: str
    method: HttpMethod
    status: MonitorStatus
    latency: int | None = None
    interval: MonitorInterval
    latencyThreshold: int = Field(
        validation_alias=AliasChoices("latencyThreshold", "latency_threshold"),
    )
    uptimePercentage: float = Field(
        validation_alias=AliasChoices("uptimePercentage", "uptime_percentage"),
    )
    uptimeHistory24h: list[UptimeTickSchema] = Field(
        default_factory=list,
        validation_alias=AliasChoices("uptimeHistory24h", "uptime_history_24h"),
    )
    sslStatus: SslInfoSchema = Field(
        validation_alias=AliasChoices("sslStatus", "ssl_status"),
    )
    httpStatusCode: int | None = Field(
        default=200,
        validation_alias=AliasChoices("httpStatusCode", "http_status_code"),
    )
    lastChecked: str = Field(
        default="Just now",
        validation_alias=AliasChoices("lastChecked", "last_checked"),
    )
    region: str
    alertChannels: AlertChannelsSchema = Field(
        validation_alias=AliasChoices("alertChannels", "alert_channels"),
    )
    incidents: list[IncidentRecordSchema] = Field(default_factory=list)
    regionLatencies: list[RegionLatencySchema] = Field(
        default_factory=list,
        validation_alias=AliasChoices("regionLatencies", "region_latencies"),
    )


class TelemetryPointSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    time: str
    latency: int
    isSpike: bool | None = Field(
        default=None,
        validation_alias=AliasChoices("isSpike", "is_spike"),
    )
    p95: int | None = None
    status: ProbeStatus
    annotation: str | None = None


class MonitorHistoryResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    monitorId: str = Field(
        validation_alias=AliasChoices("monitorId", "monitor_id"),
    )
    range: Literal["24h", "7d"] = "24h"
    uptimePercentage: float = Field(
        validation_alias=AliasChoices("uptimePercentage", "uptime_percentage"),
    )
    uptimeHistory24h: list[UptimeTickSchema] = Field(
        default_factory=list,
        validation_alias=AliasChoices("uptimeHistory24h", "uptime_history_24h"),
    )
    telemetry: list[TelemetryPointSchema] = Field(default_factory=list)


class PingProbeResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    status: MonitorStatus
    httpStatusCode: int | None = Field(
        default=None,
        validation_alias=AliasChoices("httpStatusCode", "http_status_code"),
    )
    latency: int | None = None
    lastChecked: str = "Just now"
    message: str


class MonitorPingResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    monitor: MonitorResponse
    probeResult: PingProbeResult = Field(
        validation_alias=AliasChoices("probeResult", "probe_result"),
    )
