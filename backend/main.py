"""
GlobalBridge AI — FastAPI entry point.
Real-time STT + Translation + Overlay + PDF.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.pdf import router as pdf_router
from api.security import verify_api_key_http
from api.stt import router as stt_router
from api.translate import router as translate_router
from api.websocket import router as ws_router
from config import get_settings
from database.session import init_db
from services.privacy import privacy_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="100+ language real-time translation, captions & PDF bridge",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def api_key_middleware(request: Request, call_next):
    try:
        verify_api_key_http(request)
    except HTTPException as exc:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    return await call_next(request)


app.include_router(ws_router, prefix=settings.api_prefix)
app.include_router(stt_router, prefix=settings.api_prefix)
app.include_router(pdf_router, prefix=settings.api_prefix)
app.include_router(translate_router, prefix=settings.api_prefix)


@app.get("/health")
async def health():
    privacy = await privacy_service.get_status()
    return {
        "status": "ok",
        "service": settings.app_name,
        "whisper_model": settings.whisper_model,
        "translation_provider": privacy.translation_provider,
        "privacy_mode": privacy.mode,
        "qvac_available": privacy.qvac_available,
        "data_egress": privacy.data_egress_points,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.api_bind_host,
        port=8000,
        reload=settings.debug,
    )
