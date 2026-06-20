# Demo

GlobalBridge AI runs **speech recognition and translation on your machine** — Faster-Whisper for STT and [Tether QVAC](https://qvac.tether.io/) for NMT. No audio is sent to cloud APIs in Sovereign Mode.

---

## Watch

<!-- DEMO_VIDEO_START -->
Video walkthrough (YouTube, ~5 min) — linked here after publication.
<!-- DEMO_VIDEO_END -->

---

## What the demo shows

| Segment | Route | Technology |
|---------|-------|------------|
| Local stack | Terminal + UI | QVAC :8765 · API :8000 · Web :3000 |
| Dictation | `/` | Faster-Whisper → QVAC |
| **Live captions** | `/live` | Chrome tab audio → Whisper → QVAC subtitles |
| Keet meetings *(optional)* | `/meeting` | P2P tab capture + bilingual captions |
| Session export | Stop bridge | `.txt` · `.json` · `.srt` download |
| Sovereign Mode | `.env.example` | Zero cloud egress |

**Length:** ~5–8 minutes · **Language:** English UI + narration

---

## Privacy verification

Sovereign Mode data-flow audit for reviewers and self-hosters:

**[Sovereign egress checklist →](SOVEREIGN_EGRESS_CHECKLIST.md)**

---

## Try it locally

```bash
git clone https://github.com/001453/newtranslate.git
cd newtranslate
npm run setup
npm run dev
```

Open http://localhost:3000 — see [README Quick Start](../README.md#quick-start).

**Requirements:** Chrome (tab audio), Node 20+, Python 3.12+, QVAC sidecar.

---

## Links

| Resource | URL |
|----------|-----|
| Source | https://github.com/001453/newtranslate |
| Grant summary | [GRANT.md](GRANT.md) |
| Roadmap | [ROADMAP.md](ROADMAP.md) |
| Project site | https://001453.github.io/newtranslate/ |
