# Contributing to GlobalBridge AI

## Branch protection

Direct pushes to `main` are **not allowed** (including admins). All changes go through pull requests.

1. Fork or create a branch: `git checkout -b feature/short-description`
2. Commit your changes
3. Open a Pull Request on GitHub
4. Merge after review

## Local setup

```bash
git clone https://github.com/001453/newtranslate.git
cd newtranslate
npm run setup    # .env + frontend/.env.local + Python venv + npm deps
npm run dev      # QVAC :8765 + API :8000 + Web :3000
```

Edit `.env` and `frontend/.env.local` for your machine — these files are gitignored.

## Requirements

- Node.js 20+
- Python 3.12+
- Google Chrome (tab audio / live captions)
- QVAC bridge running (`qvac-service`, port 8765)

## Code guidelines

- Keep Sovereign Mode as the default path — no required cloud APIs.
- Document new env vars in `.env.example`.
- UI strings: add both `en.ts` and `tr.ts` under `frontend/src/lib/i18n/` (product UI stays bilingual; repo docs stay English).
