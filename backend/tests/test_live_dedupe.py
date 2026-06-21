"""Live pipeline dedupe tests."""

from __future__ import annotations

from services.live_pipeline import _collapse_word_repeat, _is_duplicate_transcript


def test_duplicate_merhaba():
    assert _is_duplicate_transcript("Merhaba.", "merhaba")


def test_duplicate_same_short_word():
    assert _is_duplicate_transcript("merhaba", "merhaba")


def test_collapse_merhaba_merhaba():
    assert _collapse_word_repeat("merhaba merhaba") == "merhaba"


def test_not_duplicate_different_phrases():
    assert not _is_duplicate_transcript("merhaba dünya", "merhaba")
