from datetime import datetime, timezone
from typing import Any

import httpx

from app.config import settings

# Discord Embed decimal colors
COLOR_OUTAGE_RED = 0xF43F5E      # Red for DOWN / OUTAGE
COLOR_DEGRADED_AMBER = 0xF59E0B  # Amber for DEGRADED / SSL_WARNING
COLOR_RECOVERY_GREEN = 0x10B981  # Green for UP / RESOLVED


async def send_discord_alert(
    monitor_name: str,
    monitor_url: str,
    event_type: str = "OUTAGE",
    reason: str = "Endpoint check failed",
    http_status_code: int | None = None,
    latency_ms: float | int | None = None,
    region: str = "us-east-1",
    webhook_url: str | None = None,
) -> dict[str, Any]:
    """
    Post a color-coded Discord Embed alert to webhook_url or settings.DISCORD_WEBHOOK_URL.
    - Red: OUTAGE / DOWN
    - Amber: DEGRADED / SSL_WARNING
    - Green: RESOLVED / UP / TEST
    Gracefully skips if webhook URL is empty and catches any network errors.
    """
    target_webhook = (webhook_url or settings.DISCORD_WEBHOOK_URL or "").strip()
    if not target_webhook:
        return {
            "sent": False,
            "reason": "DISCORD_WEBHOOK_URL is empty; notification skipped.",
        }

    normalized_type = event_type.upper()
    if normalized_type in ("OUTAGE", "DOWN"):
        color = COLOR_OUTAGE_RED
        title = f"🚨 [P1 OUTAGE] {monitor_name} is DOWN"
    elif normalized_type in ("DEGRADED", "SSL_WARNING", "WARNING"):
        color = COLOR_DEGRADED_AMBER
        title = f"⚠️ [DEGRADED] {monitor_name} Performance Warning"
    elif normalized_type in ("RESOLVED", "UP", "RECOVERY"):
        color = COLOR_RECOVERY_GREEN
        title = f"✅ [RESOLVED] {monitor_name} is Operational"
    else:
        color = COLOR_RECOVERY_GREEN
        title = f"🔔 [SENTINEL TEST] {monitor_name}"

    fields = [
        {"name": "Target URL", "value": f"`{monitor_url}`", "inline": False},
        {"name": "Event Type", "value": f"**{normalized_type}**", "inline": True},
        {"name": "Primary Region", "value": f"`{region}`", "inline": True},
    ]

    if http_status_code is not None:
        fields.append(
            {"name": "HTTP Status", "value": f"`HTTP {http_status_code}`", "inline": True}
        )
    if latency_ms is not None:
        fields.append(
            {"name": "Latency", "value": f"`{latency_ms} ms`", "inline": True}
        )

    payload = {
        "username": "SentinelCloud Alert Engine",
        "embeds": [
            {
                "title": title,
                "description": reason,
                "color": color,
                "fields": fields,
                "footer": {"text": "SentinelCloud Distributed Probe Engine v2.4"},
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        ],
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.post(target_webhook, json=payload)
            if 200 <= response.status_code < 300:
                return {"sent": True, "status_code": response.status_code}
            return {
                "sent": False,
                "status_code": response.status_code,
                "reason": f"Discord returned HTTP {response.status_code}",
            }
    except Exception as exc:
        # Never crash the monitoring engine on notification failure
        return {
            "sent": False,
            "reason": f"Discord webhook error suppressed: {exc}",
        }
