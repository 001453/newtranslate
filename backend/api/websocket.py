"""
GlobalBridge AI - Real-time WebSocket pipeline.
Audio chunk → queued STT → Translation → Overlay broadcast.
"""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from config import get_settings
from services.live_pipeline import LiveAudioProcessor
from services.meeting_export import build_meeting_export
from services.overlay import overlay_service
from services.summary import summary_service
from services.translation import translation_service

logger = logging.getLogger(__name__)
router = APIRouter()

_ws_clients: set[WebSocket] = set()


async def _overlay_broadcast(message: dict) -> None:
    dead: list[WebSocket] = []
    for ws in list(_ws_clients):
        try:
            await ws.send_json(message)
        except Exception:
            dead.append(ws)
    for ws in dead:
        _ws_clients.discard(ws)


overlay_service.subscribe(_overlay_broadcast)


@router.websocket("/ws/live")
async def live_caption_ws(websocket: WebSocket):
    await websocket.accept()
    _ws_clients.add(websocket)
    settings = get_settings()
    processor = LiveAudioProcessor(websocket, queue_max=settings.live_queue_max)
    processor.start()
    speaker = "Speaker 1"

    try:
        await websocket.send_json({
            "event": "connected",
            "payload": {"message": "GlobalBridge AI live caption ready"},
        })

        while True:
            raw = await websocket.receive()

            if raw.get("type") == "websocket.disconnect":
                break

            if "bytes" in raw and raw["bytes"]:
                await processor.submit(raw["bytes"])
                continue

            if "text" not in raw:
                continue

            msg = json.loads(raw["text"])
            action = msg.get("action")

            if action == "start_session":
                cfg = msg.get("config", {})
                viewer = cfg.get("viewer_lang")
                sid = await overlay_service.start_session(
                    source_lang=cfg.get("source_lang", "auto"),
                    target_lang=cfg.get("target_lang", "en"),
                    bidirectional=cfg.get("bidirectional", True),
                    lang_a=cfg.get("lang_a", "tr"),
                    lang_b=cfg.get("lang_b", "en"),
                    viewer_lang=viewer,
                )
                processor.reset_session()
                await websocket.send_json({"event": "session_started", "payload": {"session_id": sid}})

            elif action == "update_languages":
                cfg = msg.get("config", {})
                await overlay_service.update_languages(
                    source_lang=cfg.get("source_lang"),
                    target_lang=cfg.get("target_lang"),
                    bidirectional=cfg.get("bidirectional"),
                    lang_a=cfg.get("lang_a"),
                    lang_b=cfg.get("lang_b"),
                    viewer_lang=cfg.get("viewer_lang"),
                )
                await websocket.send_json({
                    "event": "languages_updated",
                    "payload": {
                        "lang_a": cfg.get("lang_a"),
                        "lang_b": cfg.get("lang_b"),
                        "viewer_lang": cfg.get("viewer_lang"),
                    },
                })

            elif action == "stop_session":
                await processor.stop()
                processor = LiveAudioProcessor(websocket, queue_max=settings.live_queue_max)

                transcript = await overlay_service.get_transcript()
                summary = await summary_service.generate_summary(
                    transcript,
                    language=msg.get("language", "en"),
                )
                export = build_meeting_export(
                    transcript,
                    overlay_service.state.session_id,
                    summary,
                )
                await overlay_service.stop_session()

                await websocket.send_json({"event": "transcript_export", "payload": export})
                await websocket.send_json({"event": "meeting_summary", "payload": summary})
                processor.start()

            elif action == "set_speaker":
                speaker = msg.get("speaker", speaker)
                processor.speaker = speaker

            elif action == "translate_text":
                text = msg.get("text", "")
                src = msg.get("source_lang", "auto")
                tgt = msg.get("target_lang", "en")
                result = await translation_service.translate_live(text, src, tgt, speaker)
                await overlay_service.show_caption(text, result.text, src, tgt, speaker)
                await websocket.send_json({
                    "event": "translation",
                    "payload": {"original": text, "translated": result.text},
                })

            elif action == "update_style":
                await overlay_service.update_style(**msg.get("style", {}))

            elif action == "ping":
                await websocket.send_json({"event": "pong", "payload": {}})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.exception("WebSocket error")
        try:
            await websocket.send_json({"event": "error", "payload": {"message": str(e)}})
        except Exception:
            pass
    finally:
        await processor.stop()
        _ws_clients.discard(websocket)
