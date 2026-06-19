"""Meeting transcript export (TXT, JSON, SRT)."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any


def _fmt_time(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def format_transcript_txt(transcript: list[dict[str, Any]], title: str = "GlobalBridge AI") -> str:
    lines = [
        title,
        f"Exported: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
        "",
    ]
    t0 = transcript[0]["timestamp"] if transcript else 0.0
    for entry in transcript:
        rel = max(0.0, float(entry.get("timestamp", 0)) - t0)
        mins = int(rel // 60)
        secs = int(rel % 60)
        speaker = entry.get("speaker") or "Speaker"
        original = entry.get("original") or ""
        translated = entry.get("translated") or ""
        lines.append(f"[{mins:02d}:{secs:02d}] {speaker}")
        lines.append(f"  O: {original}")
        if translated and translated != original:
            lines.append(f"  T: {translated}")
        lines.append("")
    return "\n".join(lines).strip() + "\n"


def format_transcript_srt(transcript: list[dict[str, Any]]) -> str:
    if not transcript:
        return ""
    t0 = transcript[0]["timestamp"]
    blocks: list[str] = []
    for i, entry in enumerate(transcript, 1):
        start = max(0.0, float(entry.get("timestamp", t0)) - t0)
        end = start + 4.0
        if i < len(transcript):
            next_ts = float(transcript[i].get("timestamp", t0)) - t0
            if next_ts > start:
                end = min(next_ts, start + 6.0)
        text = entry.get("translated") or entry.get("original") or ""
        if entry.get("original") and entry.get("translated") and entry["original"] != entry["translated"]:
            text = f"{entry['translated']}\n({entry['original']})"
        blocks.append(
            f"{i}\n{_fmt_time(start)} --> {_fmt_time(end)}\n{text}\n"
        )
    return "\n".join(blocks)


def build_meeting_export(
    transcript: list[dict[str, Any]],
    session_id: str,
    summary: dict[str, Any] | None = None,
) -> dict[str, Any]:
    payload = {
        "session_id": session_id,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "segment_count": len(transcript),
        "transcript": transcript,
        "summary": summary or {},
    }
    return {
        "session_id": session_id,
        "segment_count": len(transcript),
        "txt": format_transcript_txt(transcript),
        "srt": format_transcript_srt(transcript),
        "json": json.dumps(payload, ensure_ascii=False, indent=2),
        "summary": summary or {},
    }
