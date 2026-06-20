"""Caption quality filter tests."""

from __future__ import annotations

from services.caption_quality import (
    is_acceptable_caption,
    is_acceptable_summary,
    sanitize_caption_text,
)


def test_rejects_repeated_word_spam():
    assert not is_acceptable_caption("Özel, Özel, Özel, Öl i günü", language_hint="tr", confidence=0.9)


def test_rejects_mixed_script_garbage():
    text = "patial公务员 eclipsepatibilityợ筼"
    assert not is_acceptable_caption(text, language_hint="en", confidence=0.9)


def test_rejects_user_reported_script_salad():
    text = (
        "dre pneumقدideooleysov毕p$json scrapeátis赫BFR BlackBerry逅клон治安"
        "świadcutory是非 EHzielorde adeuginimargnoreornakah honoredularessgencyatteringonnerod主动zzo"
        "   арат拉gilM她们 scor $ ixcreens版"
    )
    assert not is_acceptable_caption(text, language_hint="tr", confidence=0.9)


def test_salvages_trailing_turkish_from_noisy_chunk():
    noisy = (
        "dre pneumقدideooleysov毕p$json scrape BlackBerry"
        " Arkadaşlar size bugün gelen bu"
    )
    assert sanitize_caption_text(noisy, language_hint="tr", confidence=0.85) == "Arkadaşlar size bugün gelen bu"


def test_accepts_normal_turkish():
    assert is_acceptable_caption("Merhaba, bugün toplantıya hoş geldiniz.", language_hint="tr", confidence=0.85)


def test_accepts_normal_english():
    assert is_acceptable_caption("Can we schedule the meeting for tomorrow?", language_hint="en", confidence=0.85)


def test_rejects_garbage_summary():
    bad = "pekt]>iative供图host much everyoneстранvides状"
    assert not is_acceptable_summary(bad)


def test_accepts_plain_summary():
    good = "The team agreed to review the proposal next week and follow up by email."
    assert is_acceptable_summary(good)
