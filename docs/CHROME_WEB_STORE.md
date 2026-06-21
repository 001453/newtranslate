# Chrome Web Store — submission guide

**Extension zip:** run `npm run extension:zip` → `dist/GlobalBridge-Extension-v0.1.0.zip`  
**Dashboard:** https://chrome.google.com/webstore/devconsole  
**Privacy policy URL (required):** https://001453.github.io/newtranslate/privacy.html

> You must log in with a Google account and pay the **one-time $5** developer registration fee (if not already registered).

---

## Türkçe — adım adım

### 1. Geliştirici hesabı
1. https://chrome.google.com/webstore/devconsole aç
2. Geliştirici kaydı yoksa **$5** öde (tek seferlik)

### 2. Yeni öğe
1. **New item** → `dist/GlobalBridge-Extension-v0.1.0.zip` yükle  
   (veya GitHub Release’ten indir: tag `v0.1.2+`)
2. Manifest doğrulanana kadar bekle

### 3. Store listing — kopyala yapıştır

**Name (45 karakter max):**
```
GlobalBridge Live Captions
```

**Summary (132 karakter max):**
```
Live subtitles from tab audio. Requires GlobalBridge on your PC — local Whisper + QVAC, no cloud upload by default.
```

**Description:**
```
GlobalBridge Live Captions adds sovereign live subtitles on any Chrome tab (YouTube, Google Meet, Zoom, Keet, etc.).

HOW IT WORKS
• Install GlobalBridge AI on your computer (free, open source):
  https://github.com/001453/newtranslate/releases
• Run First-time setup from the desktop tray app (Python 3.11+ required once).
• Install this extension → open a tab with speech → click Start captions.

PRIVACY
• Tab audio is sent only to ws://127.0.0.1:8000 on YOUR machine — not to GlobalBridge servers.
• No accounts, no analytics in the extension.
• Privacy policy: https://001453.github.io/newtranslate/privacy.html

REQUIREMENTS
• GlobalBridge desktop app or `npm run dev` stack running locally (API :8000, QVAC :8765).
• Google Chrome desktop (tab audio capture).

Open source (MIT): https://github.com/001453/newtranslate
Demo: https://youtu.be/1cxwP5S7-1A
```

**Category:** Productivity  
**Language:** English (add Turkish later if desired)

### 4. Privacy practices (dashboard form)

| Question | Answer |
|----------|--------|
| Single purpose | Live caption overlay using locally installed GlobalBridge AI |
| Handles user data? | **Yes** — audio for transcription |
| Data use | Processing on user's local machine only |
| Sold to third parties? | **No** |
| Privacy policy URL | https://001453.github.io/newtranslate/privacy.html |

### 5. Permissions — reviewer notes (paste in “Notes for reviewer”)

```
This extension is a companion to GlobalBridge AI (localhost:8000).

• tabCapture + offscreen: capture tab audio only after user clicks "Start captions".
• host_permissions localhost:8000: WebSocket to user's local FastAPI backend only — no remote hosts.
• content_scripts all_urls: inject caption overlay div only; no page scraping.

Test steps:
1. Clone https://github.com/001453/newtranslate && npm run setup && npm run dev
2. Load extension OR install from this package
3. Open YouTube, click extension → Start captions
4. Verify GET http://127.0.0.1:8000/health returns sovereign mode

No remote server required for review if reviewer runs local stack. Demo video: https://youtu.be/1cxwP5S7-1A
```

### 6. Görseller

| Asset | Boyut | Ne yapmalı |
|-------|-------|------------|
| Icon | 128×128 | `extension/icons/icon128.png` (zip’te var) |
| Screenshots | 1280×800 veya 640×400 | En az 1 — popup + YouTube altyazı ekran görüntüsü |
| Promo tile (opsiyonel) | 440×280 | `extension/store/promo-tile.svg` referans |

**Screenshot ipucu:** `npm run dev` → YouTube aç → extension popup + altyazılı tab — Win+Shift+S

### 7. Yayınla
1. **Submit for review** (ilk inceleme 1–3 gün sürebilir)
2. Onaylanınca **Publish** veya otomatik yayın ayarını seç

---

## English — quick checklist

- [ ] `npm run extension:zip`
- [ ] Privacy page live: https://001453.github.io/newtranslate/privacy.html (push `main` first)
- [ ] Upload zip to Developer Dashboard
- [ ] Paste listing text from above
- [ ] Add ≥1 screenshot
- [ ] Privacy practices + policy URL
- [ ] Notes for reviewer
- [ ] Submit for review

---

## After approval

Add store link to README:

```markdown
[![Chrome Web Store](...)](#) <!-- replace with actual listing URL -->
```

Update [ROADMAP.md](ROADMAP.md) checkbox.

---

## Common rejection fixes

| Issue | Fix |
|-------|-----|
| Missing privacy policy | Use GitHub Pages URL above |
| Permissions too broad | Explain localhost-only in reviewer notes |
| Extension doesn’t work | Reviewer must run local backend — document clearly |
| Misleading description | Always state “Requires GlobalBridge on PC” |

---

## Related

- [DISTRIBUTION.md](DISTRIBUTION.md)
- [extension/README.md](../extension/README.md)
- [extension/store/LISTING.txt](../extension/store/LISTING.txt)
