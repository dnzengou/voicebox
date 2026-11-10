"""Tests for HostHeaderMiddleware — DNS rebinding defense.

Uses a minimal FastAPI app that mirrors the real wiring in
backend/app.py so the middleware runs the same way it does in
production, without pulling in torch / transformers.

Usage:
    python -m pytest backend/tests/test_host_validation.py -v
"""

from unittest.mock import patch

import pytest
from fastapi import FastAPI
from starlette.testclient import TestClient

from backend.utils.host_validation import HostHeaderMiddleware


def _build_app() -> FastAPI:
    app = FastAPI()
    app.add_middleware(HostHeaderMiddleware)

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    @app.post("/generate")
    async def generate():
        return {"ok": True}

    return app


@pytest.fixture
def client():
    # TestClient defaults ``Host: testserver`` — override per-call instead.
    return TestClient(_build_app())


class TestHostValidationDefaults:
    """Loopback + tauri hosts are accepted, everything else rejected."""

    @pytest.mark.parametrize("host", [
        "localhost",
        "localhost:17493",
        "127.0.0.1",
        "127.0.0.1:17493",
        "127.0.0.1:5173",
        "[::1]",
        "[::1]:17493",
        "tauri.localhost",
    ])
    def test_allowed_hosts(self, client, host):
        response = client.get("/health", headers={"Host": host})
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

    @pytest.mark.parametrize("host", [
        "evil.com",
        "attacker.example.com",
        "attacker.example.com:17493",
        "voicebox.attacker.com",
        # Legitimate LAN addresses aren't in the default list — they can
        # be added via VOICEBOX_ALLOWED_HOSTS but must not pass by default.
        "192.168.1.10:17493",
        "10.0.0.5",
    ])
    def test_blocked_hosts(self, client, host):
        response = client.get("/health", headers={"Host": host})
        assert response.status_code == 421
        body = response.json()
        assert body["error"] == "invalid_host"

    def test_blocked_hosts_reject_state_changing_requests(self, client):
        """The whole point: DNS-rebound POSTs never reach the handler."""
        response = client.post("/generate", headers={"Host": "attacker.com"})
        assert response.status_code == 421

    def test_case_insensitive(self, client):
        response = client.get("/health", headers={"Host": "LOCALHOST:17493"})
        assert response.status_code == 200

    def test_missing_host_header_rejected(self):
        """A request with no Host header is malformed for HTTP/1.1 — reject."""
        app = _build_app()
        # Empty string reaches middleware after Starlette normalizes it.
        inner_client = TestClient(app)
        response = inner_client.get("/health", headers={"Host": ""})
        assert response.status_code == 421


class TestHostValidationEnvOverride:
    """VOICEBOX_ALLOWED_HOSTS extends the allowlist."""

    def test_env_extends_allowlist(self, client):
        with patch.dict(
            "os.environ",
            {"VOICEBOX_ALLOWED_HOSTS": "voicebox.mynet.local,192.168.1.10:17493"},
        ):
            r = client.get("/health", headers={"Host": "voicebox.mynet.local"})
            assert r.status_code == 200
            r = client.get("/health", headers={"Host": "voicebox.mynet.local:17493"})
            assert r.status_code == 200
            r = client.get("/health", headers={"Host": "192.168.1.10:17493"})
            assert r.status_code == 200

    def test_env_port_specific_entries_are_exact(self, client):
        """An entry with ``:port`` must match that exact port, not any."""
        with patch.dict(
            "os.environ",
            {"VOICEBOX_ALLOWED_HOSTS": "192.168.1.10:17493"},
        ):
            r = client.get("/health", headers={"Host": "192.168.1.10:9999"})
            assert r.status_code == 421

    def test_env_bare_host_matches_any_port(self, client):
        """Entries without a port allow any port for that host."""
        with patch.dict(
            "os.environ",
            {"VOICEBOX_ALLOWED_HOSTS": "voicebox.mynet.local"},
        ):
            for port in (":80", ":443", ":17493", ""):
                r = client.get(
                    "/health", headers={"Host": f"voicebox.mynet.local{port}"}
                )
                assert r.status_code == 200, port

    def test_env_defaults_still_active(self, client):
        with patch.dict(
            "os.environ",
            {"VOICEBOX_ALLOWED_HOSTS": "voicebox.mynet.local"},
        ):
            r = client.get("/health", headers={"Host": "127.0.0.1:17493"})
            assert r.status_code == 200

    def test_env_untrusted_still_blocked(self, client):
        with patch.dict(
            "os.environ",
            {"VOICEBOX_ALLOWED_HOSTS": "voicebox.mynet.local"},
        ):
            r = client.get("/health", headers={"Host": "attacker.com"})
            assert r.status_code == 421

    def test_whitespace_and_empty_entries_ignored(self, client):
        with patch.dict(
            "os.environ",
            {"VOICEBOX_ALLOWED_HOSTS": "  , voicebox.mynet.local ,,"},
        ):
            r = client.get("/health", headers={"Host": "voicebox.mynet.local"})
            assert r.status_code == 200


class TestHostValidationDisableSwitch:
    """VOICEBOX_DISABLE_HOST_CHECK bypasses validation."""

    @pytest.mark.parametrize("value", ["1", "true", "yes", "TRUE"])
    def test_disabled_allows_any_host(self, client, value):
        with patch.dict("os.environ", {"VOICEBOX_DISABLE_HOST_CHECK": value}):
            r = client.get("/health", headers={"Host": "attacker.com"})
            assert r.status_code == 200

    @pytest.mark.parametrize("value", ["0", "false", "no", ""])
    def test_disabled_flag_off_still_enforces(self, client, value):
        with patch.dict("os.environ", {"VOICEBOX_DISABLE_HOST_CHECK": value}):
            r = client.get("/health", headers={"Host": "attacker.com"})
            assert r.status_code == 421
