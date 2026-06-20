"""API key middleware tests."""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

import config
from main import app


@pytest.fixture
def api_key_settings(monkeypatch):
    monkeypatch.setenv("API_KEY", "test-secret-key")
    config.get_settings.cache_clear()
    yield
    config.get_settings.cache_clear()
    monkeypatch.delenv("API_KEY", raising=False)


@pytest.mark.asyncio
async def test_health_public_without_key(api_key_settings):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_protected_route_requires_key(api_key_settings):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        denied = await client.post("/api/v1/translate", json={"text": "hello"})
        allowed = await client.post(
            "/api/v1/translate",
            json={"text": "hello"},
            headers={"X-API-Key": "test-secret-key"},
        )
    assert denied.status_code == 401
    assert allowed.status_code != 401
