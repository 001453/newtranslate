# GlobalBridge AI

**Sovereign real-time translation bridge** — 100+ languages, live captions, Whisper dictation, and document translation.  
Built on **[QVAC](https://qvac.tether.io/)** (Tether local AI) + **[Keet](https://keet.io/)** (P2P meetings). **Audio and transcripts never leave the device** in Sovereign Mode.

[![CI](https://github.com/001453/newtranslate/actions/workflows/ci.yml/badge.svg)](https://github.com/001453/newtranslate/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/001453/newtranslate?label=release)](https://github.com/001453/newtranslate/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub issues](https://img.shields.io/github/issues/001453/newtranslate)](https://github.com/001453/newtranslate/issues)
[![Last commit](https://img.shields.io/github/last-commit/001453/newtranslate)](https://github.com/001453/newtranslate/commits/main)
[![GitHub stars](https://img.shields.io/github/stars/001453/newtranslate?style=social)](https://github.com/001453/newtranslate/stargazers)

---

## Demo

<!-- DEMO_VIDEO_START -->
▶ **[Watch demo on YouTube](https://youtu.be/1cxwP5S7-1A)** — sovereign live captions (Whisper + QVAC + tab audio, ~5 min)
<!-- DEMO_VIDEO_END -->

[Sovereign egress checklist](docs/SOVEREIGN_EGRESS_CHECKLIST.md) · [Quick Start](#quick-start) · [Project site](https://001453.github.io/newtranslate/)

---

## Why GlobalBridge AI

Cross-language communication today forces a trade-off: either send voice and text to cloud APIs, or give up live translation in meetings and video calls. GlobalBridge AI removes that trade-off by running **speech recognition and translation entirely on the user's machine**, with optional integration into **Keet** (end-to-end encrypted P2P calls) and **browser tab capture** for YouTube, Zoom, Google Meet, and Microsoft Teams.

| Use case | Route | Stack |
|----------|-------|-------|
| Text + voice dictation | `/` | Local Whisper → QVAC NMT |
| Two-way conversation | `/conversation` | Whisper dictation + QVAC |
| **Keet P2P meetings** | `/meeting` | Tab audio → Whisper → QVAC → personal subtitles |
| **Live captions** (YouTube / Zoom / Meet) | `/live` | Tab audio capture → same pipeline |
| Documents & PDF | `/document`, `/pdf` | QVAC + local processing |
| Glossary & history | `/glossary`, `/history` | Local SQLite |

---

## Tether QVAC Integration

[QVAC](https://qvac.tether.io/) provides **decentralized, on-device AI** via `@qvac/sdk`. GlobalBridge runs a local QVAC bridge (`qvac-service`, port **8765**) for:

| Component | Sovereign Mode (default) | Optional cloud |
|-----------|--------------------------|----------------|
| **STT** | Faster-Whisper (local, GPU/CPU) | Always local |
| **Translation** | QVAC Bergamot NMT + local LLM | Together AI fallback |
| **Meeting summary** | QVAC local LLM | Together AI |
| **PDF translation** | QVAC + PyMuPDF | Together AI |

Set in `.env`:

```env
LOCAL_PROCESSING_ONLY=true
TRANSLATION_PROVIDER=qvac
ALLOW_CLOUD_FALLBACK=false
QVAC_BRIDGE_URL=http://127.0.0.1:8765
```

**Privacy guarantee (Sovereign Mode):** No audio, transcript, or document content is sent to third-party APIs.

### Pipeline

```
Microphone / Tab audio (Chrome)
    → WebSocket /api/v1/ws/live  (localhost only)
    → Faster-Whisper STT
    → QVAC translation bridge (localhost:8765)
    → Live subtitles + auto-exported transcript (.txt, .json, .srt)
```

HTTP dictation endpoint: `POST /api/v1/transcribe` (PCM int16 @ 16 kHz → Whisper).

---

## Keet Integration

[Keet](https://keet.io/) (Holepunch) enables **serverless, E2E-encrypted P2P voice/video**. GlobalBridge adds a **local subtitle layer** on top:

1. User pastes a Keet room invite (`keet://…`) and opens the call in Keet.
2. In GlobalBridge `/meeting`, user selects **native language** and **counterparty language**.
3. User starts the bridge and shares **Keet tab audio** in Chrome (with “Share tab audio” enabled).
4. Each participant sees subtitles in **their own language** (`viewer_lang` on the backend).
5. When the session ends, transcript files download automatically.

**Chrome extension:** Load unpacked from [`extension/`](extension/) — live caption overlay on any tab without opening the web UI. See [extension/README.md](extension/README.md).

**Desktop app (Windows):** Tray launcher — setup wizard, start/stop services, open browser. Build installer with `npm run desktop:build`. See [desktop/README.md](desktop/README.md) and [docs/DISTRIBUTION.md](docs/DISTRIBUTION.md) for GitHub Releases + Chrome Web Store.

> Keet handles the call; GlobalBridge handles **local STT + QVAC translation**. No Keet SDK is required — integration is via standard browser tab audio capture, keeping the stack simple and fully local.

**Builder guide:** [docs/KEET_PEARS_INTEGRATION.md](docs/KEET_PEARS_INTEGRATION.md) — deep links, WebSocket config, Pear SDK roadmap.

**Participant setup link:** `/meeting?invite=keet%3A%2F%2F…&from=tr&to=en` (or use “Copy setup link” in the UI).

---

## Architecture

```
newtranslate/
├── backend/                 # FastAPI — STT, translation routing, WebSocket live pipeline
│   ├── api/
│   │   ├── websocket.py     # Queued live caption pipeline
│   │   ├── stt.py           # Whisper dictation HTTP API
│   │   ├── translate.py     # QVAC / cloud translation, meetings API
│   │   └── pdf.py
│   └── services/
│       ├── stt.py           # faster-whisper
│       ├── translation.py   # QVAC client routing
│       ├── live_pipeline.py # Async audio queue (non-blocking WS)
│       ├── meeting_export.py# TXT / JSON / SRT export
│       ├── overlay.py       # viewer_lang, caption state
│       └── qvac_client.py
├── frontend/                # Next.js 15 — UI v2 (EN/TR UI locale)
├── qvac-service/            # @qvac/sdk sidecar (port 8765)
├── desktop/                 # Phase 1 tray launcher (setup + services + extension guide)
├── electron/                # Optional floating caption overlay
└── docker-compose.yml       # Sovereign profile
```

---

## Quick Start

### Requirements

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | 20+ | `node -v` |
| **Python** | 3.12+ | Used for backend + Whisper |
| **Google Chrome** | Latest | Required for tab audio (YouTube / Keet / Zoom) |
| **Git** | Any | Clone the repo |
| **NVIDIA GPU + CUDA** | Optional | Speeds up Whisper STT |

On Windows, install Python from [python.org](https://www.python.org/) and check **“Add Python to PATH”**.

---

### Option A — Windows desktop app (easiest)

1. Download **GlobalBridge-AI-*-setup.exe** from [GitHub Releases](https://github.com/001453/newtranslate/releases)
2. Install → tray icon appears → **Run setup** (needs Python 3.11+)
3. **Start services** → browser opens at http://localhost:3000
4. Optional: install [Chrome extension](extension/README.md) for tab overlay

Build locally: `npm run desktop:build` · Details: [docs/DISTRIBUTION.md](docs/DISTRIBUTION.md)

---

### Option B — Developer install (git clone)

#### 1. First-time install

```bash
git clone https://github.com/001453/newtranslate.git
cd newtranslate
npm run setup
```

`npm run setup` does the following automatically:

1. Copies `.env.example` → `.env` and syncs to `backend/.env`
2. Copies `frontend/.env.example` → `frontend/.env.local`
3. Runs `npm install` in `qvac-service/` and `frontend/`
4. Creates `backend/.venv` (if missing) and installs Python deps from `requirements.txt`
5. Creates `backend/data/` for uploads and SQLite

**No API keys required** for Sovereign Mode — QVAC runs locally.

---

#### 2. Run all services

**Single terminal (recommended):**

```bash
npm run dev
```

Starts **QVAC (8765) + API (8000) + Web (3000)** in one window. Press **Ctrl+C** to stop all.

**Option B — separate terminal windows:**

Windows:

```powershell
npm run setup          # skip if already done
.\scripts\start-dev.ps1
```

Linux / macOS:

```bash
npm run setup
chmod +x scripts/start-dev.sh
./scripts/start-dev.sh
```

**Option C — run services individually** (debugging):

```bash
npm run dev:qvac    # QVAC bridge only  → :8765
npm run dev:api     # FastAPI backend only → :8000
npm run dev:web     # Next.js frontend only → :3000
```

---

### 3. Stop services

| Method | Command |
|--------|---------|
| Single terminal (`npm run dev`) | **Ctrl+C** |
| Stale ports / crashed session | `npm run dev:stop` |
| Windows separate windows | Close each PowerShell window |

`npm run dev:stop` frees ports **8765, 8000, 3000** before the next start.

---

### 4. Verify everything is running

Open in your browser:

| URL | Expected |
|-----|----------|
| http://localhost:3000 | GlobalBridge UI |
| http://127.0.0.1:8000/health | JSON with `"status": "ok"` and `"qvac_available": true` |
| http://127.0.0.1:8765/health | QVAC bridge health (if exposed) |

In the UI, the top bar should show **API** and **QVAC** as connected (green).

If QVAC shows offline → wait 30–60 s on first start (model load), or check the QVAC terminal for errors.

---

### 5. Configuration

Files are created by `npm run setup`. Edit locally — **never commit** these:

| File | Purpose |
|------|---------|
| `.env` | Backend: QVAC, Whisper, privacy, security |
| `backend/.env` | Auto-synced copy of root `.env` |
| `frontend/.env.local` | `NEXT_PUBLIC_API_URL=http://localhost:8000` |

**Sovereign Mode (recommended):**

```env
LOCAL_PROCESSING_ONLY=true
TRANSLATION_PROVIDER=qvac
ALLOW_CLOUD_FALLBACK=false
QVAC_BRIDGE_URL=http://127.0.0.1:8765
```

**Security (defaults — safe for local use):**

```env
API_BIND_HOST=127.0.0.1          # API not reachable from LAN
API_KEY=                         # empty = no auth on localhost
MAX_UPLOAD_BYTES=52428800        # 50 MB PDF upload limit
MAX_BATCH_UPLOADS=10
```

To expose the API on your LAN, set `API_BIND_HOST=0.0.0.0` **and** a strong `API_KEY`. See [docs/SECURITY.md](docs/SECURITY.md).

**Whisper on CPU (no GPU):**

```env
WHISPER_MODEL=medium
WHISPER_DEVICE=cpu
```

---

### 6. Update after `git pull`

```bash
git pull
npm run setup    # reinstalls Python + npm deps if requirements changed
npm run dev
```

---

### 7. Troubleshooting

| Problem | Fix |
|---------|-----|
| `Backend venv missing` | Run `npm run setup` |
| Port already in use (`EADDRINUSE`) | `npm run dev:stop` then `npm run dev` |
| UI: “QVAC / API offline” | Check `NEXT_PUBLIC_API_URL=http://localhost:8000` in `frontend/.env.local` |
| Dictation / mic no signal | Windows mic not muted; pick correct device in sidebar; use Chrome |
| Live captions silent | Chrome → share tab → enable **“Share tab audio”** |
| Translation 503 | QVAC not running — check port 8765 |
| `spawn EINVAL` on Windows | Use `npm run dev` (not raw `npm.cmd` in old scripts) |

**Health check from terminal:**

```bash
curl http://127.0.0.1:8000/health
```

---

### Service ports

| Service | Port | URL |
|---------|------|-----|
| QVAC bridge | 8765 | http://127.0.0.1:8765 |
| Backend API | 8000 | http://127.0.0.1:8000 |
| Frontend UI | 3000 | http://localhost:3000 |

All three must run for full translation. API binds to **127.0.0.1** by default (localhost only).

---

### Docker (Sovereign profile)

```bash
docker compose --profile sovereign up --build
```

For local development, `npm run dev` is simpler.

## Usage

### Translation & dictation

1. Open `/` — type or use **Start dictation** (local Whisper, not cloud STT).
2. Pick source/target language; translation runs through QVAC when Sovereign Mode is on.

### Keet meeting

1. Open `/meeting` — set **My language** and **Other party language**.
2. Paste Keet invite → open in Keet app.
3. **Start bridge** → select Keet tab in Chrome → enable **Share tab audio**.
4. **Stop** → downloads `.txt`, `.json`, `.srt` transcript + local meeting summary.

### Live captions (YouTube / Zoom / Meet / Teams)

1. Open `/live` — same flow as Keet, but optimized for any browser tab with audio.
2. Use Chrome; check the setup guide on the page.

---

## Performance targets

| Metric | Target |
|--------|--------|
| STT latency | 300–800 ms |
| Translation latency | 500–1200 ms |
| End-to-end (live) | ≤ 1.5–2 s |

CPU-only: set `WHISPER_MODEL=medium` or `distil-large-v3` in `.env`.

---

## Grant & ecosystem alignment

This project is designed for the **Tether / QVAC sovereign AI** ecosystem and **Holepunch Keet** P2P communication:

- **QVAC**: All translation and summarization can run via `@qvac/sdk` with zero cloud egress.
- **Keet**: Adds multilingual accessibility to private P2P calls without centralized servers.
- **Open source**: MIT license, self-hostable, auditable pipeline.

See **[docs/GRANT.md](docs/GRANT.md)** for the full **Tether grant application** (copy-paste form text, milestones, $7,500 USD₮ breakdown). Apply at [tether.dev](https://tether.dev).

See **[docs/ROADMAP.md](docs/ROADMAP.md)** for planned features, benchmarks, and distribution timeline.

---

## Contributing

Pull requests only — `main` is protected. See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

MIT — see [LICENSE](LICENSE).

## Security

Local sovereign defaults: API binds to **127.0.0.1**, optional `API_KEY` for LAN deploy. See **[docs/SECURITY.md](docs/SECURITY.md)**.

---

## Support the project

If GlobalBridge AI helps you communicate across languages **without sending voice to the cloud**, consider:

- ⭐ **[Star the repo](https://github.com/001453/newtranslate/stargazers)** — helps grant reviewers and contributors find the project
- 🐛 **[Report issues](https://github.com/001453/newtranslate/issues)** or **[request features](https://github.com/001453/newtranslate/issues/new?template=feature_request.yml)**
- 💬 **[Discussions](https://github.com/001453/newtranslate/discussions)** — share your Keet / YouTube setup *(enable Discussions in repo settings)*
- 🔀 **Pull requests** welcome — see [CONTRIBUTING.md](CONTRIBUTING.md)

**Changelog:** [CHANGELOG.md](CHANGELOG.md) · **Releases:** [github.com/001453/newtranslate/releases](https://github.com/001453/newtranslate/releases)
