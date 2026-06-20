# Roadmap

Where **GlobalBridge AI** is today and where it is heading.  
Aligned with the [Tether grant milestones](GRANT.md) and community feedback.

---

## Current status (v0.1.0)

| Area | Status |
|------|--------|
| Local Whisper STT | ✅ Working |
| QVAC translation (Sovereign Mode) | ✅ Working |
| Live captions (Chrome tab audio) | ✅ Working |
| Keet meeting subtitles + export | ✅ Working |
| PDF / DOCX translation | ✅ MVP |
| Electron overlay | ⚠️ Experimental |
| Chrome extension | ❌ Not yet |
| Desktop installer (Win/Mac) | ❌ Not yet |
| Published latency benchmarks | ❌ Not yet |

---

## Short term (0–3 months)

### Developer experience
- [x] GitHub Actions CI (lint + test on PRs)
- [x] CHANGELOG + v0.1.0 release
- [x] Issue / PR templates
- [ ] Demo video published on [docs/DEMO.md](DEMO.md) (`npm run demo:url`)
- [ ] `docs/BENCHMARKS.md` — CPU-only `distil-large-v3` latency numbers (grant **M2**)

### Quality & testing
- [x] Backend pytest (health, security, export, text normalize)
- [x] Frontend unit tests (dictation merge)
- [ ] QVAC NMT quality evaluation across low-resource language pairs
- [ ] Basic frontend e2e (Playwright)

### Distribution *(from packaging plan — next phase)*
- [ ] GitHub Releases with signed Windows `.exe` installer
- [ ] Model download on first run (small installer, ~150 MB)
- [ ] WinGet / Homebrew cask manifests
- [ ] Chrome Web Store extension connecting to local API (grant **M4**)

---

## Grant milestones (Tether — $7,500 USD₮)

| ID | Deliverable | Target |
|----|-------------|--------|
| **M1** | Demo video + setup guide + egress checklist | +30 days |
| **M2** | QVAC hardening + latency benchmarks | +60 days |
| **M3** | Pear / Keet integration v2 + builder docs | +75 days |
| **M4** | Chrome extension MVP (`extension/`) | +90 days |

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
| STT latency | 300–800 ms | TBD |
| Translation latency | 500–1200 ms | TBD |
| End-to-end (live) | ≤ 2 s | TBD |
| CPU-only (distil-large-v3) | Usable on 8 GB RAM | TBD |

Results will be published in `docs/BENCHMARKS.md` as part of grant **M2**.
