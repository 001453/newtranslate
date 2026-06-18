"""
GlobalBridge AI - Real-time WebSocket pipeline.
Audio chunk → STT → Translation → Overlay broadcast.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from services.glossary import glossary_service
from services.overlay import overlay_service
from services.stt import stt_service
from services.summary import summary_service
from services.translation import translation_service

logger = logging.getLogger(__name__)
router = APIRouter()

# Active WebSocket connections for overlay sync
_ws_clients: set[WebSocket] = set()


async def _overlay_broadcast(message: dict[str, Any]) -> None:
    dead: list[WebSocket] = []
    for ws in list(_ws_clients):
        try:
            await ws.send_json(message)
        except Exception:
            dead.append(ws)
    for ws in dead:
        _ws_clients.discard(ws)


# Register overlay subscriber once
overlay_service.subscribe(_overlay_broadcast)


@router.websocket("/ws/live")
async def live_caption_ws(websocket: WebSocket):
    await websocket.accept()
    _ws_clients.add(websocket)
    session_context = ""
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
                # Binary PCM int16 @ 16kHz
                pcm = raw["bytes"]
                t0 = time.perf_counter()

                stt_result = await stt_service.transcribe_stream_chunk(pcm)
                if not stt_result.text:
                    continue

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
                        speaker=speaker,
                        context=session_context,
                    )
                    translated_text = trans.text
                    trans_ms = trans.latency_ms

                session_context = (session_context + " " + stt_result.text)[-500:]
                total_ms = (time.perf_counter() - t0) * 1000

                await overlay_service.show_caption(
                    original=stt_result.text,
                    translated=translated_text,
                    source_lang=detected,
                    target_lang=target,
                    speaker=speaker,
                    is_final=True,
                    confidence=stt_result.language_probability,
                )

                await websocket.send_json({
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
                await websocket.send_json({"event": "session_started", "payload": {"session_id": sid}})

            elif action == "stop_session":
                await overlay_service.stop_session()
                summary = await summary_service.generate_summary(
                    await overlay_service.get_transcript(),
                    language=msg.get("language", "en"),
                )
                await websocket.send_json({"event": "meeting_summary", "payload": summary})

            elif action == "set_speaker":
                speaker = msg.get("speaker", speaker)

            elif action == "translate_text":
                # Text-only path (no audio)
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
        _ws_clients.discard(websocket)
