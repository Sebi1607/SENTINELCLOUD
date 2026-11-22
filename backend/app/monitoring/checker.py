import asyncio
import ipaddress
import socket
import ssl
import time
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlparse

import httpx


BLOCKED_HOSTNAMES = {"localhost", "localhost.localdomain", "0.0.0.0", "::1"}


class CheckEndpointResult(dict):
    """Result object supporting both dictionary key and attribute access."""

    def __getattr__(self, name: str) -> Any:
        try:
            return self[name]
        except KeyError as exc:
            raise AttributeError(
                f"'CheckEndpointResult' object has no attribute {name!r}"
            ) from exc

    def __setattr__(self, name: str, value: Any) -> None:
        self[name] = value


def validate_url_ssrf(url: str) -> tuple[bool, str, int, str | None]:
    """
    Validate URL scheme, hostname, and resolved IP address against SSRF rules.
    Returns (is_safe, hostname, port, error_message).
    """
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return False, "", 0, f"Unsupported URL scheme: {parsed.scheme!r}"

    hostname = (parsed.hostname or "").strip().lower()
    if not hostname:
        return False, "", 0, "Invalid URL: missing hostname"

    port = parsed.port or (443 if parsed.scheme == "https" else 80)

    if hostname in BLOCKED_HOSTNAMES:
        return (
            False,
            hostname,
            port,
            f"SSRF protection blocked restricted hostname: {hostname}",
        )

    # Check if hostname is already a literal IP address
    try:
        literal_ip = ipaddress.ip_address(hostname)
        if (
            literal_ip.is_private
            or literal_ip.is_loopback
            or literal_ip.is_link_local
            or literal_ip.is_multicast
            or literal_ip.is_reserved
            or literal_ip.is_unspecified
        ):
            return (
                False,
                hostname,
                port,
                f"SSRF protection blocked restricted IP address: {literal_ip}",
            )
    except ValueError:
        pass

    # Resolve DNS via socket.gethostbyname and verify IP range
    try:
        resolved_ip_str = socket.gethostbyname(hostname)
    except socket.gaierror as exc:
        return False, hostname, port, f"DNS resolution failed for {hostname}: {exc}"

    try:
        resolved_ip = ipaddress.ip_address(resolved_ip_str)
        if (
            resolved_ip.is_private
            or resolved_ip.is_loopback
            or resolved_ip.is_link_local
            or resolved_ip.is_multicast
            or resolved_ip.is_reserved
            or resolved_ip.is_unspecified
        ):
            return (
                False,
                hostname,
                port,
                f"SSRF protection blocked private/loopback IP {resolved_ip_str} ({hostname})",
            )
    except ValueError as exc:
        return False, hostname, port, f"Invalid resolved IP {resolved_ip_str}: {exc}"

    return True, hostname, port, None


def inspect_tls_certificate(
    hostname: str,
    port: int = 443,
    timeout: float = 5.0,
) -> dict[str, Any]:
    """
    Inspect the remote TLS certificate using Python's built-in ssl and socket modules.
    Returns ssl_valid, ssl_issuer, ssl_expiry_days, and ssl_protocol.
    """
    default_info = {
        "ssl_valid": False,
        "ssl_issuer": "Unknown CA",
        "ssl_expiry_days": 0,
        "ssl_protocol": "TLS",
    }
    try:
        context = ssl.create_default_context()
        with socket.create_connection((hostname, port), timeout=timeout) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
                tls_version = ssock.version() or "TLS 1.3"

                # Normalize protocol label (e.g., "TLSv1.3" -> "TLS 1.3")
                protocol_label = tls_version.replace("TLSv", "TLS ")

                # Extract issuer commonName or organizationName
                issuer_str = "Trusted CA"
                if cert and "issuer" in cert:
                    issuer_dict: dict[str, str] = {}
                    for rdn in cert["issuer"]:
                        for key, val in rdn:
                            issuer_dict[key] = val
                    issuer_str = (
                        issuer_dict.get("commonName")
                        or issuer_dict.get("organizationName")
                        or "Trusted CA"
                    )

                # Calculate days remaining until certificate expiry
                expiry_days = 0
                if cert and "notAfter" in cert:
                    expiry_epoch = ssl.cert_time_to_seconds(cert["notAfter"])
                    expiry_dt = datetime.fromtimestamp(expiry_epoch, tz=timezone.utc)
                    now_utc = datetime.now(timezone.utc)
                    delta_days = (expiry_dt - now_utc).days
                    expiry_days = max(0, delta_days)

                return {
                    "ssl_valid": expiry_days > 0,
                    "ssl_issuer": issuer_str,
                    "ssl_expiry_days": expiry_days,
                    "ssl_protocol": protocol_label,
                }
    except Exception:
        return default_info


async def check_endpoint(
    url: str,
    method: str = "GET",
    timeout: float = 10.0,
    latency_threshold: int | None = None,
) -> CheckEndpointResult:
    """
    Execute an asynchronous HTTP health check against the target URL.

    - Performs SSRF validation (blocks localhost, 127.0.0.1, 0.0.0.0, and private/link-local IPs).
    - Measures response latency in milliseconds: round((end - start) * 1000, 2).
    - Classifies status:
        * 'UP' if HTTP 2xx and within latency_threshold
        * 'DEGRADED' if HTTP 2xx and latency exceeds latency_threshold
        * 'DOWN' on HTTP 4xx/5xx, timeouts, DNS errors, SSRF blocks, or connection errors
    - Inspects TLS certificate expiry for https:// endpoints.
    """
    checked_at = datetime.now(timezone.utc)
    http_method = method.upper().strip()

    # 1. SSRF & DNS validation (run blocking DNS lookup in thread pool)
    is_safe, hostname, port, ssrf_error = await asyncio.to_thread(validate_url_ssrf, url)
    if not is_safe:
        return CheckEndpointResult(
            url=url,
            method=http_method,
            status="DOWN",
            monitor_status="DOWN",
            http_status_code=None,
            status_code=None,
            latency_ms=None,
            latency=None,
            is_spike=False,
            error_message=ssrf_error,
            ssl_valid=False,
            ssl_issuer="N/A",
            ssl_expiry_days=0,
            ssl_expires_days=0,
            ssl_protocol="N/A",
            checked_at=checked_at,
        )

    # 2. Kick off TLS inspection concurrently for HTTPS endpoints
    is_https = url.lower().startswith("https://")
    ssl_task = (
        asyncio.to_thread(inspect_tls_certificate, hostname, port, min(timeout, 5.0))
        if is_https
        else None
    )

    # 3. Perform HTTP probe with httpx.AsyncClient
    latency_ms: float | None = None
    http_status_code: int | None = None
    error_message: str | None = None
    status = "DOWN"

    start = time.perf_counter()
    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(timeout),
            follow_redirects=True,
            headers={"User-Agent": "SentinelCloud-Probe/2.4"},
        ) as client:
            response = await client.request(http_method, url)
            end = time.perf_counter()

        latency_ms = round((end - start) * 1000, 2)
        http_status_code = response.status_code

        if 200 <= response.status_code < 300:
            if latency_threshold is not None and latency_ms > latency_threshold:
                status = "DEGRADED"
                error_message = (
                    f"Response time {latency_ms}ms exceeded threshold ({latency_threshold}ms)"
                )
            else:
                status = "UP"
        else:
            status = "DOWN"
            error_message = f"HTTP {response.status_code} {response.reason_phrase}"

    except httpx.TimeoutException:
        end = time.perf_counter()
        status = "DOWN"
        http_status_code = 504
        error_message = f"Request timed out after {timeout}s"
    except httpx.RequestError as exc:
        status = "DOWN"
        error_message = f"Connection failed: {exc}"
    except Exception as exc:
        status = "DOWN"
        error_message = f"Unexpected probe error: {exc}"

    # 4. Collect TLS info if HTTPS
    if ssl_task is not None:
        ssl_info = await ssl_task
    else:
        ssl_info = {
            "ssl_valid": False,
            "ssl_issuer": "None (HTTP)",
            "ssl_expiry_days": 0,
            "ssl_protocol": "HTTP/1.1",
        }

    int_latency = int(round(latency_ms)) if latency_ms is not None else None
    is_spike = status == "DEGRADED" or (
        latency_threshold is not None
        and latency_ms is not None
        and latency_ms > latency_threshold
    )
    # Frontend MonitorStatus uses 'UP' | 'DOWN' | 'PAUSED'
    monitor_status = "UP" if status in ("UP", "DEGRADED") else "DOWN"

    return CheckEndpointResult(
        url=url,
        method=http_method,
        status=status,
        monitor_status=monitor_status,
        http_status_code=http_status_code,
        status_code=http_status_code,
        latency_ms=latency_ms,
        latency=int_latency,
        is_spike=is_spike,
        error_message=error_message,
        ssl_valid=ssl_info["ssl_valid"],
        ssl_issuer=ssl_info["ssl_issuer"],
        ssl_expiry_days=ssl_info["ssl_expiry_days"],
        ssl_expires_days=ssl_info["ssl_expiry_days"],
        ssl_protocol=ssl_info["ssl_protocol"],
        checked_at=checked_at,
    )
