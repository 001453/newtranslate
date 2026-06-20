# GlobalBridge AI — Tether Grant Application

**Apply at:** [https://tether.dev](https://tether.dev) → **Apply for a grant**  
**Category:** Applications on Tether’s open stack · QVAC integration · Pears / Keet (P2P)  
**Program:** [Tether Developer Grants — local-first AI & payments](https://tether.io/news/tether-launches-developer-grants-program-to-fund-local-first-ai-and-payments-infrastructure/)  
**Repository:** https://github.com/001453/newtranslate  
**License:** MIT  

---

## Copy-paste for application form

### Project title

```
GlobalBridge AI — Sovereign Live Translation with QVAC + Keet P2P
```

### Short description (≤ 280 characters)

```
Open-source app: local Whisper STT + QVAC @qvac/sdk translation + Keet P2P meeting captions. Zero audio egress in Sovereign Mode. Live subtitles, dictation, meeting export (.txt/.json/.srt). MIT, self-hostable.
```

### Long description

```
GlobalBridge AI is a sovereign real-time translation bridge. Speech is transcribed locally (Faster-Whisper), translated and summarized via Tether QVAC (@qvac/sdk sidecar on port 8765), and shown as live captions — without sending audio or transcripts to the cloud when Sovereign Mode is enabled.

We integrate with Keet (Holepunch P2P): users run encrypted calls in Keet while GlobalBridge captures tab audio locally and renders personalized subtitles in each participant’s native language (viewer_lang). The same pipeline powers YouTube, Zoom, Meet, and Teams via browser tab capture.

Stack: Python FastAPI, Next.js 15, @qvac/sdk, faster-whisper. Working MVP is open source: https://github.com/001453/newtranslate

Grant funds will deliver deeper Pear/Keet integration, VAD-based caption segmentation, a Chrome extension for live captions, benchmark documentation, and a public demo video for the Tether ecosystem.
```

### Grant category (select / describe)

```
☑ New applications powered by Tether’s open tech stack
☑ Tooling, integrations (QVAC + Pears/Keet)
☑ Documentation & developer onboarding
```

### Requested amount

```
7,500 USD₮ (milestone-based, see below)
```

### Payment preference

```
USD₮
```

### Links

| Resource | URL |
|----------|-----|
| Source code | https://github.com/001453/newtranslate |
| This application | https://github.com/001453/newtranslate/blob/main/docs/GRANT.md |
| QVAC | https://qvac.tether.io/ |
| Keet | https://keet.io/ |

### Team & contact *(fill before submit)*

| Field | Value |
|-------|-------|
| Applicant name | `[YOUR NAME]` |
| Email | `[YOUR EMAIL]` |
| GitHub | `[YOUR GITHUB]` |
| Location | `[COUNTRY]` |

---

## One-line pitch

**GlobalBridge AI** is an open-source, **sovereign** real-time translation and live-caption stack that combines **Tether QVAC** (on-device AI) with **Keet** (P2P encrypted calls) so multilingual communication never requires sending voice or transcripts to the cloud.

---

## Problem

1. **Privacy** — Enterprises, journalists, and activists cannot send meeting audio to Google/Microsoft cloud STT.
2. **Access** — P2P tools like **Keet** have no built-in multilingual subtitles.
3. **Latency & cost** — Cloud translation adds 1–3 s delay and recurring API fees per caption line.
4. **Sovereignty** — Regulated users need auditable proof that inference stays on-device.

Most AI still runs on remote servers (data leaves the device, latency, exposure). Tether’s **QVAC** and **Pears/Keet** stack offers the opposite: local inference and serverless communication. GlobalBridge connects them into one usable product.

---

## Solution (already built — open source MVP)

| Layer | Technology | Where it runs |
|-------|------------|---------------|
| Speech-to-text | Faster-Whisper | User machine |
| Translation & summary | **QVAC `@qvac/sdk`** | localhost:8765 |
| P2P call | **Keet** (Holepunch) | Peer-to-peer, E2E |
| UI | Next.js + WebSocket | localhost:3000 |
| Meeting export | TXT / JSON / SRT | Auto-download on session end |

**Sovereign Mode** (`LOCAL_PROCESSING_ONLY=true`): no third-party egress for audio, transcripts, or documents.

### Architecture

```
Tab audio / Microphone (Chrome)
  → WebSocket /api/v1/ws/live (localhost)
  → Faster-Whisper STT
  → QVAC bridge (@qvac/sdk) — Bergamot NMT + local LLM
  → Live subtitles + transcript export
```

**Keet flow:** User opens Keet call → GlobalBridge `/meeting` shares Keet tab audio → each viewer sees captions in **their** language via `viewer_lang`.

---

## QVAC integration (Tether)

- Sidecar: `qvac-service/server.js` using **`@qvac/sdk`**
- Backend client: `backend/services/qvac_client.py`
- Uses QVAC for **live translation**, **meeting summaries**, and **document/PDF** tasks
- Cloud APIs (Together AI) are **optional** and disabled in Sovereign Mode

**Alignment with Tether grants program:** Local-first AI, no cloud dependency, open modular stack — exactly what the [May 2026 grants announcement](https://tether.io/news/tether-launches-developer-grants-program-to-fund-local-first-ai-and-payments-infrastructure/) describes for QVAC.

---

## Keet / Pears integration (Holepunch)

- `/meeting` route with Keet invite links (`keet://`)
- Personalized bilingual subtitles without a central media server
- Grant phase will add **Pear SDK research**, deeper hooks, and published integration guide

---

## What grant funding delivers (milestones)

| ID | Deliverable | Deadline | Payout |
|----|-------------|----------|--------|
| **M1** | **Public demo & docs** — 5–8 min video ([script](DEMO_VIDEO.md)); [egress checklist](SOVEREIGN_EGRESS_CHECKLIST.md); English setup guide (README) | +30 days | **1,500 USD₮** |
| **M2** | **QVAC hardening** — Fix/unify QVAC STT path; benchmark latency (STT + NMT); publish results in `docs/BENCHMARKS.md` | +60 days | **2,000 USD₮** |
| **M3** | **Pear / Keet integration v2** — Pear SDK spike; improved meeting bridge; integration doc for Pears builders | +75 days | **2,000 USD₮** |
| **M4** | **Chrome extension MVP** — Live captions overlay for tab audio (QVAC translation); publish on repo `extension/` | +90 days | **2,000 USD₮** |
| | **Total** | **~90 days** | **7,500 USD₮** |

*M1 partially satisfied by existing repo + README; M1 payout on delivery of demo video + docs per Tether review.*

---

## Success metrics

| Metric | Target |
|--------|--------|
| Live caption end-to-end latency | ≤ 2 s (documented benchmark) |
| STT languages (Whisper) | 99+ |
| Translation via QVAC | 100+ language pairs (Bergamot packs) |
| Data egress in Sovereign Mode | **Zero** (documented) |
| Keet meeting transcript export | TXT + JSON + SRT on session end |

---

## Why not a pre-defined bounty?

[tether.dev bounties](https://tether.dev) list WDK wallet tasks and ANE/CoreML QVAC tasks. GlobalBridge is an **application layer** combining **QVAC + Pears/Keet** for accessibility — a fit for **“Applications on Tether’s open tech stack”**, not WDK modules.

---

## Roadmap after grant

1. Electron system-wide overlay  
2. VAD-based speech segmentation (cleaner long-form captions)  
3. Mobile LAN subtitle receiver  
4. Optional WDK integration for paid translation sessions (future)  

---

## Budget justification

Tether’s program pays **$1,500–$10,000** per defined task. At **$7,500** over four milestones, funding covers:

- Engineering (~120–150 h integration + extension work)  
- Documentation and demo production for ecosystem onboarding  
- No ongoing hosting costs — product is fully local/self-hosted  

---

## Checklist before you click Apply

- [ ] Replace `[YOUR NAME]`, `[YOUR EMAIL]`, `[YOUR GITHUB]`, `[COUNTRY]` above  
- [ ] Record demo video — follow **[docs/DEMO_VIDEO.md](DEMO_VIDEO.md)** (5–8 min, English)  
- [ ] Complete **[docs/SOVEREIGN_EGRESS_CHECKLIST.md](SOVEREIGN_EGRESS_CHECKLIST.md)**  
- [ ] Add YouTube (unlisted) link to README Demo section  
- [ ] Open https://tether.dev → **Apply for a grant**  
- [ ] Paste **Project title**, **Short description**, **Long description** from top of this file  
- [ ] Attach link: `https://github.com/001453/newtranslate/blob/main/docs/GRANT.md`  
- [ ] Select payment: **USD₮**  

---

## References

- Tether grants announcement: https://tether.io/news/tether-launches-developer-grants-program-to-fund-local-first-ai-and-payments-infrastructure/  
- Apply / bounties: https://tether.dev  
- QVAC: https://qvac.tether.io/  
- Keet: https://keet.io/  
