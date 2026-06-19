"""Background audio queue for live caption WebSocket — avoids blocking on STT."""

from __future__ import annotations

import asyncio
import logging
import time

from fastapi import WebSocket

from services.glossary import glossary_service
from services.overlay import overlay_service
from services.stt import stt_service
from services.translation import translation_service

logger = logging.getLogger(__name__)


def _session_language_hint() -> str | None:
    state = overlay_service.state
    if not state.active:
        return None
    for code in (state.lang_a, state.lang_b, state.source_lang):
        if code and code != "auto":
            return code.split("-")[0]
    return None


def _normalize_for_dedupe(text: str) -> str:
    return " ".join(text.lower().split())


def _is_duplicate_transcript(text: str, last: str) -> bool:
    a = _normalize_for_dedupe(text)
    b = _normalize_for_dedupe(last)
    if not a or not b:
        return False
    if a == b:
        return True
    if len(a) > 12 and (a in b or b in a):
        return True
    return False


class LiveAudioProcessor:
    """Per-connection queue: receive PCM fast, process STT+translate in worker."""

    def __init__(self, websocket: WebSocket, *, queue_max: int = 5):
        self.websocket = websocket
        self.queue: asyncio.Queue[bytes | None] = asyncio.Queue(maxsize=queue_max)
        self.worker_task: asyncio.Task | None = None
        self.session_context = ""
        self.last_transcript = ""
        self.speaker = "Speaker 1"
        self._running = False

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
            pcm = await self.queue.get()
            if pcm is None:
                break
            try:
                await self._process_chunk(pcm)
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
        if _is_duplicate_transcript(stt_result.text, self.last_transcript):
            return

        self.last_transcript = stt_result.text
        detected = stt_result.language
        target = overlay_service.resolve_target_lang(detected)

        glossary = glossary_service.to_dict(
            detected.split("-")[0],
            target.split("-")[0],
        )
        if glossary:
            translation_service.set_glossary(glossary)

        if target.split("-")[0] == detected.split("-")[0]:
            translated_text = stt_result.text
            trans_ms = 0.0
        else:
            trans = await translation_service.translate_live(
                stt_result.text,
                detected,
                target,
                speaker=self.speaker,
                context=self.session_context,
            )
            translated_text = trans.text
            trans_ms = trans.latency_ms

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
        )

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
