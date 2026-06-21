# GlobalBridge AI — Mobile (Expo + QVAC)

Local **text translation** on Android and iOS using [@qvac/sdk](https://docs.qvac.tether.io/). No cloud — same sovereign goal as the desktop app.

> **MVP:** translate typed text. Live tab captions and Keet meetings still need **Windows desktop + Chrome extension**.

---

## Requirements

| | |
|---|---|
| Device | **Physical** Android 12+ or iOS 17+ (QVAC does **not** run on emulators) |
| GPU | Vulkan / OpenCL (e.g. Qualcomm Adreno 700+, ARM Mali) |
| Dev PC | Node 20+, Android Studio (for Android) or Xcode (for iOS, macOS only) |
| Expo | SDK 54 — see [QVAC Expo tutorial](https://docs.qvac.tether.io/sdk/tutorials/expo/) |

---

## Quick start (developers)

```bash
# From repo root
cd mobile
npm install
npx expo install expo-file-system expo-build-properties expo-device

# Generate native projects (required for QVAC)
npx expo prebuild

# Connect phone via USB, enable developer mode
npx expo run:android --device
# or (macOS + iPhone)
npx expo run:ios --device
```

From repo root:

```bash
npm run mobile:install   # once
npm run mobile:android   # build & run on device
```

**First launch** downloads QVAC models (hundreds of MB) — keep Wi‑Fi on.

---

## What works (v0.1.0)

- ✅ On-device translation (Bergamot NMT when pair supported, else QVAC LLM)
- ✅ EN ↔ TR and other Bergamot pairs from SDK
- ✅ Dark UI, language swap

## Not yet (roadmap)

- ⏳ Play Store / App Store release (no public APK yet)
- ⏳ Microphone / live speech (QVAC Whisper in-app)
- ⏳ Chrome-style tab overlay (desktop extension only)
- ⏳ Keet meeting deep links

---

## Play Store “download & use”

This folder is the **source app**. Publishing requires:

1. Google Play Developer account ($25 one-time)
2. Signed AAB (`eas build` or local release build)
3. Store listing + privacy policy (link: [privacy.html](../docs/site/privacy.html))

Until then, install via **USB dev build** (`expo run:android --device`) or future CI artifacts.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Emulator crash | Use a **real phone** |
| GPU / Vulkan error | Try a newer device; see [QVAC compatibility matrix](https://docs.qvac.tether.io/installation/) |
| Windows dev | Use WSL or follow [QVAC Expo on Windows notes](https://docs.qvac.tether.io/sdk/tutorials/expo/) |
| Model download slow | Normal on first run; models cache on device |

---

## Architecture

```
App.tsx → src/lib/qvac-engine.ts → @qvac/sdk (Bergamot / LLM on GPU)
```

Same QVAC stack as `qvac-service/` on desktop, but runs **inside** the Expo app (no Node sidecar).

See also: [docs/MOBILE.md](../docs/MOBILE.md)
