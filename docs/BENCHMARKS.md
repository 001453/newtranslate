# Latency benchmarks (Grant M2)

Published numbers for **live caption** latency on a reference CPU-only setup.  
Reproduce anytime on your machine — no cloud required in Sovereign Mode.

---

## How to run

1. Start QVAC (translation benchmarks need the bridge):

   ```bash
   npm run dev:qvac
   ```

2. In another terminal:

   ```bash
   npm run benchmark
   ```

   JSON output (for CI or copy-paste):

   ```bash
   npm run benchmark:json
   ```

3. Optional: use real speech instead of synthetic audio:

   ```bash
   npm run benchmark -- --wav path/to/mono_16khz.wav
   ```

---

## Methodology

| Step | What we measure |
|------|-----------------|
| **STT** | `transcribe_live_chunk()` on ~2.2 s of 16 kHz mono PCM (same path as `/live` WebSocket) |
| **Translation** | `translate_live()` en→tr via configured provider (QVAC when `TRANSLATION_PROVIDER=qvac`) |
| **End-to-end estimate** | `live_process_interval_ms` + STT p50 + translate p50 |

Each benchmark includes **one warmup run**, then **3 timed runs** (configurable with `--runs`).  
Report **p50** and **p95** in milliseconds.

---

## Reference results

> **Environment:** fill in after running `npm run benchmark` on your hardware.  
> Default developer `.env` uses `WHISPER_MODEL=base`, `WHISPER_DEVICE=cpu`, `WHISPER_COMPUTE_TYPE=int8`.

| Metric | p50 (ms) | p95 (ms) | Notes |
|--------|----------|----------|-------|
| Live STT chunk | _run benchmark_ | _run benchmark_ | Faster-Whisper, live beam |
| QVAC translate en→tr | _run benchmark_ | _run benchmark_ | Bergamot or LLM fallback |
| **Estimated live caption** | _run benchmark_ | — | Interval + STT + NMT |

### Grant target

| Metric | Target |
|--------|--------|
| Live caption end-to-end | ≤ 2 s (documented) |

With `WHISPER_MODEL=base` on CPU, expect **~1.5–4 s** depending on hardware.  
Use `small` or GPU for better accuracy; use `tiny` / `WHISPER_LIVE_BEAM_SIZE=1` for minimum latency.

---

## Model comparison (CPU)

Run separately after changing `.env`:

```env
WHISPER_MODEL=base    # fastest, lower accuracy
WHISPER_MODEL=small   # balanced
WHISPER_MODEL=distil-large-v3   # grant doc reference model
```

Record p50 STT times in this table:

| Model | STT p50 (ms) | STT p95 (ms) | Live caption p50 (ms) |
|-------|--------------|--------------|------------------------|
| base + int8 | | | |
| small + int8 | | | |
| distil-large-v3 + int8 | | | |

---

## Related docs

- [GRANT.md](GRANT.md) — milestone **M2**
- [ROADMAP.md](ROADMAP.md)
- [SOVEREIGN_EGRESS_CHECKLIST.md](SOVEREIGN_EGRESS_CHECKLIST.md)
