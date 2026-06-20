# Demo recording guide (maintainers)

> **Internal note** — not linked from the public README. Reviewers see [docs/DEMO.md](../docs/DEMO.md).

**Target length:** 5–8 minutes · **Language:** English · **Grant M1**

After upload: `npm run demo:publish -- "C:\Users\YOU\Downloads\your-video.mp4"`  
Or YouTube: `npm run demo:url -- https://youtu.be/VIDEO_ID`

---

## What reviewers must see

| # | Scene | Proves |
|---|--------|--------|
| 1 | Intro + problem | Why sovereign local AI matters |
| 2 | `npm run dev` + green API/QVAC status | Full stack runs locally |
| 3 | Whisper dictation on `/` | Local STT (not cloud) |
| 4 | Live captions on `/live` (YouTube tab) | Tab capture → Whisper → QVAC → subtitles |
| 5 | *(Optional)* Keet flow on `/meeting` | P2P + personalized captions |
| 6 | Stop session → **TXT / JSON / SRT** download | Meeting export works |
| 7 | Sovereign Mode + egress checklist | Zero cloud egress claim |

---

## Before you record (15 min prep)

### 1. Environment

```powershell
cd newtranslate
npm run dev
```

| Check | URL |
|-------|-----|
| UI | http://localhost:3000 |
| API | http://localhost:8000/health → `"status":"ok"`, `"qvac_available":true` |
| QVAC | Terminal shows bridge on :8765 |

### 2. UI language → **English**

### 3. Sovereign Mode in `.env`

```env
LOCAL_PROCESSING_ONLY=true
TRANSLATION_PROVIDER=qvac
ALLOW_CLOUD_FALLBACK=false
```

### 4. Browser

- **Google Chrome** only · hide bookmarks · no `.env` or API keys on screen

### 5. Demo content

- **YouTube:** 1–2 min clip, clear speech (EN audio → TR subtitles works well)
- **Keet:** optional — skip and mention M3 if not ready

### 6. Recording (Windows)

| Tool | How |
|------|-----|
| Xbox Game Bar | `Win + G` → Record |
| OBS | 1080p, 30 fps |

---

## Shot list & script (≈ 6 minutes)

### Scene 1 — Hook (0:00–0:45)

**Screen:** https://001453.github.io/newtranslate/ or repo About page

**Say:**

> “GlobalBridge AI is an open-source, sovereign translation bridge. Speech is transcribed with local Whisper, translated with Tether QVAC on your machine, and shown as live captions — without sending audio to the cloud. It integrates with Keet for private P2P calls and with any browser tab for YouTube, Zoom, or Google Meet.”

---

### Scene 2 — Stack (0:45–1:30)

**Screen:** `npm run dev` terminal + http://localhost:3000

**Say:**

> “Three services run locally: QVAC on 8765, FastAPI on 8000, Next.js on 3000. API and QVAC show connected — all inference stays on this machine.”

**Show:** green status bar · `/health` JSON · routes `/`, `/live`, `/meeting`

---

### Scene 3 — Dictation (1:30–2:30)

**Screen:** `/` — Start dictation, speak, show translation

---

### Scene 4 — Live captions (2:30–4:30) ⭐

**Screen:** `/live` + YouTube tab · **Share tab audio**

---

### Scene 5 — Keet (optional, 4:30–5:30)

**Screen:** `/meeting` UI or short Keet tab share

---

### Scene 6 — Export (5:30–6:15)

Stop bridge → show `.txt`, `.json`, `.srt` downloads

---

### Scene 7 — Sovereign Mode (6:15–7:00)

**Screen:** `.env.example` (not real `.env`) + privacy banner

---

### Scene 8 — Close (7:00–7:30)

**Show:** https://github.com/001453/newtranslate

---

## After recording

1. YouTube → **Unlisted**  
   - Title: `GlobalBridge AI — Sovereign Live Translation (QVAC + Keet) Demo`  
   - Description: repo link + “100% local in Sovereign Mode”  
2. Run: `npm run demo:url -- https://youtu.be/VIDEO_ID`  
3. Commit + push  
4. Optional: 15 s GIF → `docs/assets/demo.gif` → uncomment in README

---

## Troubleshooting on camera

| Issue | Fix |
|-------|-----|
| No captions | “Share tab audio” in Chrome |
| QVAC offline | Wait 30–60 s; port 8765 |
| UI in Turkish | Switch to EN before record |

See [SOVEREIGN_EGRESS_CHECKLIST.md](../docs/SOVEREIGN_EGRESS_CHECKLIST.md) for egress audit.
