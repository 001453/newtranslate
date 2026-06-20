"""Live caption / transcript quality gates — drop Whisper noise before UI and export."""

from __future__ import annotations

import re
from collections import Counter

from services.stt import _is_likely_hallucination, _script_flags

_LATIN_HINT_LANGS = frozenset({
    "en", "tr", "de", "fr", "es", "it", "pt", "nl", "pl", "sv", "da", "fi", "no", "ro", "cs", "hu",
})

_GARBAGE_PHRASES = (
    "this type of",
    "the following",
    "partial compatibility",
    "eclipse compatibility",
    "公务员",
    "供图",
    "loadimage",
    "subtitles by",
    "amara.org",
)

_MARKUP_RE = re.compile(r"[>\]\[{|}\\`]")


def _word_tokens(text: str) -> list[str]:
    return [w for w in re.findall(r"[\w\u00c0-\u024f\u1e00-\u1eff]+", text, flags=re.UNICODE) if w]


def _has_repetition_spam(words: list[str]) -> bool:
    if len(words) < 2:
        return False
    counts = Counter(w.lower() for w in words)
    most, n = counts.most_common(1)[0]
    if n >= 3:
        return True
    if n >= 2 and len(most) <= 5 and len(words) <= 5:
        return True
    return False


def _script_mismatch(text: str, language_hint: str | None) -> bool:
    hint = (language_hint or "").split("-")[0].lower()
    if hint not in _LATIN_HINT_LANGS:
        return False
    cjk, arabic, _latin = _script_flags(text)
    if cjk or arabic:
        return True
    cyrillic = sum(1 for ch in text if "\u0400" <= ch <= "\u04ff")
    return cyrillic >= 2


def is_acceptable_caption(
    text: str,
    *,
    language_hint: str | None = None,
    confidence: float = 1.0,
    min_confidence: float = 0.38,
) -> bool:
    """Return False for likely Whisper noise — do not show, store, or summarize."""
    cleaned = (text or "").strip()
    if len(cleaned) < 2:
        return False

    if _is_likely_hallucination(cleaned, confidence, min_confidence):
        return False

    lower = cleaned.lower()
    for phrase in _GARBAGE_PHRASES:
        if phrase in lower or phrase in cleaned:
            return False

    words = _word_tokens(cleaned)
    if _has_repetition_spam(words):
        return False

    if _script_mismatch(cleaned, language_hint):
        return False

    compact = cleaned.replace(" ", "")
    letters = sum(1 for c in compact if c.isalpha())
    if letters < max(3, len(compact) * 0.3):
        return False

    if _MARKUP_RE.search(cleaned) and letters < len(compact) * 0.55:
        return False

    if len(cleaned) < 10 and confidence < 0.55:
        return False

    return True


def filter_transcript_entries(
    entries: list[dict],
    *,
    language_hint: str | None = None,
) -> list[dict]:
    kept: list[dict] = []
    for entry in entries:
        text = (entry.get("original") or entry.get("translated") or "").strip()
        if is_acceptable_caption(text, language_hint=language_hint):
            kept.append(entry)
    return kept


def is_acceptable_summary(text: str) -> bool:
    cleaned = (text or "").strip()
    if len(cleaned) < 24:
        return False
    if not is_acceptable_caption(cleaned, confidence=0.85, min_confidence=0.5):
        return False
    if _MARKUP_RE.search(cleaned):
        return False
    return True
