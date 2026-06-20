"""Meeting transcript export formatting tests."""

from __future__ import annotations

from services.meeting_export import build_meeting_export, format_transcript_srt, format_transcript_txt


def test_format_transcript_txt_includes_speaker_and_translation():
    transcript = [
        {
            "timestamp": 100.0,
            "speaker": "Alice",
            "original": "Hello",
            "translated": "Merhaba",
        },
        {
            "timestamp": 105.0,
            "speaker": "Bob",
            "original": "Thanks",
            "translated": "Teşekkürler",
        },
    ]
    txt = format_transcript_txt(transcript)
    assert "Alice" in txt
    assert "O: Hello" in txt
    assert "T: Merhaba" in txt
    assert "[00:05]" in txt


def test_format_transcript_srt_produces_blocks():
    transcript = [
        {"timestamp": 0.0, "original": "Hi", "translated": "Selam"},
        {"timestamp": 2.5, "original": "Bye", "translated": "Hoşça kal"},
    ]
    srt = format_transcript_srt(transcript)
    assert "1\n" in srt
    assert "00:00:00,000 -->" in srt
    assert "Selam" in srt


def test_build_meeting_export_payload():
    transcript = [{"timestamp": 0.0, "original": "Test", "translated": "Deneme"}]
    export = build_meeting_export(transcript, session_id="sess-1", summary={"title": "Demo"})
    assert export["session_id"] == "sess-1"
    assert export["segment_count"] == 1
    assert "Deneme" in export["txt"]
    assert "Deneme" in export["srt"]
    assert '"session_id": "sess-1"' in export["json"]
    assert export["summary"]["title"] == "Demo"
