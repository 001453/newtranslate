"""STT provider routing (whisper / qvac / auto)."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import numpy as np
import pytest

from services.qvac_client import QvacResponse
from services.stt import STTService, TranscriptionResult


@pytest.fixture
def svc() -> STTService:
    return STTService()


@pytest.mark.asyncio
async def test_active_provider_whisper_mode(svc: STTService):
    settings = MagicMock(stt_provider="whisper")
    with patch("services.stt.get_settings", return_value=settings):
        assert await svc.active_provider() == "faster-whisper-local"


@pytest.mark.asyncio
async def test_active_provider_qvac_when_bridge_up(svc: STTService):
    settings = MagicMock(stt_provider="qvac")
    with (
        patch("services.stt.get_settings", return_value=settings),
        patch("services.stt.qvac_client.is_available", new=AsyncMock(return_value=True)),
    ):
        assert await svc.active_provider() == "qvac-whisper"


@pytest.mark.asyncio
async def test_active_provider_qvac_fallback_when_bridge_down(svc: STTService):
    settings = MagicMock(stt_provider="qvac")
    with (
        patch("services.stt.get_settings", return_value=settings),
        patch("services.stt.qvac_client.is_available", new=AsyncMock(return_value=False)),
    ):
        assert await svc.active_provider() == "faster-whisper-local"


@pytest.mark.asyncio
async def test_transcribe_uses_qvac_when_configured(svc: STTService):
    settings = MagicMock(
        stt_provider="qvac",
        min_audio_rms=0.001,
        min_stt_language_probability=0.45,
    )
    audio = np.zeros(16000, dtype=np.float32)
    audio[100:200] = 0.5

    qvac_result = QvacResponse(
        text="hello",
        latency_ms=42.0,
        provider="qvac-whisper",
        model="whispercpp",
    )

    with (
        patch("services.stt.get_settings", return_value=settings),
        patch("services.stt.qvac_client.is_available", new=AsyncMock(return_value=True)),
        patch("services.stt.qvac_client.transcribe_pcm", new=AsyncMock(return_value=qvac_result)),
        patch.object(svc._whisper, "transcribe", new=AsyncMock()) as whisper_fn,
    ):
        result = await svc.transcribe(audio, language="en")

    assert result.text == "hello"
    assert result.duration_ms == 42.0
    whisper_fn.assert_not_called()


@pytest.mark.asyncio
async def test_transcribe_falls_back_to_whisper_on_qvac_error(svc: STTService):
    settings = MagicMock(stt_provider="qvac", min_audio_rms=0.001, min_stt_language_probability=0.45)
    audio = np.zeros(16000, dtype=np.float32)
    audio[100:200] = 0.5
    whisper_result = TranscriptionResult(
        text="fallback",
        language="en",
        language_probability=0.9,
        duration_ms=100.0,
    )

    with (
        patch("services.stt.get_settings", return_value=settings),
        patch("services.stt.qvac_client.is_available", new=AsyncMock(return_value=True)),
        patch(
            "services.stt.qvac_client.transcribe_pcm",
            new=AsyncMock(side_effect=RuntimeError("bridge down")),
        ),
        patch.object(svc._whisper, "transcribe", new=AsyncMock(return_value=whisper_result)) as whisper_fn,
    ):
        result = await svc.transcribe(audio, language="en")

    assert result.text == "fallback"
    whisper_fn.assert_called_once()
