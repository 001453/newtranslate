"""Background audio queue for live caption WebSocket — avoids blocking on STT."""

from __future__ import annotations

import asyncio
import logging
import time

from fastapi import WebSocket

from config import get_settings
from services.caption_quality import is_acceptable_caption, sanitize_caption_text
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


def _session_target_lang(detected: str) -> str:
    """Subtitles always in the viewer's native language when configured."""
    state = overlay_service.state
    if state.viewer_lang and state.viewer_lang != "auto":
        return state.viewer_lang.split("-")[0]
    return overlay_service.resolve_target_lang(detected).split("-")[0]


def _normalize_for_dedupe(text: str) -> str:
    import re
    t = " ".join(text.lower().split())
    t = re.sub(r"[-–—]+\s*$", "", t)
    t = re.sub(r"[.!?,;:'\"]+$", "", t).strip()
    return t


def _is_duplicate_transcript(text: str, last: str) -> bool:
    a = _normalize_for_dedupe(text)
    b = _normalize_for_dedupe(last)
    if not a:
        return True
    if not b:
        return False
    if a == b:
        return True
    if len(a) >= 4 and len(b) >= 4:
        if a in b and len(a) >= len(b) * 0.88:
            return True
        if b in a and len(b) >= len(a) * 0.88:
            return True
    a_words = a.split()
    b_words = b.split()
    if len(a_words) == 1 and len(b_words) == 1 and a_words[0] == b_words[0]:
        return True
    if len(a_words) == len(b_words) <= 2 and a_words == b_words:
        return True
    max_k = min(4, len(a_words), len(b_words))
    for k in range(max_k, 0, -1):
        if a_words[:k] == b_words[:k] or a_words[-k:] == b_words[-k:]:
            if len(a_words) <= k and len(b_words) <= k:
                return True
    return False


def _collapse_word_repeat(text: str) -> str:
    words = text.split()
    if len(words) >= 2 and len({w.lower() for w in words}) == 1:
        return words[0]
    return text


class LiveAudioProcessor:
    """Rolling PCM buffer + interim captions — lower latency than fixed 3s chunks."""

    def __init__(self, websocket: WebSocket, *, queue_max: int = 12):
        self.websocket = websocket
        settings = get_settings()
        self.queue: asyncio.Queue[bytes | None] = asyncio.Queue(maxsize=queue_max)
        self.worker_task: asyncio.Task | None = None
        self.session_context = ""
        self.last_transcript = ""
        self.last_display = ""
        self.speaker = "Speaker 1"
        self._running = False
        self.pcm_buffer = bytearray()
        self.interim_caption_id: str | None = None
        self._translate_lock = asyncio.Lock()
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
        self.last_display = ""
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
        clean_text = sanitize_caption_text(
            stt_result.text,
            language_hint=lang_hint,
            confidence=stt_result.language_probability,
        )
        if not clean_text:
            logger.debug("Dropped live caption (quality): %r", stt_result.text[:80])
            return
        clean_text = _collapse_word_repeat(clean_text)
        if _is_duplicate_transcript(clean_text, self.last_transcript):
            return

        detected = _session_detected_lang(stt_result.language)
        target = _session_target_lang(detected)
        needs_translation = target != detected

        if needs_translation:
            cap = await overlay_service.show_caption(
                original=clean_text,
                translated="…",
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
            async with self._translate_lock:
                trans = await translation_service.translate_text(
                    clean_text,
                    detected,
                    target,
                )
            translated_text = (trans.text or "").strip()
            trans_ms = trans.latency_ms
            if not translated_text or translated_text.lower() == clean_text.lower():
                logger.warning("Live translation empty or unchanged %s→%s: %r", detected, target, clean_text[:60])
                return
        else:
            translated_text = clean_text
            trans_ms = 0.0

        tr_hint = target
        translated_text = sanitize_caption_text(
            translated_text,
            language_hint=tr_hint,
            confidence=max(stt_result.language_probability, 0.7),
        )
        if needs_translation and not translated_text:
            logger.warning("Translated caption failed quality gate (%s→%s)", detected, target)
            return

        if _is_duplicate_transcript(translated_text, self.last_display):
            return

        self.last_transcript = clean_text
        self.last_display = translated_text
        self.session_context = (self.session_context + " " + clean_text)[-500:]
        total_ms = (time.perf_counter() - t0) * 1000

        await overlay_service.show_caption(
            original=clean_text,
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
                "original": clean_text,
                "translated": translated_text,
                "source_lang": detected,
                "target_lang": target,
                "stt_ms": stt_result.duration_ms,
                "translation_ms": trans_ms,
                "total_ms": total_ms,
            },
        })
