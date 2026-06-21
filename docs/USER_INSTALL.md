# Install GlobalBridge — for end users (not developers)

Two parts work together: **desktop app** (translation engine) + **Chrome extension** (tab captions overlay).

---

## Step 1 — Desktop app (required)

1. Download **GlobalBridge AI** for Windows from [GitHub Releases](https://github.com/001453/newtranslate/releases/latest):
   - `GlobalBridge-AI-*-setup.exe` (installer, recommended), or
   - `GlobalBridge-AI-*-portable.exe` (no install)
2. Run the installer → setup wizard opens automatically.
3. **First run** installs AI components (~5–15 min) — Python is **included**, no python.org needed.
4. When ready, the browser opens at http://localhost:3000 (or click **Start services** from the tray).

**Alternative (developers):** `git clone` → `npm run setup` → `npm run dev` or `npm run desktop`.

---

## Step 2 — Chrome extension (recommended for YouTube / Meet)

The extension shows live captions on any tab. It needs Step 1 running on the same PC.

### When Chrome Web Store is live

1. Open the [GlobalBridge Live Captions](https://chromewebstore.google.com/detail/fpfojfkkilokgjbjphgdlcckoffekibi) listing *(available after Google approval)*.
2. Click **Add to Chrome**.
3. Open YouTube or a meeting tab → extension icon → **Start captions**.

### Until Store approval (now)

1. Chrome → `chrome://extensions` → **Developer mode** on.
2. **Load unpacked** → select the `extension/` folder from the repo (or extract from [latest release zip](https://github.com/001453/newtranslate/releases)).
3. Pin **GlobalBridge Live Captions** → **Start captions** on a tab with speech.

---

## Daily use

```
Tray: GlobalBridge running (green / services started)
  → YouTube / Meet / Keet tab open
  → Extension → Start captions
  → Subtitles appear at bottom of tab
```

Or use the web app: http://localhost:3000/live → **Start Bridge** → pick the video/meeting tab.

---

## Requirements

| | |
|---|---|
| OS | Windows 10/11 (Mac/Linux: developer install only for now) |
| Browser | Google Chrome (desktop) |
| RAM | 8 GB+ recommended for Whisper |
| Internet | First setup + model download; captions work offline after |

---

## Privacy

Audio and transcripts stay on your machine in Sovereign Mode. See [privacy policy](https://001453.github.io/newtranslate/privacy.html) and [egress checklist](SOVEREIGN_EGRESS_CHECKLIST.md).

---

## Türkçe — kısa kurulum

1. [GitHub Releases](https://github.com/001453/newtranslate/releases/latest) → **GlobalBridge-AI-*-setup.exe** indir ve kur.
2. İlk açılışta kurulum otomatik başlar (~5–15 dk) — **ayrı Python kurmanıza gerek yok**.
3. Bittiğinde tarayıcı açılır veya tepsi → **Start services**.
4. Chrome extension: Store onayı gelince mağazadan; şimdilik `chrome://extensions` → **Load unpacked** → `extension/` klasörü.
5. YouTube aç → extension → **Start captions**.

Sorun: [README](../README.md#troubleshooting) · [Issues](https://github.com/001453/newtranslate/issues)

---

## Related

- [DISTRIBUTION.md](DISTRIBUTION.md)
- [CHROME_WEB_STORE.md](CHROME_WEB_STORE.md)
- [desktop/README.md](../desktop/README.md)
