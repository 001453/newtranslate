"""Background audio queue for live caption WebSocket — avoids blocking on STT."""

from __future__ import annotations

import asyncio
import logging
import time

from fastapi import WebSocket

from config import get_settings
from services.caption_quality import is_acceptable_caption
from services.glossary import glossary_service
from services.overlay import overlay_service
from services.stt import stt_service
from services.translation import translation_service

logger = logging.getLogger(__name__)

SAMPLE_RATE = 16000
BYTES_PER_MS = SAMPLE_RATE * 2 // 1000


def _session_language_hint() -> str | None:
    """Whisper language hint — tab/meeting audio is usually the *other* language, not viewer."""
    state = overlay_service.state
    if not state.active:
        return None
    if state.source_lang and state.source_lang != "auto":
        return state.source_lang.split("-")[0]
    if state.bidirectional:
        for code in (state.lang_b, state.lang_a):
            if code and code != "auto":
                return code.split("-")[0]
        return None
    if state.target_lang and state.target_lang != "auto":
        return state.target_lang.split("-")[0]
    return None


def _session_detected_lang(stt_language: str) -> str:
    """Trust explicit session source (tab/mic) over Whisper auto-detect."""
    state = overlay_service.state
    if state.source_lang and state.source_lang != "auto":
        return state.source_lang.split("-")[0]
    return (stt_language or "unknown").split("-")[0]


def _normalize_for_dedupe(text: str) -> str:
    return " ".join(text.lower().split())


def _is_duplicate_transcript(text: str, last: str) -> bool:
    a = _normalize_for_dedupe(text)
    b = _normalize_for_dedupe(last)
    if not a or not b:
        return False
    if a == b:
        return True
    if len(b) > 8 and a in b and len(a) <= len(b):
        return True
    return False


class LiveAudioProcessor:
    """Rolling PCM buffer + interim captions — lower latency than fixed 3s chunks."""

    def __init__(self, websocket: WebSocket, *, queue_max: int = 12):
        self.websocket = websocket
        settings = get_settings()
        self.queue: asyncio.Queue[bytes | None] = asyncio.Queue(maxsize=queue_max)
        self.worker_task: asyncio.Task | None = None
        self.session_context = ""
        self.last_transcript = ""
        self.speaker = "Speaker 1"
        self._running = False
        self.pcm_buffer = bytearray()
        self.interim_caption_id: str | None = None
        self.min_window = BYTES_PER_MS * settings.live_min_audio_duration_ms
        self.max_window = BYTES_PER_MS * settings.live_window_ms
        self.max_buffer = BYTES_PER_MS * settings.live_buffer_ms
        self.poll_s = settings.live_process_interval_ms / 1000.0
        self.overlap_keep = BYTES_PER_MS * 350

    def start(self) -> None:
        if self._running:
            return
        self._running = True
        self.worker_task = asyncio.create_task(self._worker())

    async def stop(self) -> None:
        self._running = False
        try:
            self.queue.put_nowait(None)
        except asyncio.QueueFull:
            pass
        if self.worker_task:
            try:
                await asyncio.wait_for(self.worker_task, timeout=30.0)
            except (asyncio.TimeoutError, asyncio.CancelledError):
                self.worker_task.cancel()
            self.worker_task = None

    def reset_session(self) -> None:
        self.session_context = ""
        self.last_transcript = ""
        self.pcm_buffer.clear()
        self.interim_caption_id = None

    async def submit(self, pcm: bytes) -> None:
        if not self._running:
            return
        if self.queue.full():
            try:
                self.queue.get_nowait()
            except asyncio.QueueEmpty:
                pass
        try:
            self.queue.put_nowait(pcm)
        except asyncio.QueueFull:
            pass

    async def _worker(self) -> None:
        while self._running:
            await asyncio.sleep(self.poll_s)
            while True:
                try:
                    pcm = self.queue.get_nowait()
                except asyncio.QueueEmpty:
                    break
                if pcm is None:
                    return
                self.pcm_buffer.extend(pcm)
                if len(self.pcm_buffer) > self.max_buffer:
                    del self.pcm_buffer[: len(self.pcm_buffer) - self.max_buffer]

            if len(self.pcm_buffer) < self.min_window:
                continue

            window = bytes(self.pcm_buffer[-self.max_window :])
            if len(self.pcm_buffer) > self.overlap_keep:
                self.pcm_buffer = self.pcm_buffer[-self.overlap_keep :]
            else:
                self.pcm_buffer.clear()

            try:
                await self._process_chunk(window)
            except Exception:
                logger.exception("Live pipeline chunk failed")

    async def _process_chunk(self, pcm: bytes) -> None:
        t0 = time.perf_counter()

        stt_result = await stt_service.transcribe_live_chunk(
            pcm,
            language=_session_language_hint(),
            context=self.session_context,
            previous_text=self.last_transcript,
        )
        if not stt_result.text:
            return
        lang_hint = _session_language_hint()
        if not is_acceptable_caption(
            stt_result.text,
            language_hint=lang_hint,
            confidence=stt_result.language_probability,
        ):
            logger.debug("Dropped live caption (quality): %r", stt_result.text[:80])
            return
        if _is_duplicate_transcript(stt_result.text, self.last_transcript):
            return

        detected = _session_detected_lang(stt_result.language)
        target = overlay_service.resolve_target_lang(detected)
        needs_translation = target.split("-")[0] != detected.split("-")[0]

        if needs_translation:
            cap = await overlay_service.show_caption(
                original=stt_result.text,
                translated=stt_result.text,
                source_lang=detected,
                target_lang=target,
                speaker=self.speaker,
                is_final=False,
                confidence=stt_result.language_probability,
                caption_id=self.interim_caption_id,
            )
            self.interim_caption_id = cap.id

        glossary = glossary_service.to_dict(
            detected.split("-")[0],
            target.split("-")[0],
        )
        if glossary:
            translation_service.set_glossary(glossary)

        if needs_translation:
            trans = await translation_service.translate_live(
                stt_result.text,
                detected,
                target,
                speaker=self.speaker,
                context=self.session_context,
            )
            translated_text = trans.text
            trans_ms = trans.latency_ms
        else:
            translated_text = stt_result.text
            trans_ms = 0.0

        self.last_transcript = stt_result.text
        self.session_context = (self.session_context + " " + stt_result.text)[-500:]
        total_ms = (time.perf_counter() - t0) * 1000

        await overlay_service.show_caption(
            original=stt_result.text,
            translated=translated_text,
            source_lang=detected,
            target_lang=target,
            speaker=self.speaker,
            is_final=True,
            confidence=stt_result.language_probability,
            caption_id=self.interim_caption_id if needs_translation else None,
        )
        self.interim_caption_id = None

        await self.websocket.send_json({
            "event": "pipeline_result",
            "payload": {
                "original": stt_result.text,
                "translated": translated_text,
                "source_lang": detected,
                "target_lang": target,
                "stt_ms": stt_result.duration_ms,
                "translation_ms": trans_ms,
                "total_ms": total_ms,
            },
        })
