# Keet / Pears integration guide (M3)

How **GlobalBridge AI** adds sovereign live subtitles on top of **Keet** (Holepunch P2P calls) and how **Pears builders** can extend the same pipeline.

---

## What we integrate today (v1 — tab audio bridge)

Keet runs as a separate P2P app (desktop or mobile). GlobalBridge does **not** receive raw RTP from Keet directly in the browser. Instead:

1. User joins a Keet room via `keet://…` or `pear://…` invite.
2. User opens GlobalBridge at `/meeting` and pastes the same invite.
3. User starts the **bridge** and shares the **Keet browser tab** in Chrome with **Share tab audio** enabled.
4. Audio stays on-device: tab PCM → WebSocket → Faster-Whisper → QVAC NMT → captions in `viewer_lang`.

This pattern works for any tab-based call (Zoom, Meet, Teams, YouTube) without vendor SDKs.

```
┌─────────────┐     tab audio      ┌──────────────────┐
│ Keet (P2P)  │ ────────────────► │ GlobalBridge UI  │
│  keet://    │   Chrome capture   │  /meeting        │
└─────────────┘                    └────────┬─────────┘
                                              │ ws://localhost:8000/api/v1/ws/live
                                              ▼
                                     ┌──────────────────┐
                                     │ FastAPI backend  │
                                     │ STT + QVAC NMT   │
                                     └──────────────────┘
```

**Privacy:** In Sovereign Mode, no audio or transcript leaves the machine. See [SOVEREIGN_EGRESS_CHECKLIST.md](SOVEREIGN_EGRESS_CHECKLIST.md).

---

## Deep links for participants

Share a one-click setup URL so each participant opens GlobalBridge with invite + language pair pre-filled:

```
https://your-host/meeting?invite=keet%3A%2F%2F<room-key>&from=tr&to=en
```

| Query param | Meaning |
|-------------|---------|
| `invite` or `keet` | Keet / Pear invite (`keet://…`, `pear://keet/…`, or raw room key) |
| `from` | Viewer native language (ISO 639-1, e.g. `tr`) |
| `to` | Other party / tab audio language (e.g. `en`) |

Implementation: `frontend/src/lib/keet.ts` — `parseMeetingDeepLink`, `buildMeetingDeepLink`.

---

## WebSocket session config (bidirectional)

When the bridge starts, the frontend sends:

```json
{
  "action": "start_session",
  "config": {
    "source_lang": "en",
    "target_lang": "tr",
    "bidirectional": true,
    "lang_a": "tr",
    "lang_b": "en",
    "viewer_lang": "tr"
  }
}
```

- **`viewer_lang`** — language shown in subtitles for this user.
- **`source_lang`** — language expected in captured audio (tab = other party; mic = viewer).
- **`bidirectional: true`** — backend translates toward `viewer_lang` regardless of detected direction.

Language changes mid-session: `action: "update_languages"` with the same `config` shape.

Backend: `backend/services/live_pipeline.py`, `backend/api/websocket.py`.

---

## Invite link formats

| Format | Example | Handled by |
|--------|---------|------------|
| Keet scheme | `keet://<room-key>` | `normalizeKeetInvite()` |
| Pear scheme | `pear://keet/<room-key>` | same |
| Raw key | 20+ char base64-like token | prefixed to `keet://` |

Helpers: `frontend/src/lib/keet.ts`, UI: `KeetMeetingBridge.tsx`.

---

## Meeting export

On **Stop bridge**, the backend emits `transcript_export` with TXT, JSON, and SRT. Files download automatically in the browser.

Backend: `backend/services/meeting_export.py`  
Frontend: `frontend/src/lib/meetingExport.ts`

Optional REST (same machine):

- `GET /api/v1/meetings/transcript`
- `POST /api/v1/meetings/summary`

---

## Pear SDK spike (future v2)

**Current constraint:** Browser apps cannot attach to Keet’s P2P media plane without Keet/Pear exposing a supported embedding or IPC API. GlobalBridge v1 deliberately uses **tab capture** so it ships today on Chrome desktop without forking Keet.

**Research directions for Pears builders:**

| Approach | Pros | Cons |
|----------|------|------|
| Tab audio bridge (v1) | Works now, zero Keet fork | User must pick tab + share audio |
| Pear desktop embed | Direct audio tap, lower latency | Requires Pear runtime + API |
| LAN second-screen | Phone/tablet as caption display | Same STT stack, different UI |
| Chrome extension (M4) | Overlay on any tab | Still tab capture, not P2P hook |

References:

- [Keet](https://keet.io/)
- [Holepunch](https://holepunch.to/)
- [Pear docs](https://docs.pears.com/)

---

## For Pears / Keet builders — integration checklist

1. **Run the stack locally** — `npm run setup && npm run dev` (QVAC 8765, API 8000, UI 3000).
2. **Open `/meeting`** — paste Keet invite, set languages, start bridge.
3. **Generate participant link** — “Copy setup link” in UI (uses `buildMeetingDeepLink`).
4. **Consume captions** — WebSocket events `caption` / `caption_update`, or poll transcript REST.
5. **Sovereign audit** — confirm `GET /health` → `privacy_mode: sovereign`, `data_egress: []`.

### Embedding GlobalBridge in a Pear app (sketch)

```javascript
// Pear shell opens system browser or embedded WebView to:
const setup = new URL("http://127.0.0.1:3000/meeting");
setup.searchParams.set("invite", keetInvite);
setup.searchParams.set("from", userLang);
setup.searchParams.set("to", callLang);
// open(setup.href)
```

For programmatic caption overlay inside Pear, subscribe to the same WebSocket protocol documented in `backend/api/websocket.py` (`caption`, `history`, `pipeline_stats`).

---

## Related docs

- [README.md](../README.md#keet-integration) — user-facing quick start
- [STT.md](STT.md) — speech-to-text routing
- [DEMO.md](DEMO.md) — demo video script
- [GRANT.md](GRANT.md) — milestone **M3**
