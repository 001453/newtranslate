"""
GlobalBridge AI — QVAC local AI client.
All requests stay on localhost; zero cloud data egress.
https://qvac.tether.io/
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass

import httpx

from config import get_settings

logger = logging.getLogger(__name__)


@dataclass
class QvacResponse:
    text: str
    latency_ms: float
    provider: str = "qvac-local"
    data_egress: bool = False
    model: str = ""


class QvacClient:
    """HTTP client for local QVAC bridge (Node.js @qvac/sdk sidecar)."""

    def __init__(self):
        settings = get_settings()
        self.base_url = settings.qvac_bridge_url.rstrip("/")
        self.timeout = settings.qvac_timeout_seconds

    async def is_available(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                r = await client.get(f"{self.base_url}/health")
                return r.status_code == 200 and r.json().get("local_only") is True
        except Exception:
            return False

    async def health(self) -> dict:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get(f"{self.base_url}/health")
            r.raise_for_status()
            return r.json()

    async def warm_model(self) -> bool:
        await self.completion("Reply OK only.", "ping")
        return bool((await self.health()).get("llm_loaded"))

    async def completion(self, system: str, user: str) -> QvacResponse:
        start = time.perf_counter()
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            r = await client.post(
                f"{self.base_url}/completion",
                json={"system": system, "user": user, "stream": False},
            )
            r.raise_for_status()
            data = r.json()

        return QvacResponse(
            text=data.get("text", ""),
            latency_ms=(time.perf_counter() - start) * 1000,
            model=data.get("model", "qvac"),
            data_egress=False,
        )

    async def translate(self, text: str, from_lang: str, to_lang: str) -> QvacResponse:
        start = time.perf_counter()
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            r = await client.post(
                f"{self.base_url}/translate",
                json={"text": text, "from": from_lang, "to": to_lang},
            )
            r.raise_for_status()
            data = r.json()

        return QvacResponse(
            text=data.get("text", ""),
            latency_ms=(time.perf_counter() - start) * 1000,
            data_egress=False,
        )

    async def transcribe_pcm(
        self,
        pcm: bytes,
        *,
        language: str | None = None,
        sample_rate: int = 16000,
    ) -> QvacResponse:
        """Mono int16 PCM @ 16 kHz → QVAC whisper.cpp (localhost only)."""
        import base64

        start = time.perf_counter()
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            r = await client.post(
                f"{self.base_url}/transcribe",
                json={
                    "audio_base64": base64.b64encode(pcm).decode("ascii"),
                    "language": language,
                    "sample_rate": sample_rate,
                },
            )
            r.raise_for_status()
            data = r.json()

        return QvacResponse(
            text=(data.get("text") or "").strip(),
            latency_ms=(time.perf_counter() - start) * 1000,
            provider=data.get("provider", "qvac-whisper"),
            data_egress=False,
            model=data.get("engine", "whispercpp"),
        )


qvac_client = QvacClient()
