# GitHub repository settings (copy-paste)

Use these values in **GitHub → Repository → Settings**.

## About (General → About)

**Description:**

```
Sovereign real-time translation & live captions — Tether QVAC local AI + Keet P2P meetings. Audio stays on-device.
```

**Website** (pick one after Pages is enabled):

```
https://001453.github.io/newtranslate/
```

Fallback until Pages deploys:

```
https://github.com/001453/newtranslate
```

## Topics (add all)

```
qvac
tether
keet
holepunch
whisper
speech-to-text
translation
live-captions
sovereign-ai
local-ai
nextjs
fastapi
p2p
accessibility
real-time-translation
```

## Enable GitHub Discussions

Settings → General → Features → **Discussions** → Enable

Suggested categories:
- **General** — questions and ideas
- **Show and tell** — demos, GIFs, Keet/YouTube setups
- **Q&A** — install / troubleshooting

## Enable GitHub Pages

Settings → Pages → Build and deployment → **GitHub Actions**

The workflow `.github/workflows/pages.yml` deploys `docs/site/` on push to `main`.

## Create v0.1.0 release

After pushing CHANGELOG and CI workflows:

```bash
git tag -a v0.1.0 -m "GlobalBridge AI v0.1.0 — sovereign MVP"
git push origin v0.1.0
```

The `release.yml` workflow creates the GitHub Release from `CHANGELOG.md`.

Or manually: Releases → **Draft a new release** → tag `v0.1.0` → paste the `[0.1.0]` section from CHANGELOG.

## Branch protection

Settings → Branches → `main`:

- Require pull request before merging
- Require status checks: **Frontend**, **Backend**, **i18n key parity**
- Require 1 approval (optional for solo maintainer)
- Block force push

## Social preview

Settings → General → Social preview — upload a screenshot or logo (optional).

## Grant reviewers

- [README.md](../README.md)
- [docs/GRANT.md](../docs/GRANT.md)
- [docs/ROADMAP.md](../docs/ROADMAP.md)
- [Live site](https://001453.github.io/newtranslate/) *(after Pages deploy)*
