# Speech-to-text architecture (M2)

GlobalBridge AI keeps **all audio on-device**. Two local STT engines are available; one router picks which runs per request.

## Engines

| Engine | Process | Model | Default |
|--------|---------|-------|---------|
| **faster-whisper** | Python backend (`backend/services/stt.py`) | `WHISPER_MODEL` (e.g. `base`, `large-v3`) | ✅ yes |
| **QVAC whisper.cpp** | Node bridge (`qvac-service/server.js`) | `QVAC_WHISPER_MODEL` (`WHISPER_BASE_Q8_0`, `WHISPER_TINY_Q8_0`) | optional |

Both accept **mono int16 PCM @ 16 kHz**. The QVAC bridge wraps PCM as WAV before calling `@qvac/sdk` `transcribe()`.

## Routing (`STT_PROVIDER`)

Set in `.env`:

```env
STT_PROVIDER=whisper   # default — faster-whisper only
STT_PROVIDER=qvac      # QVAC whisper.cpp when bridge is up; else fallback
STT_PROVIDER=auto      # prefer QVAC when bridge healthy; else faster-whisper
```

The facade `STTService` (`stt_service`) is used by:

- Live WebSocket pipeline (`live_pipeline.py` → `transcribe_live_chunk`)
- HTTP `POST /api/v1/transcribe` (`mode=dictation|live`)
- Any direct imports of `stt_service`

On QVAC failure the router **falls back to faster-whisper** automatically (logged as warning).

## Endpoints

| Path | Mode | Method |
|------|------|--------|
| `POST /api/v1/transcribe?mode=dictation` | Dictation chunks + optional `prev` context | `transcribe_dictation_chunk` |
| `POST /api/v1/transcribe?mode=live` | Live caption chunks | `transcribe_live_chunk` |
| QVAC `POST /transcribe` | Raw PCM base64 (internal) | whisper.cpp via bridge |

## Privacy

`/api/v1/privacy/status` and `/health` report the **effective** STT provider (`faster-whisper-local` or `qvac-whisper`). Audio never leaves localhost in Sovereign Mode — see [SOVEREIGN_EGRESS_CHECKLIST.md](SOVEREIGN_EGRESS_CHECKLIST.md).

## Benchmarks

Run `npm run benchmark` from the repo root. Results and methodology: [BENCHMARKS.md](BENCHMARKS.md).

To compare QVAC STT latency, start the bridge (`npm run dev:qvac`) and set `STT_PROVIDER=qvac` before benchmarking.
