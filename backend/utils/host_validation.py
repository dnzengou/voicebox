"""Host-header validation middleware — DNS rebinding defense.

Voicebox binds to loopback by default, so an attacker cannot connect
directly. But a browser tab already loaded from ``attacker.com`` can
still hit ``http://127.0.0.1:17493`` after a DNS-rebinding trick that
flips ``attacker.com`` to loopback: CORS blocks the *response* from being
read, but state-changing endpoints still execute.

This middleware short-circuits any request whose ``Host:`` header is not
in the allowlist, so the rebinding attempt never reaches the routes.

Defaults cover the three surfaces Voicebox actually runs on:
  - loopback names (``localhost``, ``127.0.0.1``, ``[::1]``) with any port
  - the Tauri webview scheme (``tauri.localhost``)

Deployments that need to accept other hosts (reverse proxies, LAN access,
Docker with custom hostname) can extend the list via the
``VOICEBOX_ALLOWED_HOSTS`` env var (comma-separated).  Entries may include
a port (``host:port``) or omit it. To disable the check entirely — the
right choice when a trusted reverse proxy owns Host validation upstream —
set ``VOICEBOX_DISABLE_HOST_CHECK=1``.
"""

import logging
import os
from collections.abc import Iterable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.types import ASGIApp

logger = logging.getLogger(__name__)


# Loopback-family hosts — matched with or without any port.
_DEFAULT_HOSTS: tuple[str, ...] = (
    "localhost",
    "127.0.0.1",
    "[::1]",
    "::1",
    "tauri.localhost",
)


def _split_host_port(raw: str) -> tuple[str, str | None]:
    """Return ``(host, port_or_none)`` for a ``Host:`` header value.

    Handles bracketed IPv6 literals (``[::1]:8000``) as well as the plain
    ``host:port`` form. Bare hosts get ``None`` for the port.
    """
    value = raw.strip().lower()
    if not value:
        return "", None
    if value.startswith("["):
        # IPv6 literal — split on the closing bracket to keep colons in the addr.
        end = value.find("]")
        if end == -1:
            return value, None
        host = value[: end + 1]
        rest = value[end + 1 :]
        if rest.startswith(":"):
            return host, rest[1:] or None
        return host, None
    if ":" in value:
        host, _, port = value.rpartition(":")
        return host, port or None
    return value, None


def _normalize_allowed(entries: Iterable[str]) -> set[tuple[str, str | None]]:
    """Normalize allowlist entries into ``(host, port_or_none)`` tuples.

    An entry without a port matches any port. An entry with a port matches
    only that exact port. Empty and whitespace-only entries are dropped.
    """
    out: set[tuple[str, str | None]] = set()
    for raw in entries:
        host, port = _split_host_port(raw)
        if not host:
            continue
        out.add((host, port))
    return out


def _matches(host: str, port: str | None, allowed: set[tuple[str, str | None]]) -> bool:
    """True if ``(host, port)`` matches any entry in the allowlist.

    An allowlist entry with ``port=None`` matches any port on that host.
    An entry with a specific port must match exactly.
    """
    if (host, None) in allowed:
        return True
    return (host, port) in allowed


def get_allowed_hosts(env_value: str | None = None) -> set[tuple[str, str | None]]:
    """Compute the effective allowlist from defaults + env override.

    Passing ``env_value`` explicitly is a test seam; otherwise reads
    ``VOICEBOX_ALLOWED_HOSTS`` from the process env at call time.
    """
    env = env_value if env_value is not None else os.environ.get("VOICEBOX_ALLOWED_HOSTS", "")
    extras = [e for e in (part.strip() for part in env.split(",")) if e]
    return _normalize_allowed(list(_DEFAULT_HOSTS) + extras)


def host_check_disabled() -> bool:
    """True when ``VOICEBOX_DISABLE_HOST_CHECK`` opts out of validation."""
    return os.environ.get("VOICEBOX_DISABLE_HOST_CHECK", "").strip().lower() in {"1", "true", "yes"}


class HostHeaderMiddleware(BaseHTTPMiddleware):
    """Reject requests whose ``Host:`` header is not in the allowlist.

    A missing or empty ``Host:`` header is treated as invalid — every
    HTTP/1.1 client is required to send one, and its absence is a hallmark
    of malformed or crafted requests.
    """

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)
        self._logged_env: str | None = None

    async def dispatch(self, request: Request, call_next) -> Response:
        if host_check_disabled():
            return await call_next(request)

        allowed = get_allowed_hosts()
        raw_host = request.headers.get("host", "")
        host, port = _split_host_port(raw_host)

        # Log the effective allowlist once on first request so operators
        # who extended it via env var can confirm their entries loaded.
        env_value = os.environ.get("VOICEBOX_ALLOWED_HOSTS", "")
        if env_value != self._logged_env:
            self._logged_env = env_value
            if env_value:
                logger.info(
                    "Host validation: %d allowed host(s) — defaults plus %r",
                    len(allowed),
                    env_value,
                )

        if not host or not _matches(host, port, allowed):
            logger.warning(
                "Rejected request with untrusted Host header %r from %s %s %s",
                raw_host,
                request.client.host if request.client else "?",
                request.method,
                request.url.path,
            )
            return JSONResponse(
                status_code=421,
                content={
                    "error": "invalid_host",
                    "detail": (
                        "Request rejected: the Host header is not in the "
                        "Voicebox allowlist. Set VOICEBOX_ALLOWED_HOSTS to "
                        "add hostnames, or VOICEBOX_DISABLE_HOST_CHECK=1 to "
                        "disable the check when running behind a trusted proxy."
                    ),
                },
            )

        return await call_next(request)
