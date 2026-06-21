# GlobalBridge Live Captions — Chrome Extension (M4 MVP)

Sovereign live subtitles on **any tab** using the local GlobalBridge stack (Whisper STT + QVAC on `localhost:8000`).

## Prerequisites

1. Clone and run the full stack from the repo root:

   ```bash
   npm run setup
   npm run dev
   ```

2. Confirm API health: http://127.0.0.1:8000/health

## Load unpacked (development)

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select this `extension/` folder
4. Pin **GlobalBridge Live Captions** to the toolbar

## Usage

1. Open YouTube, Zoom, Meet, Keet, or any tab with speech
2. Click the extension icon
3. Set **My language** and **Tab / speech language**
4. Click **Start captions** — overlay appears at the bottom of the active tab
5. Click **Stop captions** when done

## Architecture

```
Active tab (content.js overlay)
    ↑ CAPTION messages
background.js — WebSocket ws://127.0.0.1:8000/api/v1/ws/live
    ↑ PCM chunks
offscreen.js — tabCapture → 16 kHz PCM
```

Audio never leaves your machine in Sovereign Mode. See [docs/SOVEREIGN_EGRESS_CHECKLIST.md](../docs/SOVEREIGN_EGRESS_CHECKLIST.md).

## Permissions

| Permission | Why |
|------------|-----|
| `tabCapture` | Read tab audio for STT |
| `offscreen` | Process audio in MV3 service worker |
| `storage` | Save language preferences |
| `host_permissions` localhost:8000 | Local API + WebSocket only |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| “Start failed — is backend running?” | Run `npm run dev`, check :8000 |
| No captions | Ensure tab has audible speech; check QVAC on :8765 |
| Overlay missing | Refresh the tab after loading the extension |

## Chrome Web Store

See **[docs/CHROME_WEB_STORE.md](../docs/CHROME_WEB_STORE.md)** for listing copy and submission steps.

Copy-paste fields: [store/LISTING.txt](store/LISTING.txt)

```bash
npm run extension:zip   # → dist/GlobalBridge-Extension-v0.1.1.zip
```

## Related

- [docs/CHROME_WEB_STORE.md](../docs/CHROME_WEB_STORE.md)
- [docs/KEET_PEARS_INTEGRATION.md](../docs/KEET_PEARS_INTEGRATION.md)
- [docs/STT.md](../docs/STT.md)
