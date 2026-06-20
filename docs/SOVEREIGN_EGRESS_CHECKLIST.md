# Sovereign Mode — data egress checklist

Use this checklist to verify that **no audio, transcript, or document content** is sent to third-party APIs when Sovereign Mode is enabled.

**Grant M1 deliverable** — auditors and grant reviewers can follow these steps on a clean install.

---

## Required configuration

Set in `.env` (see [.env.example](../.env.example)):

```env
LOCAL_PROCESSING_ONLY=true
TRANSLATION_PROVIDER=qvac
ALLOW_CLOUD_FALLBACK=false
QVAC_BRIDGE_URL=http://127.0.0.1:8765
TOGETHER_API_KEY=
DEEPL_API_KEY=
ELEVENLABS_API_KEY=
API_BIND_HOST=127.0.0.1
```

Frontend (`frontend/.env.local`):

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/api/v1/ws/live
```

---

## Component egress matrix

| Component | Runs on | External network calls (Sovereign Mode) |
|-----------|---------|----------------------------------------|
| **Faster-Whisper STT** | localhost:8000 | **None** — models from Hugging Face cache on first run only |
| **QVAC bridge** | localhost:8765 | **None** — `@qvac/sdk` local inference |
| **FastAPI backend** | 127.0.0.1:8000 | **None** for STT/translate when QVAC up |
| **Next.js UI** | localhost:3000 | **None** for core flows — calls local API only |
| **WebSocket live pipeline** | ws://localhost:8000 | **None** — audio PCM stays on machine |
| **SQLite glossary/history** | `backend/data/` | **None** |
| **Meeting export** | Browser download | **None** — files generated client-side from API response |
| **Together AI** | — | **Disabled** when `ALLOW_CLOUD_FALLBACK=false` |
| **DeepL / ElevenLabs** | — | **Disabled** — empty API keys |

---

## Verification steps

### 1. Health endpoint

```bash
curl http://127.0.0.1:8000/health
```

Expect:

- `"privacy_mode"` indicating sovereign/local processing  
- `"qvac_available": true` when QVAC is running  
- `"data_egress"` list empty or documented local-only entries  

### 2. Network monitor (optional, strong proof for demo video)

While recording or testing:

1. Open **Windows Resource Monitor** or **Wireshark** on loopback  
2. Run live captions for 2 minutes  
3. Confirm **no HTTPS** to `api.together.xyz`, `api.deepl.com`, OpenAI, Google Speech, etc.  
4. Allowed: initial model download to `huggingface.co` (one-time, not live session audio)

### 3. Offline test (airplane mode after setup)

1. Complete `npm run setup` and first Whisper/QVAC model load **while online**  
2. Enable airplane mode (or block outbound firewall)  
3. Run dictation + live captions on cached content  
4. **Expected:** STT + QVAC translation still work; only model updates fail  

### 4. Code paths (audit)

| Path | File | Cloud fallback |
|------|------|----------------|
| Translation router | `backend/services/translation.py` | Blocked when sovereign |
| Privacy service | `backend/services/privacy.py` | Enforces mode |
| STT HTTP | `backend/api/stt.py` | Always local Whisper |
| Live WS | `backend/api/websocket.py` | Local pipeline only |

---

## Intentional egress (not Sovereign Mode)

These occur only if the operator **opts in**:

| Action | Trigger |
|--------|---------|
| Cloud translation | `ALLOW_CLOUD_FALLBACK=true` + `TOGETHER_API_KEY` set |
| LAN exposure | `API_BIND_HOST=0.0.0.0` (use `API_KEY`) |
| Model download | First run / model change — Hugging Face, QVAC model packs |

---

## PDF / document uploads

- Files saved to `backend/data/uploads/` locally  
- Processed by local QVAC + PyMuPDF path in Sovereign Mode  
- **No upload to cloud** unless cloud fallback enabled  

---

## Sign-off (for grant / audit)

| Check | Pass |
|-------|------|
| `.env` matches Sovereign defaults | ☐ |
| `/health` shows local privacy mode | ☐ |
| Live session: no third-party API traffic | ☐ |
| Export files contain only session data | ☐ |
| Demo video shows privacy banner / config | ☐ |

**Reviewer:** _______________  
**Date:** _______________  
**GlobalBridge version:** v0.1.0  

---

See also: [SECURITY.md](SECURITY.md) · [GRANT.md](GRANT.md) · [Demo video guide](DEMO_VIDEO.md)
