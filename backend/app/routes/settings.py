from fastapi import APIRouter

from app.config import settings
from app.notifications.discord import send_discord_alert
from app.schemas.dashboard import (
    DiscordTestRequest,
    DiscordTestResponse,
    SystemSettingsSchema,
)

router = APIRouter(tags=["Settings & Alerts"])

# In-memory runtime settings state initialized from environment config
_runtime_settings = SystemSettingsSchema(
    probeInterval="30s",
    timeoutSeconds=10,
    followRedirects=True,
    strictSsl=True,
    emailAlertsEnabled=True,
    discordWebhookUrl=settings.DISCORD_WEBHOOK_URL,
    alertThresholdMs=250,
    apiKey="sc_live_948f1028ba49102c0194821a81",
)


@router.get("/settings", response_model=SystemSettingsSchema)
def get_system_settings() -> SystemSettingsSchema:
    """Return current global probe and notification settings."""
    return _runtime_settings


@router.put("/settings", response_model=SystemSettingsSchema)
def update_system_settings(payload: SystemSettingsSchema) -> SystemSettingsSchema:
    """Update global probe and notification settings."""
    global _runtime_settings
    _runtime_settings = payload
    if payload.discordWebhookUrl:
        settings.DISCORD_WEBHOOK_URL = payload.discordWebhookUrl.strip()
    return _runtime_settings


@router.post("/settings/test-discord", response_model=DiscordTestResponse)
@router.post("/alerts/test-discord", response_model=DiscordTestResponse)
async def test_discord_webhook(
    payload: DiscordTestRequest,
) -> DiscordTestResponse:
    """Send a test notification to a Discord webhook URL directly from the UI."""
    target_url = (payload.webhookUrl or settings.DISCORD_WEBHOOK_URL or "").strip()

    alert_res = await send_discord_alert(
        monitor_name="SentinelCloud Webhook Verification",
        monitor_url="https://api.sentinelcloud.io/v1/health",
        event_type="TEST",
        reason=(
            f"Test alert dispatched from SentinelCloud UI. "
            f"Configured latency threshold: {payload.threshold}ms."
        ),
        http_status_code=200,
        latency_ms=34,
        region="us-east-1",
        webhook_url=target_url,
    )

    sent_ok = bool(alert_res.get("sent"))
    if sent_ok:
        msg = (
            f"Test alert dispatched to Discord ({target_url[:32]}...)! "
            f"Latency threshold: {payload.threshold}ms. Webhook verified."
        )
    else:
        reason = alert_res.get("reason", "Webhook delivery skipped or failed.")
        msg = f"Discord test completed ({reason})"

    return DiscordTestResponse(
        success=sent_ok,
        channel="discord",
        webhookUrl=target_url,
        threshold=payload.threshold,
        message=msg,
    )
