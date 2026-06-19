"""PDF translation REST API."""

from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from api.upload_utils import save_document_upload
from config import get_settings
from services.glossary import glossary_service
from services.pdf_translate import JobStatus, pdf_service
from services.translation import translation_service

router = APIRouter(prefix="/pdf", tags=["pdf"])


@router.post("/upload")
async def upload_and_translate(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    source_lang: str = Form("auto"),
    target_lang: str = Form("en"),
    doc_type: str = Form("general"),
):
    save_path = await save_document_upload(file)

    glossary = glossary_service.to_dict(
        source_lang if source_lang != "auto" else "en",
        target_lang,
    )
    if glossary:
        translation_service.set_glossary(glossary)

    job = await pdf_service.create_job(save_path, source_lang, target_lang, doc_type)
    background_tasks.add_task(pdf_service.process_job, job)

    return {
        "job_id": job.id,
        "filename": job.filename,
        "status": job.status.value,
    }


@router.post("/batch")
async def batch_upload(
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    source_lang: str = Form("auto"),
    target_lang: str = Form("en"),
):
    settings = get_settings()
    if len(files) > settings.max_batch_uploads:
        raise HTTPException(
            400,
            f"Too many files (max {settings.max_batch_uploads} per batch)",
        )
    if not files:
        raise HTTPException(400, "No files provided")

    paths = []
    for file in files:
        paths.append(await save_document_upload(file))

    jobs = []
    for path in paths:
        job = await pdf_service.create_job(path, source_lang, target_lang)
        jobs.append(job)
        background_tasks.add_task(pdf_service.process_job, job)

    return {"jobs": [{"job_id": j.id, "filename": j.filename} for j in jobs]}


@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    job = pdf_service.get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return {
        "job_id": job.id,
        "filename": job.filename,
        "status": job.status.value,
        "progress": job.progress,
        "error": job.error,
        "block_count": len(job.translated_blocks),
    }


@router.get("/jobs/{job_id}/download")
async def download_translated(job_id: str):
    job = pdf_service.get_job(job_id)
    if not job or job.status != JobStatus.COMPLETED or not job.output_path:
        raise HTTPException(404, "Translation not ready")
    return FileResponse(job.output_path, filename=f"translated_{job.filename}")


@router.get("/jobs/{job_id}/bilingual")
async def download_bilingual(job_id: str):
    job = pdf_service.get_job(job_id)
    if not job or not job.bilingual_path:
        raise HTTPException(404, "Bilingual preview not ready")
    return FileResponse(job.bilingual_path, media_type="text/html")


@router.get("/jobs/{job_id}/preview")
async def bilingual_preview_data(job_id: str):
    job = pdf_service.get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return {
        "filename": job.filename,
        "source_lang": job.source_lang,
        "target_lang": job.target_lang,
        "segments": job.translated_blocks,
        "status": job.status.value,
    }
