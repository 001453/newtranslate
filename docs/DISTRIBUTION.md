# Distribution — Desktop & Chrome Web Store

How to ship **GlobalBridge AI** so non-developers can install and use it.

---

## Phase 1 (current): Desktop launcher + extension zip

| Channel | Artifact | Audience |
|---------|----------|----------|
| **GitHub Releases** | `GlobalBridge-AI-0.1.5-setup.exe` (NSIS) + `-portable.exe` | Windows users |
| **Chrome Web Store** | `dist/GlobalBridge-Extension-v0.1.1.zip` | Chrome users (still need local backend) |
| **Repo** | `extension/` load unpacked | Developers |

---

## Build Windows installer

**Requirements:** Node 20+ (build only). End users on Windows need **no separate Python install** — runtime is bundled.

```bash
# From repo root
npm run desktop:build
```

Output: `desktop/dist/`

- `GlobalBridge-AI-0.1.5-setup.exe` — NSIS installer (Start Menu + desktop shortcut)
- `GlobalBridge-AI-0.1.5-portable.exe` — portable

### Publish to GitHub Releases

```bash
git tag v0.1.6
git push origin v0.1.6
```

CI (`.github/workflows/release.yml`) attaches:

- `GlobalBridge-AI-*-setup.exe` — NSIS installer
- `GlobalBridge-AI-*-portable.exe` — portable
- `GlobalBridge-Extension-v0.1.1.zip` — Chrome Web Store upload

Or build locally on Windows:

```bash
npm run desktop:build
npm run extension:zip
```

---

## Run desktop app (development)

```bash
npm run setup          # once
npm run desktop        # tray launcher — auto-starts services when ready
```

Tray menu: Open app · Start/Stop · Setup wizard · Chrome extension guide.

---

## Chrome Web Store

### 1. Package extension

```bash
npm run extension:zip
```

Upload `dist/GlobalBridge-Extension-v0.1.1.zip` to the [Developer Dashboard](https://chrome.google.com/webstore/devconsole).

**Full walkthrough:** [docs/CHROME_WEB_STORE.md](CHROME_WEB_STORE.md)  
**Privacy policy URL:** https://001453.github.io/newtranslate/privacy.html

**One-time fee:** $5 Chrome Web Store developer registration.

### 2. Listing copy (short)

**Name:** GlobalBridge Live Captions  
**Summary:** Sovereign live subtitles from tab audio — local Whisper + QVAC (localhost only).  
**Description:** Requires [GlobalBridge AI](https://github.com/001453/newtranslate) running on your PC. No cloud audio upload in Sovereign Mode.

### 3. Permissions justification (review)

| Permission | Justification |
|------------|---------------|
| `tabCapture` | Capture tab audio for local speech-to-text |
| `host_permissions` localhost:8000 | Connect only to user's local GlobalBridge API |
| `<all_urls>` content script | Render caption overlay on active tab |

### 4. Privacy policy

Link: https://001453.github.io/newtranslate/privacy.html (required for Web Store submission)

State clearly: **No audio or transcripts are sent to GlobalBridge servers** — processing is localhost only.

### 5. Store + desktop together

Recommended user flow:

1. Install **GlobalBridge AI** desktop app (GitHub Release)
2. Complete **First-time setup** in tray wizard (Python venv + models)
3. Install **Chrome extension** from [Chrome Web Store](https://chromewebstore.google.com/detail/fpfojfkkilokgjbjphgdlcckoffekibi) (or Load unpacked for dev)
4. Start captions on any tab

---

## Microsoft Store (Phase 2)

Not in Phase 1. NSIS + GitHub Releases first. MS Store requires MSIX packaging and local AI policy review — plan after Windows installer stabilizes.

---

## macOS (Phase 3)

`electron-builder` mac target + notarization. Same tray launcher pattern.

---

## Checklist before public launch

- [ ] GitHub Release with signed installer (optional: code signing cert)
- [ ] Chrome Web Store listing live
- [ ] README “Download for Windows” section
- [ ] Demo video shows desktop + extension flow
- [ ] Privacy policy URL reachable

---

## Related

- [extension/README.md](../extension/README.md)
- [ROADMAP.md](ROADMAP.md)
- [GRANT.md](GRANT.md)
