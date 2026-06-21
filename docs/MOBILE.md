# GlobalBridge on mobile (Android / iOS)

## Status

| | |
|---|---|
| **QVAC SDK** | ✅ Android 12+ / iOS 17+ via Expo |
| **GlobalBridge mobile app** | ✅ **MVP in [`mobile/`](../mobile/)** — text translation on-device |
| **Play Store / App Store** | ❌ Not published yet — dev install via USB |
| **Live tab captions** | ❌ Use Windows desktop + Chrome extension |

---

## Install on your phone (today)

**Not a store download yet.** Developers build from source:

```bash
npm run mobile:install
npm run mobile:prebuild
npm run mobile:android   # physical Android, USB debugging
```

Full guide: **[mobile/README.md](../mobile/README.md)**

First launch downloads QVAC models (~ hundreds of MB). Requires a **real device** (not emulator).

---

## QVAC on mobile (official)

Per [QVAC installation docs](https://docs.qvac.tether.io/installation/):

| Platform | Min version | How |
|----------|-------------|-----|
| **Android** | 12+ (arm64) | Expo + `@qvac/sdk/expo-plugin` |
| **iOS** | 17.0+ (arm64) | Expo + `@qvac/sdk/expo-plugin` |

Tutorial: [Build an Expo app](https://docs.qvac.tether.io/sdk/tutorials/expo/)

---

## Desktop vs mobile

| Feature | Windows desktop | Mobile app (MVP) |
|---------|-----------------|------------------|
| Text translation | ✅ | ✅ |
| Live captions (YouTube/Meet) | ✅ Chrome extension | ⏳ Future |
| Whisper STT | ✅ | ⏳ Future (QVAC Whisper) |
| Keet meetings | ✅ | ⏳ Future |
| One-click store install | GitHub `.exe` | ⏳ Play / App Store |

Desktop stack (Python + Node sidecar) does not run on phones. The mobile app uses **QVAC inside Expo** — same SDK family as `qvac-service/`.

---

## Play Store roadmap

1. Finish MVP (mic / live STT, polish)
2. `eas build` → signed AAB
3. Google Play listing + privacy URL
4. Public “Install” button

---

## Related

- [mobile/README.md](../mobile/README.md) — build & run
- [ROADMAP.md](ROADMAP.md)
- [USER_INSTALL.md](USER_INSTALL.md) — Windows end users
