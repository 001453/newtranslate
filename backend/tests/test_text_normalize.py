"""Translation output cleanup tests."""

from __future__ import annotations

from services.text_normalize import clean_translation_output

_THINK = "<" + "think" + ">"
_CLOSE = "</" + "think" + ">"


def test_strips_think_blocks():
    raw = f"{_THINK}internal reasoning{_CLOSE}Final answer"
    assert clean_translation_output(raw) == "Final answer"


def test_strips_translation_prefix():
    assert clean_translation_output("Translation: Merhaba dünya") == "Merhaba dünya"


def test_strips_markdown_fence():
    raw = "```\nMerhaba\n```"
    assert clean_translation_output(raw) == "Merhaba"


def test_empty_input():
    assert clean_translation_output("") == ""
    assert clean_translation_output("   ") == ""
