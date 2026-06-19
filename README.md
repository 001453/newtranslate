# GlobalBridge AI

**Sovereign real-time translation bridge** — 100+ languages, live captions, Whisper dictation, and document translation.  
Built on **[QVAC](https://qvac.tether.io/)** (Tether local AI) + **[Keet](https://keet.io/)** (P2P meetings). **Audio and transcripts never leave the device** in Sovereign Mode.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

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

> Keet handles the call; GlobalBridge handles **local STT + QVAC translation**. No Keet SDK is required — integration is via standard browser tab audio capture, keeping the stack simple and fully local.

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
├── electron/                # Optional floating caption overlay
└── docker-compose.yml       # Sovereign profile
```

---

## Quick Start

### Requirements

- **Node.js 20+**
- **Python 3.12+**
- **Google Chrome** (recommended for tab audio / YouTube / meetings)
- **[QVAC SDK](https://qvac.tether.io/)** (via `qvac-service`)
- NVIDIA GPU + CUDA (optional, speeds up Whisper)

### Install & run

```bash
git clone https://github.com/001453/newtranslate.git
cd newtranslate
npm run setup    # Creates .env + frontend/.env.local from examples
npm run dev      # QVAC :8765 + API :8000 + Web :3000
```

Open **http://localhost:3000**

| Service | Port | Role |
|---------|------|------|
| QVAC bridge | 8765 | Local NMT + LLM (`@qvac/sdk`) |
| Backend | 8000 | FastAPI API + WebSocket |
| Frontend | 3000 | Next.js UI |

**Windows (separate terminal windows):**

```powershell
npm run setup
.\scripts\start-dev.ps1
```

**Linux / macOS:**

```bash
npm run setup
chmod +x scripts/start-dev.sh
./scripts/start-dev.sh
```

### Configuration

Copy is automatic on first `npm run setup`. Edit locally (never committed):

| File | Purpose |
|------|---------|
| `.env` | QVAC URL, Whisper model, privacy flags |
| `frontend/.env.local` | `NEXT_PUBLIC_API_URL=http://localhost:8000` |

---

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

### Docker (Sovereign profile)

```bash
docker compose --profile sovereign up --build
```

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

---

## Contributing

Pull requests only — `main` is protected. See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

MIT — see [LICENSE](LICENSE).

## Security

Local sovereign defaults: API binds to **127.0.0.1**, optional `API_KEY` for LAN deploy. See **[docs/SECURITY.md](docs/SECURITY.md)**.
