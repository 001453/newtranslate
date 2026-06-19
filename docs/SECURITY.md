# Security model

GlobalBridge AI is designed as a **single-user, sovereign local application**. Audio and transcripts stay on the machine; the API defaults to **localhost only**.

## Defaults (safe for daily use)

| Setting | Default | Effect |
|---------|---------|--------|
| `API_BIND_HOST` | `127.0.0.1` | Backend not reachable from other devices on the network |
| `API_KEY` | *(empty)* | No auth header required on localhost |
| `LOCAL_PROCESSING_ONLY` | `true` in `.env.example` | No cloud egress |

## PDF uploads

- **Allowed types:** `.pdf`, `.docx` only (single + batch)
- **Max file size:** 50 MB (`MAX_UPLOAD_BYTES`)
- **Max batch:** 10 files (`MAX_BATCH_UPLOADS`)
- Files stored under `backend/data/uploads/` with random UUID names

## Exposing the API on LAN or VPS

If you set `API_BIND_HOST=0.0.0.0`:

1. Set a strong **`API_KEY`** in `.env`
2. Send header **`X-API-Key: <your-key>`** on all `/api/v1/*` requests
3. WebSocket: append **`?api_key=<your-key>`** to the WS URL
4. Use a reverse proxy (nginx/Caddy) with TLS in production

Without `API_KEY`, anyone on your network can upload files, delete glossary terms, and read live transcripts.

## Known limitations

- **Single session state:** `overlay_service` is global — not suitable for multi-tenant server deployment without refactoring.
- **No user accounts:** By design for local sovereign use.
- **Electron overlay:** `contextIsolation: true`, `nodeIntegration: false` ✓

## Dependency updates

After pulling, refresh the Python venv:

```bash
cd backend
.venv/Scripts/pip install -U -r requirements.txt   # Windows
pip-audit -r requirements.txt
```

Frontend:

```bash
cd frontend && npm audit fix
```

## Reporting issues

Open a GitHub issue — do **not** commit `.env`, `frontend/.env.local`, or API keys.
