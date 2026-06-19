"""Shared upload validation — extension whitelist, size limits."""

from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile

from config import UPLOAD_DIR, get_settings

ALLOWED_DOC_SUFFIXES = frozenset({".pdf", ".docx"})
CHUNK_SIZE = 1024 * 1024


async def save_document_upload(file: UploadFile) -> Path:
    """Validate and save a single PDF/DOCX upload with size cap."""
    settings = get_settings()
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_DOC_SUFFIXES:
        raise HTTPException(
            400,
            f"Unsupported format '{suffix or '(none)'}'. Allowed: {sorted(ALLOWED_DOC_SUFFIXES)}",
        )

    save_path = UPLOAD_DIR / f"{uuid.uuid4()}{suffix}"
    total = 0
    try:
        with open(save_path, "wb") as out:
            while True:
                chunk = await file.read(CHUNK_SIZE)
                if not chunk:
                    break
                total += len(chunk)
                if total > settings.max_upload_bytes:
                    raise HTTPException(
                        413,
                        f"File exceeds maximum size ({settings.max_upload_bytes // (1024 * 1024)} MB)",
                    )
                out.write(chunk)
    except HTTPException:
        save_path.unlink(missing_ok=True)
        raise
    except OSError as err:
        save_path.unlink(missing_ok=True)
        raise HTTPException(500, "Failed to save upload") from err

    if total == 0:
        save_path.unlink(missing_ok=True)
        raise HTTPException(400, "Empty file")

    return save_path
