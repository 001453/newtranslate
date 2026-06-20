"""
GlobalBridge AI - Speech-to-Text service using Faster-Whisper.
Supports 99+ languages, VAD, speaker-friendly streaming chunks.
"""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field
from typing import Any

import numpy as np

from config import get_settings
from services.qvac_client import qvac_client

logger = logging.getLogger(__name__)

# Lazy-loaded model singleton
_whisper_model: Any = None
_model_lock = asyncio.Lock()

# Common Whisper hallucinations on silence / music (especially short chunks)
_HALLUCINATION_PHRASES = (
    "thank you for watching",
    "thanks for watching",
    "please subscribe",
    "subscribe to",
    "like and subscribe",
    "see you next time",
    "请不吝点赞",
    "字幕",
    "明镜",
    "点点栏目",
    "感谢观看",
    "中文字幕",
)

# CJK / Arabic / etc. — used to detect script-mix garbage
def _script_flags(text: str) -> tuple[bool, bool, bool]:
    cjk = arabic = latin = False
    for ch in text:
        o = ord(ch)
        if o < 128 and ch.isalpha():
            latin = True
        elif "\u4e00" <= ch <= "\u9fff" or "\u3040" <= ch <= "\u30ff" or "\uac00" <= ch <= "\ud7af":
            cjk = True
        elif "\u0600" <= ch <= "\u06ff":
            arabic = True
    return cjk, arabic, latin


def _audio_rms(audio: np.ndarray) -> float:
    if len(audio) == 0:
        return 0.0
    return float(np.sqrt(np.mean(audio * audio)))


def _is_likely_hallucination(
    text: str,
    language_probability: float,
    min_lang_prob: float | None = None,
) -> bool:
    settings = get_settings()
    threshold = min_lang_prob if min_lang_prob is not None else settings.min_stt_language_probability
    cleaned = text.strip()
    if len(cleaned) < 2:
        return True
    if language_probability < threshold:
        return True

    lower = cleaned.lower()
    for phrase in _HALLUCINATION_PHRASES:
        if phrase in lower or phrase in cleaned:
            return True

    cjk, arabic, latin = _script_flags(cleaned)
    # Mixed Latin + CJK in one short phrase → typical noise hallucination
    if cjk and latin and len(cleaned) < 120:
        non_space = sum(1 for c in cleaned if not c.isspace())
        if non_space > 8:
            return True
    if arabic and latin and len(cleaned) < 80:
        return True

    # Very low letter density or mostly punctuation/symbols
    letters = sum(1 for c in cleaned if c.isalpha())
    if letters < max(2, len(cleaned) * 0.25):
        return True

    return False


@dataclass
class TranscriptionResult:
    text: str
    language: str
    language_probability: float
    segments: list[dict[str, Any]] = field(default_factory=list)
    duration_ms: float = 0.0
    is_final: bool = True


@dataclass
class STTConfig:
    model_size: str = "large-v3"
    device: str = "auto"
    compute_type: str = "float16"
    beam_size: int = 5
    vad_filter: bool = True
    language: str | None = None  # None = auto-detect


class WhisperSTTService:
    """Faster-Whisper based STT with async wrapper for FastAPI."""

    SUPPORTED_LANGUAGES = [
        "en", "tr", "es", "zh", "ar", "de", "fr", "ja", "ko", "ru",
        "pt", "it", "hi", "nl", "pl", "sv", "uk", "he", "fa", "id",
        "vi", "th", "ms", "cs", "da", "fi", "el", "hu", "no", "ro",
        "sk", "bg", "hr", "sr", "sl", "et", "lv", "lt", "ca", "eu",
        "gl", "af", "sw", "ta", "te", "bn", "ur", "pa", "mr", "gu",
    ]

    def __init__(self, config: STTConfig | None = None):
        settings = get_settings()
        self.config = config or STTConfig(
            model_size=settings.whisper_model,
            device=settings.whisper_device,
            compute_type=settings.whisper_compute_type,
            beam_size=settings.whisper_beam_size,
            vad_filter=settings.whisper_vad_filter,
        )

    async def _get_model(self):
        global _whisper_model
        async with _model_lock:
            if _whisper_model is None:
                logger.info(
                    "Loading Whisper model: %s on %s",
                    self.config.model_size,
                    self.config.device,
                )
                from faster_whisper import WhisperModel

                device = self.config.device
                if device == "auto":
                    try:
                        import torch

                        device = "cuda" if torch.cuda.is_available() else "cpu"
                    except ImportError:
                        device = "cpu"

                compute = self.config.compute_type
                if device == "cpu" and compute == "float16":
                    compute = "int8"

                _whisper_model = WhisperModel(
                    self.config.model_size,
                    device=device,
                    compute_type=compute,
                )
                logger.info("Whisper model loaded successfully")
            return _whisper_model

    async def transcribe(
        self,
        audio: np.ndarray | bytes,
        sample_rate: int = 16000,
        language: str | None = None,
        *,
        condition_on_previous_text: bool = True,
        initial_prompt: str | None = None,
        min_rms: float | None = None,
        min_lang_prob: float | None = None,
        beam_size: int | None = None,
    ) -> TranscriptionResult:
        """
        Transcribe audio chunk.
        Accepts float32 numpy array [-1,1] or int16 PCM bytes.
        """
        if isinstance(audio, bytes):
            audio = np.frombuffer(audio, dtype=np.int16).astype(np.float32) / 32768.0

        settings = get_settings()
        rms_floor = min_rms if min_rms is not None else settings.min_audio_rms
        if _audio_rms(audio) < rms_floor:
            return TranscriptionResult(
                text="",
                language=language or "unknown",
                language_probability=0.0,
                is_final=False,
            )

        if len(audio) < sample_rate * 0.1:  # < 100ms
            return TranscriptionResult(
                text="",
                language=language or "unknown",
                language_probability=0.0,
                is_final=False,
            )

        loop = asyncio.get_event_loop()
        model = await self._get_model()

        def _run():
            start = time.perf_counter()
            lang = language or self.config.language
            beam = beam_size if beam_size is not None else self.config.beam_size
            prompt = (initial_prompt or "").strip()[-200:] or None
            segments_iter, info = model.transcribe(
                audio,
                language=lang,
                beam_size=beam,
                vad_filter=self.config.vad_filter,
                word_timestamps=True,
                condition_on_previous_text=condition_on_previous_text,
                initial_prompt=prompt,
                no_speech_threshold=0.65,
                log_prob_threshold=-0.85,
                compression_ratio_threshold=2.2,
            )
            segments = []
            texts = []
            for seg in segments_iter:
                if getattr(seg, "no_speech_prob", 0.0) > 0.5:
                    continue
                if getattr(seg, "avg_logprob", 0.0) < -0.9:
                    continue
                line = seg.text.strip()
                if not line:
                    continue
                segments.append({
                    "start": seg.start,
                    "end": seg.end,
                    "text": line,
                })
                texts.append(line)

            full_text = " ".join(texts).strip()
            lang_prob = info.language_probability or 0.0
            if _is_likely_hallucination(full_text, lang_prob, min_lang_prob):
                full_text = ""

            elapsed = (time.perf_counter() - start) * 1000
            return TranscriptionResult(
                text=full_text,
                language=info.language or "unknown",
                language_probability=lang_prob,
                segments=segments,
                duration_ms=elapsed,
            )

        return await loop.run_in_executor(None, _run)

    async def transcribe_stream_chunk(
        self,
        pcm_chunk: bytes,
        sample_rate: int = 16000,
        language: str | None = None,
    ) -> TranscriptionResult:
        """Process a single streaming audio chunk (~500ms)."""
        settings = get_settings()
        min_samples = int(sample_rate * settings.min_audio_duration_ms / 1000)
        audio = np.frombuffer(pcm_chunk, dtype=np.int16).astype(np.float32) / 32768.0

        if len(audio) < min_samples:
            return TranscriptionResult(
                text="",
                language=language or "unknown",
                language_probability=0.0,
                is_final=False,
            )

        return await self.transcribe(
            audio,
            sample_rate,
            language,
            condition_on_previous_text=False,
        )

    async def transcribe_dictation_chunk(
        self,
        pcm_chunk: bytes,
        sample_rate: int = 16000,
        language: str | None = None,
        previous_text: str | None = None,
    ) -> TranscriptionResult:
        """Dictation-optimized chunk — longer context, lower RMS floor, word continuity."""
        settings = get_settings()
        min_samples = int(sample_rate * settings.min_audio_duration_ms / 1000)
        audio = np.frombuffer(pcm_chunk, dtype=np.int16).astype(np.float32) / 32768.0

        if len(audio) < min_samples:
            return TranscriptionResult(
                text="",
                language=language or "unknown",
                language_probability=0.0,
                is_final=False,
            )

        return await self.transcribe(
            audio,
            sample_rate,
            language,
            condition_on_previous_text=True,
            initial_prompt=previous_text,
            min_rms=settings.dictation_min_audio_rms,
            min_lang_prob=settings.dictation_min_language_probability,
            beam_size=settings.whisper_dictation_beam_size,
        )

    async def transcribe_live_chunk(
        self,
        pcm_chunk: bytes,
        sample_rate: int = 16000,
        language: str | None = None,
        *,
        context: str | None = None,
        previous_text: str | None = None,
    ) -> TranscriptionResult:
        """Live caption chunk — VAD + context, tuned for tab/meeting audio."""
        settings = get_settings()
        min_samples = int(sample_rate * settings.live_min_audio_duration_ms / 1000)
        audio = np.frombuffer(pcm_chunk, dtype=np.int16).astype(np.float32) / 32768.0

        if len(audio) < min_samples:
            return TranscriptionResult(
                text="",
                language=language or "unknown",
                language_probability=0.0,
                is_final=False,
            )

        prompt = (context or previous_text or "").strip()[-400:] or None
        return await self.transcribe(
            audio,
            sample_rate,
            language,
            condition_on_previous_text=False,
            initial_prompt=prompt,
            beam_size=settings.whisper_live_beam_size,
            min_rms=settings.live_min_audio_rms,
            min_lang_prob=settings.live_min_stt_language_probability,
        )

    @staticmethod
    def detect_language_hint(text: str) -> str | None:
        """Quick heuristic for code-switching — full detect via Whisper."""
        if not text:
            return None
        # Unicode range heuristics
        for ch in text:
            if "\u4e00" <= ch <= "\u9fff":
                return "zh"
            if "\u0600" <= ch <= "\u06ff":
                return "ar"
            if "\u3040" <= ch <= "\u30ff":
                return "ja"
            if "\uac00" <= ch <= "\ud7af":
                return "ko"
        return None


class STTService:
    """
    Unified STT entry — routes to faster-whisper (default) or QVAC whisper.cpp.
    All live, dictation, and HTTP /transcribe paths use this facade.
    """

    def __init__(self) -> None:
        self._whisper = WhisperSTTService()

    async def active_provider(self) -> str:
        settings = get_settings()
        mode = settings.stt_provider
        if mode == "whisper":
            return "faster-whisper-local"
        qvac_ok = await qvac_client.is_available()
        if mode == "qvac":
            return "qvac-whisper" if qvac_ok else "faster-whisper-local"
        return "qvac-whisper" if qvac_ok else "faster-whisper-local"

    async def _pick_backend(self) -> str:
        settings = get_settings()
        mode = settings.stt_provider
        if mode == "whisper":
            return "whisper"
        qvac_ok = await qvac_client.is_available()
        if mode == "qvac":
            return "qvac" if qvac_ok else "whisper"
        return "qvac" if qvac_ok else "whisper"

    async def _transcribe_qvac(
        self,
        audio: np.ndarray,
        sample_rate: int,
        language: str | None,
        *,
        min_lang_prob: float | None = None,
    ) -> TranscriptionResult:
        pcm = (np.clip(audio, -1.0, 1.0) * 32767).astype(np.int16).tobytes()
        lang = language.split("-")[0] if language else None
        resp = await qvac_client.transcribe_pcm(pcm, language=lang, sample_rate=sample_rate)
        lang_prob = 0.85 if lang else 0.55
        text = resp.text
        if _is_likely_hallucination(text, lang_prob, min_lang_prob):
            text = ""
        return TranscriptionResult(
            text=text,
            language=lang or "unknown",
            language_probability=lang_prob,
            duration_ms=resp.latency_ms,
        )

    async def transcribe(
        self,
        audio: np.ndarray | bytes,
        sample_rate: int = 16000,
        language: str | None = None,
        *,
        condition_on_previous_text: bool = True,
        initial_prompt: str | None = None,
        min_rms: float | None = None,
        min_lang_prob: float | None = None,
        beam_size: int | None = None,
    ) -> TranscriptionResult:
        if isinstance(audio, bytes):
            arr = np.frombuffer(audio, dtype=np.int16).astype(np.float32) / 32768.0
        else:
            arr = audio

        backend = await self._pick_backend()
        if backend == "qvac":
            try:
                settings = get_settings()
                rms_floor = min_rms if min_rms is not None else settings.min_audio_rms
                if _audio_rms(arr) < rms_floor or len(arr) < sample_rate * 0.1:
                    return TranscriptionResult(
                        text="",
                        language=language or "unknown",
                        language_probability=0.0,
                        is_final=False,
                    )
                return await self._transcribe_qvac(
                    arr, sample_rate, language, min_lang_prob=min_lang_prob
                )
            except Exception:
                logger.warning("QVAC STT failed — falling back to faster-whisper", exc_info=True)

        return await self._whisper.transcribe(
            arr,
            sample_rate,
            language,
            condition_on_previous_text=condition_on_previous_text,
            initial_prompt=initial_prompt,
            min_rms=min_rms,
            min_lang_prob=min_lang_prob,
            beam_size=beam_size,
        )

    async def transcribe_stream_chunk(
        self, pcm_chunk: bytes, sample_rate: int = 16000, language: str | None = None
    ) -> TranscriptionResult:
        settings = get_settings()
        min_samples = int(sample_rate * settings.min_audio_duration_ms / 1000)
        audio = np.frombuffer(pcm_chunk, dtype=np.int16).astype(np.float32) / 32768.0
        if len(audio) < min_samples:
            return TranscriptionResult(
                text="",
                language=language or "unknown",
                language_probability=0.0,
                is_final=False,
            )
        return await self.transcribe(
            audio, sample_rate, language, condition_on_previous_text=False
        )

    async def transcribe_dictation_chunk(
        self,
        pcm_chunk: bytes,
        sample_rate: int = 16000,
        language: str | None = None,
        previous_text: str | None = None,
    ) -> TranscriptionResult:
        settings = get_settings()
        if await self._pick_backend() == "whisper":
            return await self._whisper.transcribe_dictation_chunk(
                pcm_chunk, sample_rate, language, previous_text=previous_text
            )

        min_samples = int(sample_rate * settings.min_audio_duration_ms / 1000)
        audio = np.frombuffer(pcm_chunk, dtype=np.int16).astype(np.float32) / 32768.0
        if len(audio) < min_samples:
            return TranscriptionResult(
                text="",
                language=language or "unknown",
                language_probability=0.0,
                is_final=False,
            )
        prompt = (previous_text or "").strip()[-400:] or None
        return await self.transcribe(
            audio,
            sample_rate,
            language,
            condition_on_previous_text=True,
            initial_prompt=prompt,
            min_rms=settings.dictation_min_audio_rms,
            min_lang_prob=settings.dictation_min_language_probability,
            beam_size=settings.whisper_dictation_beam_size,
        )

    async def transcribe_live_chunk(
        self,
        pcm_chunk: bytes,
        sample_rate: int = 16000,
        language: str | None = None,
        *,
        context: str | None = None,
        previous_text: str | None = None,
    ) -> TranscriptionResult:
        settings = get_settings()
        min_samples = int(sample_rate * settings.live_min_audio_duration_ms / 1000)
        audio = np.frombuffer(pcm_chunk, dtype=np.int16).astype(np.float32) / 32768.0
        if len(audio) < min_samples:
            return TranscriptionResult(
                text="",
                language=language or "unknown",
                language_probability=0.0,
                is_final=False,
            )
        prompt = (context or previous_text or "").strip()[-400:] or None
        return await self.transcribe(
            audio,
            sample_rate,
            language,
            condition_on_previous_text=False,
            initial_prompt=prompt,
            beam_size=settings.whisper_live_beam_size,
            min_rms=settings.live_min_audio_rms,
            min_lang_prob=settings.live_min_stt_language_probability,
        )

    @staticmethod
    def detect_language_hint(text: str) -> str | None:
        return WhisperSTTService.detect_language_hint(text)


# Module-level singleton
stt_service = STTService()
