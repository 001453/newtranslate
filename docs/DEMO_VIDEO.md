# Demo video guide (Grant M1)

**Target length:** 5–8 minutes  
**Language:** English (UI locale + narration)  
**Audience:** Tether / QVAC grant reviewers, open-source contributors  

After recording, upload to **YouTube (unlisted)** or **GitHub Releases** assets, then add the link to [README.md](../README.md) and [GRANT.md](GRANT.md).

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

Wait until all three services are up:

| Check | URL |
|-------|-----|
| UI | http://localhost:3000 |
| API | http://localhost:8000/health → `"status":"ok"`, `"qvac_available":true` |
| QVAC | Terminal shows bridge on :8765 |

### 2. UI language

In the app header, switch UI to **English** (grant reviewers).

### 3. Sovereign Mode

Confirm `.env`:

```env
LOCAL_PROCESSING_ONLY=true
TRANSLATION_PROVIDER=qvac
ALLOW_CLOUD_FALLBACK=false
```

### 4. Browser

- **Google Chrome** only (tab audio)
- Close unrelated tabs
- Hide bookmarks bar (cleaner recording)
- **Do not** show `.env`, API keys, or personal data on screen

### 5. Demo content

**YouTube (recommended — reliable audio):**

- Open a short clip with clear speech, e.g. a 1–2 min news segment or TED excerpt  
- Languages: e.g. **English audio → Turkish subtitles** (or EN → ES)

**Keet (optional):**

- Have Keet installed and a test room ready  
- Or skip Keet and mention it in voice-over while showing `/meeting` UI

### 6. Recording tool (Windows)

| Tool | How |
|------|-----|
| **Xbox Game Bar** | `Win + G` → Capture → Record |
| **OBS Studio** | Display capture 1920×1080, 30 fps |
| **ShareX** | Screen recorder → MP4 |

**Settings:** 1080p, 30 fps, microphone on (English narration), system audio optional.

---

## Shot list & script (≈ 6 minutes)

### Scene 1 — Hook (0:00–0:45)

**Screen:** Title slide or browser on https://001453.github.io/newtranslate/

**Say:**

> “GlobalBridge AI is an open-source, sovereign translation bridge. Speech is transcribed with local Whisper, translated with Tether QVAC on your machine, and shown as live captions — without sending audio to the cloud. It integrates with Keet for private P2P calls and with any browser tab for YouTube, Zoom, or Google Meet.”

**Show:** GitHub repo page briefly (MIT license, QVAC + Keet in About).

---

### Scene 2 — Stack running locally (0:45–1:30)

**Screen:** Terminal with `npm run dev` logs + browser http://localhost:3000

**Say:**

> “Three services run locally: QVAC on port 8765, FastAPI on 8000, and the Next.js UI on 3000. The status bar shows API and QVAC connected — all inference stays on this machine.”

**Show:**

1. Top bar: **API** and **QVAC** green  
2. Open http://127.0.0.1:8000/health in a tab (JSON with `qvac_available: true`)  
3. Quick scroll of routes: `/`, `/live`, `/meeting`

---

### Scene 3 — Dictation (1:30–2:30)

**Screen:** http://localhost:3000/

**Say:**

> “Dictation uses Faster-Whisper on the backend — not the browser’s cloud speech API. I speak in one language and get text locally, then QVAC translates.”

**Do:**

1. Pick languages (e.g. EN → TR)  
2. Click **Start dictation**  
3. Speak 1–2 sentences clearly  
4. Show transcribed text + translation appearing  

---

### Scene 4 — Live captions / YouTube (2:30–4:30) ⭐ main demo

**Screen:** http://localhost:3000/live

**Say:**

> “For live captions, GlobalBridge captures tab audio in Chrome. I’ll play a YouTube clip in English and read Turkish subtitles generated locally through Whisper and QVAC.”

**Do:**

1. Set **My language** / **Other party language** (e.g. TR / EN)  
2. Open YouTube in another tab — start a clip with speech  
3. Back to `/live` → **Start bridge**  
4. Chrome share dialog → select **YouTube tab** → enable **Share tab audio**  
5. Wait for captions (first line may take a few seconds while Whisper loads)  
6. Point at: original line + translated subtitle, latency if shown  
7. Show audio level / chunks indicator if visible  

**Tip:** Pause YouTube if captions lag; resume to show steady flow.

---

### Scene 5 — Keet (optional, 4:30–5:30)

**Screen:** http://localhost:3000/meeting

**Say:**

> “For Keet P2P calls, the same pipeline applies. Users open an encrypted Keet room, share the Keet tab audio here, and each person can view subtitles in their own language. No Keet SDK is required — only standard tab capture.”

**Do:**

- Paste `keet://` invite or show Keet tab share flow  
- **Or** if Keet not ready: show the meeting UI + guide panel only (10 s) and say “Full Keet demo in grant milestone M3.”

---

### Scene 6 — Export on stop (5:30–6:15)

**Screen:** Still on `/live` or `/meeting`

**Say:**

> “When the session ends, the transcript exports automatically as plain text, JSON, and SRT — all generated locally.”

**Do:**

1. Click **Stop bridge**  
2. Show browser download(s): `.txt`, `.json`, `.srt`  
3. Open `.txt` briefly — timestamps + original + translation lines  

---

### Scene 7 — Sovereign Mode (6:15–7:00)

**Screen:** `.env.example` in editor (not your real `.env`) + Privacy banner in UI

**Say:**

> “In Sovereign Mode, local processing is enforced and cloud fallback is disabled. We document every egress point in the sovereign checklist — under normal use, audio and transcripts never leave the device.”

**Show:**

1. `.env.example` lines: `LOCAL_PROCESSING_ONLY`, `ALLOW_CLOUD_FALLBACK=false`  
2. In-app privacy / sovereign banner if visible  
3. Mention checklist: [docs/SOVEREIGN_EGRESS_CHECKLIST.md](SOVEREIGN_EGRESS_CHECKLIST.md)

---

### Scene 8 — Close (7:00–7:30)

**Screen:** GitHub repo + Pages site

**Say:**

> “GlobalBridge AI is MIT licensed and self-hostable. Source, setup guide, and grant roadmap are on GitHub. We’re applying to the Tether QVAC ecosystem to ship Chrome extension, benchmarks, and deeper Keet integration. Star the repo and try it locally with npm run setup and npm run dev. Thank you.”

**Show:** https://github.com/001453/newtranslate

---

## After recording

### Edit (optional, 30 min)

- Trim dead air at start/end  
- Add simple title card: **GlobalBridge AI — QVAC + Keet**  
- No copyrighted music  

### Upload

1. **YouTube** → Visibility: **Unlisted**  
   - Title: `GlobalBridge AI — Sovereign Live Translation (QVAC + Keet) Demo`  
   - Description: link to repo + “Audio processed 100% locally in Sovereign Mode”  
2. Or attach MP4 to GitHub **Release v0.1.0** as asset  

### Update repo

1. Add link in README **Demo** section  
2. Check off M1 item in [GRANT.md](GRANT.md)  
3. Optional: extract 15 s clip → `docs/assets/demo.gif` for README  

---

## Troubleshooting on camera

| Issue | Fix on recording |
|-------|------------------|
| No captions | Confirm “Share tab audio” checked; use Chrome |
| QVAC offline | Wait 30–60 s after first start; check port 8765 |
| Mic dead | Windows sound settings → input not muted |
| Slow first caption | Say “Whisper model loading” — normal on cold start |
| UI in Turkish | Switch locale to EN before recording |

---

## M1 deliverable checklist

- [ ] 5–8 min English demo video (YouTube unlisted or Release asset)  
- [ ] Video link in README + GRANT.md  
- [ ] [SOVEREIGN_EGRESS_CHECKLIST.md](SOVEREIGN_EGRESS_CHECKLIST.md) reviewed  
- [ ] Setup guide: [README Quick Start](../README.md#quick-start) *(already done)*  

**M1 payout:** 1,500 USD₮ after Tether review.

---

## Video link (fill after upload)

```
YouTube (unlisted): [PASTE URL HERE]
```

Example README line after upload:

```markdown
**Watch demo:** [YouTube — GlobalBridge AI sovereign live captions](https://youtu.be/XXXXX)
```
