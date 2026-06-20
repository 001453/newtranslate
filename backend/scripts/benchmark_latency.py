#!/usr/bin/env python3
"""Benchmark live STT + translation latency on the current machine."""

from __future__ import annotations

import argparse
import asyncio
import json
import platform
import statistics
import sys
import time
from pathlib import Path

import numpy as np

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

from config import get_settings  # noqa: E402
from services.qvac_client import qvac_client  # noqa: E402
from services.stt import stt_service  # noqa: E402
from services.translation import translation_service  # noqa: E402

SAMPLE_RATE = 16000


def _load_pcm(wav_path: Path | None, duration_ms: int) -> bytes:
    if wav_path and wav_path.is_file():
        try:
            import wave

            with wave.open(str(wav_path), "rb") as wf:
                if wf.getnchannels() != 1:
                    raise ValueError("expected mono wav")
                if wf.getsampwidth() != 2:
                    raise ValueError("expected 16-bit wav")
                if wf.getframerate() != SAMPLE_RATE:
                    raise ValueError(f"expected {SAMPLE_RATE} Hz wav")
                return wf.readframes(wf.getnframes())
        except Exception as exc:
            print(f"Warning: could not read {wav_path}: {exc}", file=sys.stderr)

    samples = int(SAMPLE_RATE * duration_ms / 1000)
    t = np.linspace(0, duration_ms / 1000, samples, dtype=np.float32)
    # Speech-like energy: mixed tones + noise (Whisper may return empty — still measures inference)
    audio = 0.15 * np.sin(2 * np.pi * 180 * t)
    audio += 0.08 * np.sin(2 * np.pi * 340 * t)
    audio += 0.04 * np.random.default_rng(42).standard_normal(samples).astype(np.float32)
    audio = np.clip(audio, -1.0, 1.0)
    pcm = (audio * 32767).astype(np.int16).tobytes()
    return pcm


def _stats_ms(values: list[float]) -> dict[str, float]:
    if not values:
        return {"min_ms": 0, "p50_ms": 0, "p95_ms": 0, "max_ms": 0}
    ordered = sorted(values)
    p95_idx = max(0, min(len(ordered) - 1, int(len(ordered) * 0.95) - 1))
    return {
        "min_ms": round(min(values), 1),
        "p50_ms": round(statistics.median(values), 1),
        "p95_ms": round(ordered[p95_idx], 1),
        "max_ms": round(max(values), 1),
    }


async def _benchmark_stt(pcm: bytes, *, runs: int, language: str) -> dict:
    timings: list[float] = []
    last_text = ""
    for i in range(runs + 1):
        t0 = time.perf_counter()
        result = await stt_service.transcribe_live_chunk(pcm, language=language)
        elapsed = (time.perf_counter() - t0) * 1000
        if i == 0:
            continue  # warmup
        timings.append(elapsed)
        last_text = result.text
    out = _stats_ms(timings)
    out["sample_text"] = last_text[:120]
    out["runs"] = runs
    return out


async def _benchmark_translate(*, runs: int) -> dict:
    sample = "Good morning. Today we will review the quarterly results and next steps."
    timings: list[float] = []
    last = ""
    for i in range(runs + 1):
        t0 = time.perf_counter()
        result = await translation_service.translate_live(sample, "en", "tr")
        elapsed = (time.perf_counter() - t0) * 1000
        if i == 0:
            continue
        timings.append(elapsed)
        last = result.text
    out = _stats_ms(timings)
    out["sample_translation"] = last[:120]
    out["runs"] = runs
    return out


async def main() -> int:
    parser = argparse.ArgumentParser(description="Benchmark GlobalBridge live pipeline latency")
    parser.add_argument("--wav", type=Path, help="Optional mono 16 kHz WAV for STT benchmark")
    parser.add_argument("--duration-ms", type=int, default=2200, help="Synthetic audio length")
    parser.add_argument("--runs", type=int, default=3, help="Timed runs per benchmark (after warmup)")
    parser.add_argument("--json", action="store_true", help="Print machine-readable JSON only")
    args = parser.parse_args()

    settings = get_settings()
    pcm = _load_pcm(args.wav, args.duration_ms)

    qvac_ok = await qvac_client.is_available()

    stt_stats = await _benchmark_stt(pcm, runs=args.runs, language="en")

    translate_stats: dict | None = None
    translate_error: str | None = None
    if qvac_ok:
        try:
            translate_stats = await _benchmark_translate(runs=max(args.runs, 3))
        except Exception as exc:
            translate_error = str(exc)
    else:
        translate_error = "QVAC offline — start with: npm run dev:qvac"

    est_p50 = None
    if translate_stats:
        est_p50 = round(
            settings.live_process_interval_ms + stt_stats["p50_ms"] + translate_stats["p50_ms"],
            1,
        )

    report = {
        "machine": {
            "platform": platform.platform(),
            "processor": platform.processor() or platform.machine(),
            "python": platform.python_version(),
        },
        "config": {
            "whisper_model": settings.whisper_model,
            "whisper_device": settings.whisper_device,
            "whisper_compute_type": settings.whisper_compute_type,
            "whisper_live_beam_size": settings.whisper_live_beam_size,
            "live_window_ms": settings.live_window_ms,
            "live_process_interval_ms": settings.live_process_interval_ms,
            "translation_provider": settings.translation_provider,
            "qvac_available": qvac_ok,
        },
        "stt_live_chunk": stt_stats,
        "translate_en_tr": translate_stats,
        "translate_error": translate_error,
        "estimated_live_caption_ms": {
            "note": "Rough end-to-end = process interval + STT p50 + translate p50",
            "p50_ms": est_p50,
        },
    }

    if args.json:
        print(json.dumps(report, indent=2))
        return 0

    print("GlobalBridge AI — latency benchmark")
    print(f"  Platform: {report['machine']['platform']}")
    print(f"  Whisper:  {settings.whisper_model} ({settings.whisper_device}, {settings.whisper_compute_type})")
    print(f"  QVAC:     {'online' if qvac_ok else 'offline'} ({settings.translation_provider})")
    print()
    print("Live STT chunk (ms):", stt_stats)
    if translate_stats:
        print("Translate en→tr (ms):", translate_stats)
        print("Estimated live caption p50 (ms):", report["estimated_live_caption_ms"]["p50_ms"])
    else:
        print("Translate: skipped —", translate_error)
    print()
    print("Paste results into docs/BENCHMARKS.md or re-run with --json")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
