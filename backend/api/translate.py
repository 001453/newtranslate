"""Glossary, translation, packs and meeting endpoints."""

from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from services.glossary import glossary_service
from services.overlay import overlay_service
from services.packs import pack_service
from services.privacy import privacy_service
from services.qvac_client import qvac_client
from services.summary import summary_service
from services.translation import TranslationUnavailableError, translation_service

router = APIRouter(tags=["glossary", "meetings", "translate", "packs"])


class GlossaryCreate(BaseModel):
    source: str
    target: str
    source_lang: str
    target_lang: str
    category: str = "general"


class TranslateRequest(BaseModel):
    text: str
    source_lang: str = "auto"
    target_lang: str = "en"


class PackDownloadRequest(BaseModel):
    from_lang: str = Field(default="tr", alias="from")
    to_lang: str = Field(default="en", alias="to")
    model_config = {"populate_by_name": True}


@router.get("/glossary")
async def list_glossary(source_lang: str | None = None, target_lang: str | None = None):
    terms = glossary_service.list_terms(source_lang, target_lang)
    return {"terms": [t.__dict__ for t in terms]}


@router.post("/glossary")
async def add_glossary_term(body: GlossaryCreate):
    term = glossary_service.add_term(**body.model_dump())
    return term.__dict__


@router.delete("/glossary/{term_id}")
async def delete_glossary_term(term_id: str):
    if not glossary_service.delete_term(term_id):
        raise HTTPException(404, "Term not found")
    return {"deleted": True}


@router.get("/packs/status")
async def packs_status(
    from_lang: str = Query(default="tr", alias="from"),
    to_lang: str = Query(default="en", alias="to"),
):
    online = await qvac_client.is_available()
    model_loaded = False
    if online:
        try:
            model_loaded = bool((await qvac_client.health()).get("llm_loaded"))
        except Exception:
            pass
    return pack_service.status(from_lang, to_lang, model_loaded=model_loaded, qvac_online=online)


@router.get("/packs/installed")
async def packs_installed():
    bundled = [{"from": "tr", "to": "en", "bundled": True}, {"from": "en", "to": "tr", "bundled": True}]
    return {"bundled": bundled, "installed": [{**p, "bundled": False} for p in pack_service.list_installed()]}


@router.post("/packs/download")
async def download_packs(body: PackDownloadRequest):
    if pack_service.status(body.from_lang, body.to_lang, model_loaded=False, qvac_online=True).get("bundled"):
        return {"ready": True, "bundled": True}

    async def stream():
        yield json.dumps({"type": "progress", "percent": 5}) + "\n"
        try:
            if not await qvac_client.is_available():
                yield json.dumps({"type": "error", "error": "QVAC offline"}) + "\n"
                return
            health = await qvac_client.health()
            if not health.get("llm_loaded"):
                yield json.dumps({"type": "progress", "percent": 20}) + "\n"
                await qvac_client.warm_model()
            pack_service.mark_installed(body.from_lang, body.to_lang)
            yield json.dumps({"type": "progress", "percent": 100}) + "\n"
            yield json.dumps({"type": "done", "ready": True}) + "\n"
        except Exception as e:
            yield json.dumps({"type": "error", "error": str(e)}) + "\n"

    return StreamingResponse(stream(), media_type="application/x-ndjson")


@router.post("/translate")
async def translate_text(body: TranslateRequest):
    glossary = glossary_service.to_dict(body.source_lang, body.target_lang)
    if glossary:
        translation_service.set_glossary(glossary)
    try:
        result = await translation_service.translate_text(body.text, body.source_lang, body.target_lang)
    except TranslationUnavailableError as e:
        raise HTTPException(503, str(e)) from e
    privacy = await privacy_service.get_status()
    local = (
        (result.model or "").startswith(("qvac", "bergamot"))
        or privacy.local_processing_only
    )
    return {
        "original": body.text,
        "translated": result.text,
        "latency_ms": result.latency_ms,
        "model": result.model,
        "local": local,
        "free": True,
        "data_egress": not local and privacy.cloud_allowed,
    }


@router.get("/meetings/transcript")
async def get_transcript():
    return {"transcript": await overlay_service.get_transcript()}


@router.post("/meetings/summary")
async def generate_meeting_summary(language: str = "en"):
    transcript = await overlay_service.get_transcript()
    return await summary_service.generate_summary(transcript, language)


@router.get("/privacy/status")
async def privacy_status():
    status = await privacy_service.get_status()
    return {
        "mode": status.mode,
        "local_processing_only": status.local_processing_only,
        "translation_provider": status.translation_provider,
        "stt_provider": status.stt_provider,
        "qvac_available": status.qvac_available,
        "cloud_allowed": status.cloud_allowed,
        "data_egress_points": status.data_egress_points,
        "guarantees": status.guarantees,
    }
