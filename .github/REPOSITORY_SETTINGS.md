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

## Enable GitHub Pages (required — fixes deploy error)

The workflow **cannot** deploy until Pages is turned on in the repo settings.  
Error you saw: `Get Pages site failed … Not Found` = Pages not enabled yet.

### Steps (one time)

1. Open **https://github.com/001453/newtranslate/settings/pages**
2. Under **Build and deployment** → **Source**, choose **GitHub Actions**
3. **Do not click "Configure" on "Package a Next.js site"** — that installs a separate Next.js deploy workflow. This repo uses a **static HTML site** in `docs/site/` only.

### Close / remove old or wrong setups

| If you see this | Action |
|-----------------|--------|
| **"Package a Next.js site"** workflow was configured | **Actions** → find workflow like `nextjs.yml` or `Deploy Next.js` → ⋮ → **Delete workflow** |
| **`gh-pages` branch** exists (old branch deploy) | **Settings → Pages** → set Source to **GitHub Actions** (not branch). Optional: delete `gh-pages` branch |
| **Custom domain** field filled incorrectly | Leave empty for default URL, or click **Remove** |
| Failed **GitHub Pages** runs | **Actions → GitHub Pages → Run workflow** on `main` after cleanup |

### Run deploy (correct workflow)

1. **Actions** → workflow named **"GitHub Pages"** (not Next.js)
2. **Run workflow** → branch `main` → **Run workflow**

Or push to `main` — the workflow runs on every push.

### After success

Site URL: **https://001453.github.io/newtranslate/**

Set this as the repo **Website** in Settings → General → About.

Static files live in `docs/site/` (single `index.html` landing page).

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
