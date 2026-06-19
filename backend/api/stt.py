"""Speech-to-text HTTP endpoint for dictation (PCM int16 @ 16 kHz)."""

from __future__ import annotations

from fastapi import APIRouter, Query, Request

from services.stt import stt_service

router = APIRouter(tags=["stt"])


@router.post("/transcribe")
async def transcribe_pcm(
    request: Request,
    lang: str | None = Query(None, description="Language hint (e.g. tr, en)"),
    mode: str = Query("dictation", description="dictation | live"),
    prev: str | None = Query(None, description="Previous transcript tail for context"),
):
    pcm = await request.body()
    if len(pcm) < 320:
        return {"text": "", "language": lang or "unknown", "confidence": 0.0}

    lang_hint = None
    if lang and lang != "auto":
        lang_hint = lang.split("-")[0].lower()

    if mode == "live":
        result = await stt_service.transcribe_stream_chunk(pcm, language=lang_hint)
    else:
        result = await stt_service.transcribe_dictation_chunk(
            pcm,
            language=lang_hint,
            previous_text=prev,
        )

    return {
        "text": result.text,
        "language": result.language,
        "confidence": result.language_probability,
    }
