# Roadmap

Where **GlobalBridge AI** is today and where it is heading.  
Aligned with the [Tether grant milestones](GRANT.md) and community feedback.

---

## Current status (v0.1.5)

| Area | Status |
|------|--------|
| Local Whisper STT | ✅ Working |
| QVAC translation (Sovereign Mode) | ✅ Working |
| Live captions (Chrome tab audio) | ✅ Working |
| Keet meeting subtitles + export | ✅ Working |
| Keet deep links + builder docs | ✅ [KEET_PEARS_INTEGRATION.md](KEET_PEARS_INTEGRATION.md) |
| PDF / DOCX translation | ✅ MVP |
| Electron overlay | ⚠️ Experimental |
| **Desktop launcher (tray)** | ✅ Phase 1 — [`desktop/`](../desktop/) |
| Chrome extension | ✅ MVP — [extension/](../extension/) |
| Desktop installer (Win/Mac) | ✅ Windows NSIS + portable — [releases](https://github.com/001453/newtranslate/releases) |
| Published latency benchmarks | ✅ [BENCHMARKS.md](BENCHMARKS.md) |
| Unified STT router (whisper / QVAC) | ✅ [STT.md](STT.md) |

---

## Short term (0–3 months)

### Developer experience
- [x] GitHub Actions CI (lint + test on PRs)
- [x] CHANGELOG + v0.1.0 release
- [x] Issue / PR templates
- [x] Demo video on [YouTube](https://youtu.be/1cxwP5S7-1A) · [docs/DEMO.md](DEMO.md)
- [x] `docs/BENCHMARKS.md` — CPU-only latency numbers (`npm run benchmark`, grant **M2**)
- [x] Unified QVAC STT path + `docs/STT.md` (grant **M2**)

### Quality & testing
- [x] Backend pytest (health, security, export, text normalize)
- [x] Frontend unit tests (dictation merge)
- [ ] QVAC NMT quality evaluation across low-resource language pairs
- [ ] Basic frontend e2e (Playwright)

### Distribution *(Phase 1 — in progress)*
- [x] Desktop tray launcher — `npm run desktop` ([desktop/](../desktop/))
- [x] GitHub Releases with Windows `.exe` installer — [USER_INSTALL.md](USER_INSTALL.md) · [v0.1.5+](https://github.com/001453/newtranslate/releases)
- [ ] Chrome Web Store publish — submitted, pending review
- [ ] Model download on first run (small installer, ~150 MB)
- [ ] WinGet / Homebrew cask manifests
- [x] Chrome extension MVP — live overlay via local API ([extension/](../extension/), grant **M4**)

---

## Grant milestones (Tether — $7,500 USD₮)

| ID | Deliverable | Target |
|----|-------------|--------|
| **M1** | Demo video + setup guide + egress checklist | +30 days |
| **M2** | QVAC hardening + latency benchmarks | +60 days |
| **M3** | Pear / Keet integration v2 + builder docs | +75 days | In progress |
| **M4** | Chrome extension MVP (`extension/`) | +90 days | ✅ MVP |

Details: [GRANT.md](GRANT.md)

---

## Medium term (3–6 months)

| Feature | Why |
|---------|-----|
| **Speaker diarization** | “Who said what” in meeting transcripts |
| **VAD segmentation** | Cleaner long-form captions, fewer duplicate lines |
| **Glossary v2** | User-defined terms for consistent technical / brand translation |
| **Firefox / Edge tab capture** | Research WebRTC / capture API differences (Chrome-only today) |
| **GitHub Pages docs site** | Public landing + quick start for grant reviewers |
| **Mobile LAN subtitle receiver** | Phone as second-screen captions on same network |

---

## Long term (6–12 months)

- Electron system-wide overlay (Zoom / Meet / Teams without tab share)
- Optional WDK integration for paid translation sessions
- Pear SDK deep integration (beyond tab-audio bridge)
- Community language pack contributions

---

## Non-goals (for now)

- **Cloud-first mode as default** — conflicts with Sovereign Mode positioning
- **Mobile-native STT on device** — out of scope until desktop pipeline is benchmarked
- **Mac App Store / Microsoft Store** — high friction for local AI; prefer GitHub Releases + package managers first

---

## How to influence the roadmap

1. ⭐ Star the repo — helps discovery for grant reviewers and contributors  
2. Open a [Feature request](https://github.com/001453/newtranslate/issues/new?template=feature_request.yml)  
3. Join [GitHub Discussions](https://github.com/001453/newtranslate/discussions) *(enable in repo settings)*  
4. Submit a PR — see [CONTRIBUTING.md](../CONTRIBUTING.md)

---

## Performance targets (to be measured)

| Metric | Target | Measured |
|--------|--------|----------|
| STT latency | 300–800 ms | ~964 ms (base+int8, CPU) |
| Translation latency | 500–1200 ms | ~111 ms (Bergamot en→tr) |
| End-to-end (live) | ≤ 2 s | ~1.9 s p50 ✓ |
| CPU-only (distil-large-v3) | Usable on 8 GB RAM | TBD |

Results will be published in `docs/BENCHMARKS.md` as part of grant **M2**.
