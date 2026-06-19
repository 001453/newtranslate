"""
GlobalBridge AI - Subtitle overlay state manager.
Broadcasts caption events to WebSocket clients and Electron overlay.
"""

from __future__ import annotations

import asyncio
import logging
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Awaitable

from config import get_settings

logger = logging.getLogger(__name__)


class CaptionPosition(str, Enum):
    BOTTOM = "bottom"
    TOP = "top"
    FLOATING = "floating"


@dataclass
class CaptionStyle:
    font_size_px: int = 32
    font_family: str = "'Segoe UI', 'Noto Sans', system-ui, sans-serif"
    text_color: str = "#FFFFFF"
    background_color: str = "rgba(0, 0, 0, 0.72)"
    padding_px: int = 16
    border_radius_px: int = 8
    max_width_percent: int = 90
    position: CaptionPosition = CaptionPosition.BOTTOM
    bottom_offset_px: int = 80
    text_shadow: str = "0 2px 8px rgba(0,0,0,0.9)"
    rtl: bool = False


@dataclass
class CaptionLine:
    id: str
    original: str
    translated: str
    source_lang: str
    target_lang: str
    speaker: str | None
    timestamp: float
    display_until: float
    is_final: bool = True
    confidence: float = 1.0


@dataclass
class OverlayState:
    active: bool = False
    source_lang: str = "auto"
    target_lang: str = "en"
    bidirectional: bool = True
    lang_a: str = "tr"
    lang_b: str = "en"
    viewer_lang: str | None = None  # Kişisel mod: altyazılar bu dilde
    style: CaptionStyle = field(default_factory=CaptionStyle)
    current_caption: CaptionLine | None = None
    history: list[CaptionLine] = field(default_factory=list)
    session_id: str = field(default_factory=lambda: str(uuid.uuid4()))


Subscriber = Callable[[dict[str, Any]], Awaitable[None]]


class OverlayService:
    """
    Manages on-screen subtitle overlay state.
    Pushes events: caption_show, caption_hide, caption_update, style_change.
    """

    def __init__(self):
        self.settings = get_settings()
        self.state = OverlayState()
        self._subscribers: list[Subscriber] = []
        self._hide_tasks: dict[str, asyncio.Task] = {}
        self._lock = asyncio.Lock()

    def subscribe(self, callback: Subscriber) -> None:
        self._subscribers.append(callback)

    def unsubscribe(self, callback: Subscriber) -> None:
        if callback in self._subscribers:
            self._subscribers.remove(callback)

    async def _broadcast(self, event: str, payload: dict[str, Any]) -> None:
        message = {"event": event, "payload": payload, "session_id": self.state.session_id}
        for sub in self._subscribers:
            try:
                await sub(message)
            except Exception as e:
                logger.error("Overlay subscriber error: %s", e)

    def _caption_to_dict(self, cap: CaptionLine) -> dict[str, Any]:
        return {
            "id": cap.id,
            "original": cap.original,
            "translated": cap.translated,
            "source_lang": cap.source_lang,
            "target_lang": cap.target_lang,
            "speaker": cap.speaker,
            "timestamp": cap.timestamp,
            "display_until": cap.display_until,
            "is_final": cap.is_final,
            "confidence": cap.confidence,
            "style": self._style_to_dict(),
        }

    def _style_to_dict(self) -> dict[str, Any]:
        s = self.state.style
        return {
            "fontSizePx": s.font_size_px,
            "fontFamily": s.font_family,
            "textColor": s.text_color,
            "backgroundColor": s.background_color,
            "paddingPx": s.padding_px,
            "borderRadiusPx": s.border_radius_px,
            "maxWidthPercent": s.max_width_percent,
            "position": s.position.value,
            "bottomOffsetPx": s.bottom_offset_px,
            "textShadow": s.text_shadow,
            "rtl": s.rtl or self.state.target_lang in ("ar", "he", "fa", "ur"),
        }

    async def start_session(
        self,
        source_lang: str = "auto",
        target_lang: str = "en",
        bidirectional: bool = True,
        lang_a: str = "tr",
        lang_b: str = "en",
        viewer_lang: str | None = None,
    ) -> str:
        async with self._lock:
            self.state = OverlayState(
                active=True,
                source_lang=source_lang,
                target_lang=target_lang,
                bidirectional=bidirectional,
                lang_a=lang_a,
                lang_b=lang_b,
                viewer_lang=viewer_lang,
            )
        await self._broadcast("session_started", {
            "session_id": self.state.session_id,
            "source_lang": source_lang,
            "target_lang": target_lang,
            "bidirectional": bidirectional,
            "viewer_lang": viewer_lang,
        })
        return self.state.session_id

    async def update_languages(
        self,
        *,
        source_lang: str | None = None,
        target_lang: str | None = None,
        bidirectional: bool | None = None,
        lang_a: str | None = None,
        lang_b: str | None = None,
        viewer_lang: str | None = None,
    ) -> None:
        async with self._lock:
            if source_lang is not None:
                self.state.source_lang = source_lang
            if target_lang is not None:
                self.state.target_lang = target_lang
            if bidirectional is not None:
                self.state.bidirectional = bidirectional
            if lang_a is not None:
                self.state.lang_a = lang_a
            if lang_b is not None:
                self.state.lang_b = lang_b
            if viewer_lang is not None:
                self.state.viewer_lang = viewer_lang
            payload = {
                "lang_a": self.state.lang_a,
                "lang_b": self.state.lang_b,
                "viewer_lang": self.state.viewer_lang,
                "target_lang": self.state.target_lang,
            }
        await self._broadcast("languages_updated", payload)

    async def stop_session(self) -> None:
        async with self._lock:
            self.state.active = False
            for task in self._hide_tasks.values():
                task.cancel()
            self._hide_tasks.clear()
        await self._broadcast("session_stopped", {})
        await self.hide_caption()

    async def update_style(self, **kwargs: Any) -> None:
        style = self.state.style
        for key, val in kwargs.items():
            if hasattr(style, key):
                setattr(style, key, val)
        await self._broadcast("style_change", self._style_to_dict())

    async def show_caption(
        self,
        original: str,
        translated: str,
        source_lang: str,
        target_lang: str,
        speaker: str | None = None,
        is_final: bool = True,
        confidence: float = 1.0,
        display_seconds: float | None = None,
    ) -> CaptionLine:
        now = time.time()
        display_sec = display_seconds or self.settings.subtitle_display_seconds
        cap_id = str(uuid.uuid4())

        caption = CaptionLine(
            id=cap_id,
            original=original,
            translated=translated,
            source_lang=source_lang,
            target_lang=target_lang,
            speaker=speaker,
            timestamp=now,
            display_until=now + display_sec,
            is_final=is_final,
            confidence=confidence,
        )

        async with self._lock:
            self.state.current_caption = caption
            if is_final:
                self.state.history.append(caption)
                if len(self.state.history) > 500:
                    self.state.history = self.state.history[-500:]

        event = "caption_update" if not is_final else "caption_show"
        await self._broadcast(event, self._caption_to_dict(caption))

        # Schedule auto-hide
        if cap_id in self._hide_tasks:
            self._hide_tasks[cap_id].cancel()

        async def _hide():
            await asyncio.sleep(display_sec)
            async with self._lock:
                if self.state.current_caption and self.state.current_caption.id == cap_id:
                    self.state.current_caption = None
            await self._broadcast("caption_hide", {"id": cap_id})

        self._hide_tasks[cap_id] = asyncio.create_task(_hide())
        return caption

    async def hide_caption(self) -> None:
        async with self._lock:
            self.state.current_caption = None
        await self._broadcast("caption_hide", {})

    async def get_transcript(self) -> list[dict[str, Any]]:
        return [
            {
                "original": c.original,
                "translated": c.translated,
                "speaker": c.speaker,
                "timestamp": c.timestamp,
                "source_lang": c.source_lang,
                "target_lang": c.target_lang,
            }
            for c in self.state.history
        ]

    def resolve_target_lang(self, detected_lang: str) -> str:
        """Kişisel mod: her zaman izleyicinin ana diline çevir."""
        det = detected_lang.split("-")[0]

        if self.state.viewer_lang:
            mine = self.state.viewer_lang.split("-")[0]
            if det == mine:
                return detected_lang
            return self.state.viewer_lang

        if not self.state.bidirectional:
            return self.state.target_lang

        da = self.state.lang_a.split("-")[0]
        db = self.state.lang_b.split("-")[0]

        if det == da:
            return self.state.lang_b
        if det == db:
            return self.state.lang_a
        return self.state.target_lang


overlay_service = OverlayService()
