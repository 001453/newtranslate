# GlobalBridge AI — Desktop Launcher (Phase 1)

System tray app for Windows: **one icon** to run setup, start QVAC + API + Web UI, open the app, and install the Chrome extension.

## Quick start (developers)

```bash
# From repo root — once
npm run setup

# Launch tray app
npm run desktop
```

Double-click tray icon → opens browser when services are ready.  
Right-click → Setup wizard · Start/Stop · Extension guide.

## Build installer (Windows)

```bash
npm run desktop:build
```

Output in `desktop/dist/`:

- NSIS setup `.exe` (installer)
- Portable `.exe`

See [docs/DISTRIBUTION.md](../docs/DISTRIBUTION.md) for GitHub Releases + Chrome Web Store.

## Requirements (end users)

- **Windows 10/11** (Phase 1)
- **Python 3.11+** — first-time setup creates backend venv (Windows installer bundles Python)
- **Chrome** — for live caption extension (optional)

Audio and transcripts stay on-device (Sovereign Mode).

## Architecture

```
Tray (Electron)
  → spawn QVAC :8765, FastAPI :8000, Next.js :3000
  → open http://localhost:3000
  → extension guide → extension/ folder
```

## Related

- [extension/README.md](../extension/README.md)
- [docs/DISTRIBUTION.md](../docs/DISTRIBUTION.md)
