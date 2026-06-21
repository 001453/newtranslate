#!/usr/bin/env python3
"""Resize screenshots to Chrome Web Store size (1280x800, 24-bit PNG)."""
from __future__ import annotations

import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Install: pip install Pillow")
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "extension" / "store" / "screenshots" / "source"
OUT = ROOT / "extension" / "store" / "screenshots"
TARGET = (1280, 800)
BG = (11, 15, 20)  # #0b0f14


def fit_canvas(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    img = img.convert("RGB")
    tw, th = size
    canvas = Image.new("RGB", size, BG)
    scale = min(tw / img.width, th / img.height)
    nw, nh = max(1, int(img.width * scale)), max(1, int(img.height * scale))
    resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
    x = (tw - nw) // 2
    y = (th - nh) // 2
    canvas.paste(resized, (x, y))
    return canvas


def process(path: Path, index: int) -> Path:
    img = Image.open(path)
    out = OUT / f"store-screenshot-{index:02d}-1280x800.png"
    fit_canvas(img, TARGET).save(out, format="PNG", optimize=True)
    print(f"  {path.name} -> {out.name} ({out.stat().st_size // 1024} KB)")
    return out


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    SOURCE.mkdir(parents=True, exist_ok=True)

    sources = sorted(
        [*SOURCE.glob("*.png"), *SOURCE.glob("*.jpg"), *SOURCE.glob("*.jpeg")],
        key=lambda p: p.name,
    )
    if not sources:
        print(f"No images in {SOURCE}")
        print("Drop PNG/JPG files there and re-run.")
        return 1

    print(f"Resizing {len(sources)} image(s) to {TARGET[0]}x{TARGET[1]}...")
    for i, src in enumerate(sources, 1):
        process(src, i)
    print(f"\nDone -> {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
