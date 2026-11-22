from pydantic import AliasChoices, BaseModel, ConfigDict, Field
from app.schemas.monitor import MonitorInterval, TelemetryPointSchema


class KPIStatsSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    totalMonitors: int = Field(
        validation_alias=AliasChoices("totalMonitors", "total_monitors"),
    )
    operational: int
    down: int
    avgLatency: int = Field(
        validation_alias=AliasChoices("avgLatency", "avg_latency"),
    )


class DashboardStatsResponse(KPIStatsSchema):
    paused: int = 0
    overallUptime: float = Field(
        default=100.0,
        validation_alias=AliasChoices("overallUptime", "overall_uptime"),
    )
    p95Latency: int = Field(
        default=68,
        validation_alias=AliasChoices("p95Latency", "p95_latency"),
    )
    p99Latency: int = Field(
        default=185,
        validation_alias=AliasChoices("p99Latency", "p99_latency"),
    )
    median24hLatency: int = Field(
        default=38,
        validation_alias=AliasChoices("median24hLatency", "median_24h_latency"),
    )
    max24hLatency: int = Field(
        default=342,
        validation_alias=AliasChoices("max24hLatency", "max_24h_latency"),
    )
    telemetry24h: list[TelemetryPointSchema] = Field(
        default_factory=list,
        validation_alias=AliasChoices("telemetry24h", "telemetry_24h"),
    )
    telemetry7d: list[TelemetryPointSchema] = Field(
        default_factory=list,
        validation_alias=AliasChoices("telemetry7d", "telemetry_7d"),
    )


class DiscordTestRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    webhookUrl: str = Field(
        validation_alias=AliasChoices("webhookUrl", "webhook_url"),
    )
    threshold: int = 250


class DiscordTestResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    success: bool
    channel: str = "discord"
    webhookUrl: str = Field(
        validation_alias=AliasChoices("webhookUrl", "webhook_url"),
    )
    threshold: int
    message: str


class SystemSettingsSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    probeInterval: MonitorInterval = Field(
        default="30s",
        validation_alias=AliasChoices("probeInterval", "probe_interval"),
    )
    timeoutSeconds: int = Field(
        default=10,
        ge=2,
        le=30,
        validation_alias=AliasChoices("timeoutSeconds", "timeout_seconds"),
    )
    followRedirects: bool = Field(
        default=True,
        validation_alias=AliasChoices("followRedirects", "follow_redirects"),
    )
    strictSsl: bool = Field(
        default=True,
        validation_alias=AliasChoices("strictSsl", "strict_ssl"),
    )
    emailAlertsEnabled: bool = Field(
        default=True,
        validation_alias=AliasChoices("emailAlertsEnabled", "email_alerts_enabled"),
    )
    discordWebhookUrl: str = Field(
        default="",
        validation_alias=AliasChoices("discordWebhookUrl", "discord_webhook_url"),
    )
    alertThresholdMs: int = Field(
        default=250,
        validation_alias=AliasChoices("alertThresholdMs", "alert_threshold_ms"),
    )
    apiKey: str = Field(
        default="sc_live_948f1028ba49102c0194821a81",
        validation_alias=AliasChoices("apiKey", "api_key"),
    )
