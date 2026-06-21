#!/usr/bin/env python3
"""Generate Chrome Web Store promo tiles (440x280, 1400x560)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ICON = ROOT / "extension" / "icons" / "icon128.png"
OUT = ROOT / "extension" / "store" / "promo"
OUT.mkdir(parents=True, exist_ok=True)

BG = (11, 15, 20)
BG2 = (18, 26, 36)
ACCENT = (110, 231, 183)
TEXT = (232, 238, 245)
MUTED = (139, 156, 179)
BLUE = (59, 130, 246)


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def gradient_bg(w: int, h: int) -> Image.Image:
    img = Image.new("RGB", (w, h), BG)
    draw = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(h - 1, 1)
        r = int(BG[0] + (BG2[0] - BG[0]) * t * 0.6)
        g = int(BG[1] + (BG2[1] - BG[1]) * t * 0.6)
        b = int(BG[2] + (BG2[2] - BG[2]) * t * 0.6)
        draw.line([(0, y), (w, y)], fill=(r, g, b))
    return img


def paste_icon(base: Image.Image, x: int, y: int, size: int) -> None:
    if not ICON.exists():
        return
    icon = Image.open(ICON).convert("RGBA")
    icon = icon.resize((size, size), Image.Resampling.LANCZOS)
    base.paste(icon, (x, y), icon)


def draw_badge(draw: ImageDraw.ImageDraw, x: int, y: int, text: str, font) -> None:
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    pad_x, pad_y = 10, 5
    draw.rounded_rectangle(
        (x, y, x + tw + pad_x * 2, y + th + pad_y * 2),
        radius=8,
        fill=(30, 58, 48),
        outline=ACCENT,
        width=1,
    )
    draw.text((x + pad_x, y + pad_y - 1), text, fill=ACCENT, font=font)


def make_small() -> Path:
    w, h = 440, 280
    img = gradient_bg(w, h)
    draw = ImageDraw.Draw(img)
    paste_icon(img, 24, 24, 56)

    title = load_font(22, bold=True)
    sub = load_font(13)
    tag = load_font(11, bold=True)

    draw.text((92, 28), "GlobalBridge", fill=TEXT, font=title)
    draw.text((92, 54), "Live Captions", fill=ACCENT, font=title)
    draw.text((24, 96), "Sovereign subtitles on any tab", fill=MUTED, font=sub)
    draw.text((24, 118), "Local Whisper + QVAC · localhost only", fill=MUTED, font=sub)

    draw_badge(draw, 24, 152, "YouTube · Meet · Keet", tag)
    draw_badge(draw, 208, 152, "No cloud by default", tag)

    draw.rounded_rectangle((24, 210, 416, 256), radius=10, fill=(25, 35, 48), outline=BLUE, width=1)
    draw.text((36, 224), "Requires GlobalBridge on your PC", fill=TEXT, font=sub)

    out = OUT / "promo-small-440x280.png"
    img.save(out, format="PNG", optimize=True)
    return out


def make_marquee() -> Path:
    w, h = 1400, 560
    img = gradient_bg(w, h)
    draw = ImageDraw.Draw(img)

    # accent strip
    draw.rectangle((0, 0, w, 6), fill=ACCENT)

    paste_icon(img, 64, 72, 120)

    title = load_font(56, bold=True)
    sub = load_font(28)
    body = load_font(22)
    tag = load_font(18, bold=True)

    draw.text((210, 78), "GlobalBridge Live Captions", fill=TEXT, font=title)
    draw.text((210, 148), "Real-time subtitles — audio stays on your device", fill=MUTED, font=sub)

    bullets = [
        "Tab audio → local Whisper STT → QVAC translation",
        "Works with YouTube, Google Meet, Zoom, Keet P2P",
        "Companion to open-source GlobalBridge AI (MIT)",
    ]
    y = 220
    for line in bullets:
        draw.ellipse((210, y + 10, 222, y + 22), fill=ACCENT)
        draw.text((236, y), line, fill=TEXT, font=body)
        y += 42

    draw_badge(draw, 210, 360, "Sovereign Mode", tag)
    draw_badge(draw, 380, 360, "127.0.0.1 only", tag)
    draw_badge(draw, 540, 360, "100+ languages", tag)

    # right panel mock
    panel_x, panel_y, panel_w, panel_h = 880, 64, 456, 432
    draw.rounded_rectangle(
        (panel_x, panel_y, panel_x + panel_w, panel_y + panel_h),
        radius=16,
        fill=(16, 22, 30),
        outline=(40, 55, 72),
        width=2,
    )
    draw.text((panel_x + 24, panel_y + 20), "LIVE CAPTION", fill=MUTED, font=tag)
    draw.rounded_rectangle(
        (panel_x + 24, panel_y + 56, panel_x + panel_w - 24, panel_y + 140),
        radius=12,
        fill=(8, 12, 18),
        outline=(180, 60, 60),
        width=2,
    )
    cap = load_font(24, bold=True)
    draw.text((panel_x + 40, panel_y + 88), "Merhaba · Hello · subtitles…", fill=TEXT, font=cap)
    draw.text((panel_x + 24, panel_y + 168), "My language: English", fill=MUTED, font=body)
    draw.text((panel_x + 24, panel_y + 204), "Tab language: Türkçe", fill=MUTED, font=body)
    draw.rounded_rectangle(
        (panel_x + 24, panel_y + 260, panel_x + panel_w - 24, panel_y + 320),
        radius=10,
        fill=(5, 120, 90),
    )
    btn = load_font(26, bold=True)
    draw.text((panel_x + 130, panel_y + 278), "Start captions", fill=TEXT, font=btn)

    out = OUT / "promo-marquee-1400x560.png"
    img.save(out, format="PNG", optimize=True)
    return out


def main() -> None:
    small = make_small()
    marquee = make_marquee()
    print(f"OK {small}")
    print(f"OK {marquee}")


if __name__ == "__main__":
    main()
