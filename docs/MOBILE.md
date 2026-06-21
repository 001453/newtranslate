# GlobalBridge on mobile (Android / iOS)

## Short answer

**Not available today.** GlobalBridge AI is built for **Windows desktop** first. Android/iOS would be a separate product with different constraints.

## Why desktop-first?

| Requirement | Desktop (now) | Mobile (future) |
|-------------|---------------|-----------------|
| Local Whisper STT | ✅ CPU/GPU, 8 GB+ RAM | ⚠️ Heavy; needs ONNX/mobile models |
| QVAC `@qvac/sdk` | ✅ Node sidecar | ❌ No official mobile SDK yet |
| Chrome tab audio capture | ✅ Extension + desktop API | ⚠️ Limited on Android Chrome; iOS Safari differs |
| Sovereign / offline | ✅ Full stack on device | Harder on battery/thermal limits |

The current architecture is:

```
Tab audio → Chrome extension → localhost:8000 → Whisper + QVAC (on PC)
```

Without a PC running the backend, the extension cannot translate.

## What could work later

### Android (most realistic path)

- **Companion app** — Kotlin/React Native shell; optional on-device STT (Whisper.cpp / sherpa-onnx); cloud-free translation via smaller NMT models or synced QVAC when SDK supports mobile.
- **Termux / power users** — clone repo + manual setup (developer-only, not Store-ready).
- **Keet mobile** — meeting subtitles would integrate with Keet Android when Pear/deep-link flow is ready (grant **M3**).

### iOS

- Stricter background + no arbitrary localhost from other apps; likely **Share Extension** or in-app browser capture only.
- App Store review for local AI + microphone policies.

## Chrome extension on phone

- **Android Chrome:** MV3 extensions exist but tab capture and overlay UX differ from desktop; still needs a reachable backend (not `127.0.0.1` on the phone unless the engine runs on the same device).
- **iOS Chrome:** No full extension parity with desktop.

## Roadmap

See [ROADMAP.md](ROADMAP.md) — mobile is **long term**, after Windows installer polish (bundled Python, WinGet, Store) and Chrome Web Store approval.

If you want to experiment on Android today: run the **web UI** against a backend on your home PC (same Wi‑Fi) — not shipped as product yet.
