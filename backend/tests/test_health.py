"""Health endpoint smoke tests."""

from __future__ import annotations

import pytest


@pytest.mark.asyncio
async def test_health_returns_ok(client):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "GlobalBridge AI"
    assert "whisper_model" in data
    assert "privacy_mode" in data
    assert "qvac_available" in data
