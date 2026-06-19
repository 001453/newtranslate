# GlobalBridge AI — Project Summary (Grant Application)

## One-line pitch

**GlobalBridge AI** is an open-source, **sovereign** real-time translation and live-caption stack that combines **Tether QVAC** (on-device AI) with **Keet** (P2P encrypted calls) so multilingual communication never requires sending voice or transcripts to the cloud.

---

## Problem

1. **Privacy**: Enterprise and activist users cannot send meeting audio to Google/Microsoft/Zoom cloud STT.
2. **Access**: P2P tools like Keet have no built-in multilingual subtitles.
3. **Latency & cost**: Cloud translation APIs add cost and 1–3 s delay per caption line.
4. **Sovereignty**: Regulated sectors need proof that data stays on-device.

---

## Solution

GlobalBridge AI is a **local-first bridge**:

| Layer | Technology | Location |
|-------|------------|----------|
| Speech-to-text | Faster-Whisper | User machine (Python backend) |
| Translation & summary | **QVAC `@qvac/sdk`** | User machine (port 8765) |
| Voice/video call | **Keet** (Holepunch P2P) | Peer-to-peer, E2E encrypted |
| Caption UI | Next.js + WebSocket | User browser (localhost) |
| Meeting export | TXT / JSON / SRT | Auto-download on session end |

**Sovereign Mode** (`LOCAL_PROCESSING_ONLY=true`): zero third-party data egress for audio, transcripts, and documents.

---

## QVAC usage (Tether)

- **Bergamot NMT** for low-latency bilingual translation in live captions.
- **Local LLM** (configurable QVAC model) for meeting summaries and document tasks.
- Sidecar service: `qvac-service/server.js` — HTTP bridge consumed by FastAPI `qvac_client.py`.
- No dependency on centralized inference servers when Sovereign Mode is enabled.

**Why QVAC fits:** GlobalBridge needs **fast, private, offline-capable** translation aligned with Tether’s decentralized AI vision — not a wrapper around OpenAI/Together (optional fallback only).

---

## Keet usage (Holepunch)

- Users run **Keet** for the actual call (P2P, no central media server).
- GlobalBridge `/meeting` captures **Keet tab audio** via standard Web APIs (`getDisplayMedia` + tab audio).
- Backend produces **personalized subtitles** (`viewer_lang`): each participant reads captions in their native language.
- Session transcripts export locally for compliance, journalism, and accessibility records.

**Why Keet fits:** Keet proves decentralized real-time communication works at scale; GlobalBridge adds **accessibility and language inclusion** without compromising Keet’s privacy model.

---

## Live caption use cases (beyond Keet)

Same pipeline powers `/live`:

- YouTube (education, news, accessibility)
- Zoom / Google Meet / Microsoft Teams (browser tab audio)
- Local meeting recording with automatic transcript files

---

## Technical highlights

- **Async live pipeline** — WebSocket audio queue; STT + QVAC do not block capture.
- **Whisper dictation** — Local HTTP `/transcribe` (no browser cloud STT).
- **Anti-hallucination filters** for noisy tab audio / music.
- **Chunk overlap + context** for Turkish and other agglutinative languages.
- **Chrome-first** tab audio (documented; required for reliable capture on Windows).

---

## Metrics & targets

| Metric | Target |
|--------|--------|
| Live caption end-to-end | ≤ 2 s |
| Languages (translation) | 100+ via QVAC / language packs |
| STT languages | 99+ via Whisper |
| Data egress (Sovereign) | **None** |

---

## Repository

- **GitHub:** https://github.com/001453/newtranslate
- **License:** MIT
- **Stack:** Python 3.12, FastAPI, Next.js 15, `@qvac/sdk`, faster-whisper

---

## Roadmap (grant-enabled)

1. **Native Keet / Pear SDK hooks** — deeper integration when APIs stabilize.
2. **VAD-based segmentation** — cleaner captions on long-form video.
3. **Electron overlay** — system-wide captions without browser focus.
4. **Language pack CDN** — QVAC model distribution for offline deploys.
5. **Mobile companion** — subtitle receiver on second device via LAN WebSocket.

---

## Team & contact

Update this section with applicant name, organization, and contact before submitting the grant.

- **Project:** GlobalBridge AI
- **Repository:** https://github.com/001453/newtranslate
