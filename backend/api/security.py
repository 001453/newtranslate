"""Optional API key auth + localhost bind helpers for sovereign local deployment."""

from __future__ import annotations

from fastapi import HTTPException, Request, WebSocket

from config import get_settings

PUBLIC_PATHS = frozenset({"/health", "/docs", "/openapi.json", "/redoc"})


def _extract_key(request: Request) -> str | None:
    header = request.headers.get("X-API-Key")
    if header:
        return header.strip()
    auth = request.headers.get("Authorization", "")
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return None


def verify_api_key_http(request: Request) -> None:
    """Raise 401 when API_KEY is configured and request lacks a valid key."""
    settings = get_settings()
    if not settings.api_key:
        return
    if request.url.path in PUBLIC_PATHS:
        return
    if not request.url.path.startswith(settings.api_prefix):
        return
    if _extract_key(request) != settings.api_key:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


def verify_api_key_ws(websocket: WebSocket) -> None:
    """WebSocket auth via ?api_key= query param when API_KEY is set."""
    settings = get_settings()
    if not settings.api_key:
        return
    provided = websocket.query_params.get("api_key", "").strip()
    if provided != settings.api_key:
        raise HTTPException(status_code=403, detail="Invalid or missing API key")
