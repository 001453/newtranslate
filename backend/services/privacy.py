"""
GlobalBridge AI — Privacy & data egress control.
Ensures user data stays on-device when privacy mode is enabled.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from config import get_settings
from services.qvac_client import qvac_client


class TranslationProvider(str, Enum):
    QVAC = "qvac"           # 100% local via QVAC bridge
    TOGETHER = "together"   # Cloud — Together AI
    AUTO = "auto"           # QVAC first, cloud only if allowed + QVAC down


@dataclass
class PrivacyStatus:
    mode: str
    local_processing_only: bool
    translation_provider: str
    stt_provider: str
    qvac_available: bool
    cloud_allowed: bool
    data_egress_points: list[str]
    guarantees: list[str]


class PrivacyService:
    """
    Privacy tiers:
    - SOVEREIGN (default when local_processing_only=true): Zero egress
    - HYBRID: QVAC local first, cloud fallback with consent
    - CLOUD: Together AI (fastest quality, data leaves device)
    """

    async def get_status(self) -> PrivacyStatus:
        settings = get_settings()
        qvac_ok = await qvac_client.is_available()

        egress: list[str] = []
        guarantees: list[str] = []

        provider = settings.translation_provider

        if settings.local_processing_only or provider == TranslationProvider.QVAC.value:
            mode = "sovereign"
            cloud_allowed = False
            effective_provider = "qvac" if qvac_ok else "whisper-only (qvac offline)"
            stt = "faster-whisper-local"
            guarantees = [
                "no_audio_egress",
                "no_transcript_cloud",
                "translation_local_qvac",
                "pdf_local",
            ]
            if not qvac_ok:
                egress.append("qvac_offline")
        elif provider == TranslationProvider.TOGETHER.value:
            mode = "cloud"
            cloud_allowed = True
            effective_provider = "together-ai"
            stt = "faster-whisper-local"
            egress = [
                "text_to_together",
                "summary_to_cloud",
            ]
            guarantees = ["stt_still_local"]
        else:  # auto
            mode = "hybrid"
            cloud_allowed = settings.allow_cloud_fallback
            effective_provider = "qvac" if qvac_ok else (
                "together-ai" if settings.allow_cloud_fallback else "none"
            )
            stt = "faster-whisper-local"
            guarantees = ["stt_local"]
            if qvac_ok:
                guarantees.append("translation_qvac_first")
            if settings.allow_cloud_fallback:
                egress.append("together_fallback")

        return PrivacyStatus(
            mode=mode,
            local_processing_only=settings.local_processing_only,
            translation_provider=effective_provider,
            stt_provider=stt,
            qvac_available=qvac_ok,
            cloud_allowed=cloud_allowed,
            data_egress_points=egress,
            guarantees=guarantees,
        )

    def assert_no_cloud(self) -> None:
        settings = get_settings()
        if settings.local_processing_only:
            return
        if settings.translation_provider == TranslationProvider.TOGETHER.value:
            raise PermissionError("Cloud translation blocked — enable LOCAL_PROCESSING_ONLY or switch provider")


privacy_service = PrivacyService()
