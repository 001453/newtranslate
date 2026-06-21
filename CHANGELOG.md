# Changelog

All notable changes to **GlobalBridge AI** are documented here.  
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

---

## [0.1.5] - 2026-06-21

### Fixed
- Windows release CI — NSIS installer uses `.ico` (not `.png`); skip code signing; exclude nested `.exe` from bundle
- Packaged desktop starts Next.js without requiring system `npm` on PATH


## [0.1.1] - 2026-06-21

### Added
- Public demo video on [YouTube](https://youtu.be/1cxwP5S7-1A)
- CPU-only latency benchmarks ([docs/BENCHMARKS.md](docs/BENCHMARKS.md))
- Chrome extension MVP ([extension/](extension/))
- Keet/Pears builder guide ([docs/KEET_PEARS_INTEGRATION.md](docs/KEET_PEARS_INTEGRATION.md))
- Unified STT router ([docs/STT.md](docs/STT.md))

---

## [0.1.0] - 2026-06-19

First public MVP release — sovereign local translation bridge with QVAC + Keet integration.

### Added
- **Live captions** — tab audio capture → Faster-Whisper STT → QVAC translation → WebSocket subtitles
- **Whisper dictation** — local STT via `POST /api/v1/transcribe` (PCM int16 @ 16 kHz)
- **Keet meeting bridge** — `/meeting` with bilingual subtitles and auto-export (TXT / JSON / SRT)
- **QVAC integration** — `@qvac/sdk` sidecar on port 8765 for on-device NMT + LLM
- **Document translation** — PDF and DOCX routes with upload validation
- **Glossary & history** — local SQLite storage
- **Sovereign Mode** — zero cloud egress when `LOCAL_PROCESSING_ONLY=true`
- **Security hardening** — API binds to `127.0.0.1`, optional `API_KEY`, PDF upload limits
- **Dev tooling** — `npm run setup`, `npm run dev`, `npm run dev:stop`
- **Documentation** — English README, `docs/GRANT.md`, `docs/SECURITY.md`, `docs/ROADMAP.md`
- **CI** — GitHub Actions: frontend lint/test/build, backend pytest, i18n parity check

### Changed
- Dictation moved from browser Web Speech API to local Whisper
- Live pipeline uses async audio queue (non-blocking WebSocket)

### Security
- PDF batch extension whitelist, 50 MB size cap, max 10 files per batch
- Dependency CVE patches (FastAPI, Starlette, Pillow, requests, python-multipart)

---

[Unreleased]: https://github.com/001453/newtranslate/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/001453/newtranslate/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/001453/newtranslate/releases/tag/v0.1.0
