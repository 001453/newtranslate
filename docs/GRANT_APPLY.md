# Tether grant — submission walkthrough (Step 1)

**Apply at:** https://tether.dev → **Apply for a grant** (top of page)

> This is a **custom milestone proposal** ($7,500 USD₮), not one of the fixed bounties (WDK, Browser Extension Starter, etc.). Paste the fields below into the general grant form.

Full technical proposal: [GRANT.md](GRANT.md)

---

## Pre-flight (all ready ✓)

| Item | URL / status |
|------|----------------|
| Public repo | https://github.com/001453/newtranslate |
| Demo video | https://youtu.be/1cxwP5S7-1A |
| Project site | https://001453.github.io/newtranslate/ |
| Grant doc | https://github.com/001453/newtranslate/blob/main/docs/GRANT.md |
| Egress checklist | https://github.com/001453/newtranslate/blob/main/docs/SOVEREIGN_EGRESS_CHECKLIST.md |
| Latency benchmarks | https://github.com/001453/newtranslate/blob/main/docs/BENCHMARKS.md (~1.9 s p50) |
| CI | https://github.com/001453/newtranslate/actions |

---

## Form fields — copy & paste

### Project title

```
GlobalBridge AI — Sovereign Live Translation with QVAC + Keet P2P
```

### Short description (≤ 280 characters)

```
Open-source app: local Whisper STT + QVAC @qvac/sdk translation + Keet P2P meeting captions. Zero audio egress in Sovereign Mode. Live subtitles, dictation, meeting export (.txt/.json/.srt). MIT, self-hostable.
```

### Long description / proposal

```
GlobalBridge AI is a sovereign real-time translation bridge. Speech is transcribed locally (Faster-Whisper), translated and summarized via Tether QVAC (@qvac/sdk sidecar on port 8765), and shown as live captions — without sending audio or transcripts to the cloud when Sovereign Mode is enabled.

We integrate with Keet (Holepunch P2P): users run encrypted calls in Keet while GlobalBridge captures tab audio locally and renders personalized subtitles in each participant’s native language (viewer_lang). The same pipeline powers YouTube, Zoom, Meet, and Teams via browser tab capture.

Stack: Python FastAPI, Next.js 15, @qvac/sdk, faster-whisper. Working MVP: https://github.com/001453/newtranslate

Documented CPU benchmark: live caption ~1.9 s p50 (STT + Bergamot en→tr + pipeline interval). See docs/BENCHMARKS.md.

Grant funds ($7,500 USD₮, 4 milestones / ~90 days) deliver: public demo & docs (M1), QVAC hardening + benchmarks (M2), Pear/Keet integration v2 (M3), Chrome extension MVP (M4). Details: docs/GRANT.md
```

### Category (select all that apply)

- New applications powered by Tether’s open tech stack
- Tooling, integrations (QVAC + Pears/Keet)
- Documentation & developer onboarding

### Requested amount

```
7,500 USD₮ (milestone-based — see docs/GRANT.md)
```

### Payment preference

```
USD₮
```

### Links to attach

```
Repository:     https://github.com/001453/newtranslate
Grant proposal: https://github.com/001453/newtranslate/blob/main/docs/GRANT.md
Demo video:     https://youtu.be/1cxwP5S7-1A
Live demo site: https://001453.github.io/newtranslate/
Benchmarks:     https://github.com/001453/newtranslate/blob/main/docs/BENCHMARKS.md
QVAC integration: https://github.com/001453/newtranslate/tree/main/qvac-service
```

### Contact

| Field | Value |
|-------|-------|
| Name | Nihat Cetinkaya |
| Email | nihatcetinkaya077@gmail.com |
| GitHub | https://github.com/001453 |
| Location | Turkey |

---

## After you submit

1. Save confirmation email / ticket ID if the form provides one.
2. Optional: open a GitHub Discussion or Issue titled `Grant application submitted` for your own tracking.
3. **Next:** finish **M3** — Pear SDK spike + meeting bridge improvements.
4. **Distribution:** publish desktop installer (GitHub Release) + Chrome extension (Web Store) — [DISTRIBUTION.md](DISTRIBUTION.md).

### Publish desktop + extension

```bash
# Local build (Windows)
npm run desktop:build
npm run extension:zip

# Or push a version tag — CI builds and attaches to GitHub Release:
git tag v0.1.1
git push origin v0.1.1
```

See [DISTRIBUTION.md](DISTRIBUTION.md) for Chrome Web Store listing copy.

---

## Türkçe — kısa adımlar

1. https://tether.dev aç → üstte **Apply for a grant** (Sabit bounty’lerden değil!)
2. Yukarıdaki **Project title**, **Short description**, **Long description** alanlarını kopyala-yapıştır.
3. Linklere repo + YouTube demo + `docs/GRANT.md` ekle.
4. Tutar: **7,500 USD₮**, ödeme: **USD₮**.
5. İletişim bilgilerini doldur → gönder.
6. Onay ekranını veya e-postayı kaydet.
