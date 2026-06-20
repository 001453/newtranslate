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
    "blackberry",
    "json scrape",
    "$json",
)

_MARKUP_RE = re.compile(r"[>\]\[{|}\\`$]")
_CODE_TOKEN_RE = re.compile(r"\b(json|scrape|screens|blackberry|mhz)\b", re.I)
_LATIN_RUN_RE = re.compile(
    r"[A-Za-zÀ-ÖØ-öø-ÿĀ-žĞğİıÖöŞşÜü][A-Za-zÀ-ÖØ-öø-ÿĀ-žĞğİıÖöŞşÜü\s,\'’\-]{8,}",
)


def _word_tokens(text: str) -> list[str]:
    return [w for w in re.findall(r"[\w\u00c0-\u024f\u1e00-\u1eff]+", text, flags=re.UNICODE) if w]


def _char_script(ch: str) -> str:
    o = ord(ch)
    if o < 128 and ch.isalpha():
        return "latin"
    if "\u00c0" <= ch <= "\u024f" or ch in "ğüşöçıİĞÜŞÖÇ":
        return "latin"
    if "\u0400" <= ch <= "\u04ff":
        return "cyrillic"
    if "\u4e00" <= ch <= "\u9fff" or "\u3040" <= ch <= "\u30ff" or "\uac00" <= ch <= "\ud7af":
        return "cjk"
    if "\u0600" <= ch <= "\u06ff":
        return "arabic"
    if ch.isalpha():
        return "other"
    return "other"


def _is_script_salad(text: str) -> bool:
    """Multiple writing systems in one phrase → almost always Whisper noise."""
    counts: Counter[str] = Counter()
    for ch in text:
        if ch.isspace() or not ch.isalpha():
            continue
        counts[_char_script(ch)] += 1
    total = sum(counts.values())
    if total < 6:
        return False
    latin = counts.get("latin", 0) / total
    exotic = sum(counts.get(s, 0) for s in ("cjk", "arabic", "cyrillic", "other")) / total
    exotic_scripts = sum(1 for s in ("cjk", "arabic", "cyrillic", "other") if counts.get(s, 0) >= 2)
    if exotic_scripts >= 2:
        return True
    if exotic >= 0.12 and latin >= 0.2:
        return True
    if exotic >= 0.35:
        return True
    return False


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
    if _is_script_salad(text):
        return True
    hint = (language_hint or "").split("-")[0].lower()
    if hint and hint not in _LATIN_HINT_LANGS:
        return False
    cjk, arabic, _latin = _script_flags(text)
    if cjk or arabic:
        return True
    cyrillic = sum(1 for ch in text if "\u0400" <= ch <= "\u04ff")
    return cyrillic >= 2


def _has_code_garbage(text: str) -> bool:
    if "$" in text:
        return True
    if _CODE_TOKEN_RE.search(text) and _is_script_salad(text):
        return True
    if _MARKUP_RE.search(text):
        letters = sum(1 for c in text if c.isalpha())
        if letters < len(text.replace(" ", "")) * 0.45:
            return True
    return False


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

    if _has_code_garbage(cleaned):
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

    if len(cleaned) < 10 and confidence < 0.55:
        return False

    return True


def sanitize_caption_text(
    text: str,
    *,
    language_hint: str | None = None,
    confidence: float = 1.0,
) -> str:
    """
    Drop noise or salvage a clean clause when Whisper prepends garbage
    (e.g. script salad + real Turkish at the end).
    """
    cleaned = (text or "").strip()
    if not cleaned:
        return ""
    if is_acceptable_caption(cleaned, language_hint=language_hint, confidence=confidence):
        return cleaned

    hint = language_hint or "tr"
    parts = re.split(r"[.!?\n]+", cleaned)
    good = [
        p.strip()
        for p in parts
        if p.strip() and is_acceptable_caption(p.strip(), language_hint=hint, confidence=confidence)
    ]
    if good:
        return good[-1]

    for run in reversed(_LATIN_RUN_RE.findall(cleaned)):
        run = run.strip()
        if len(run) >= 12 and is_acceptable_caption(run, language_hint=hint, confidence=confidence):
            return run

    words = cleaned.split()
    for i in range(len(words)):
        candidate = " ".join(words[i:]).strip()
        if len(candidate) >= 12 and is_acceptable_caption(candidate, language_hint=hint, confidence=confidence):
            return candidate
    return ""


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
