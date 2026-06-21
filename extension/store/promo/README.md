# Chrome Web Store — upload assets

## Screenshots (required, 1280×800)

| File | Use |
|------|-----|
| `../screenshots/store-screenshot-01-live-overview-1280x800.png` | Sovereign Mode + setup guide |
| `../screenshots/store-screenshot-02-languages-1280x800.png` | Language controls + Start Bridge |

## Promo tiles (optional)

| File | Size | Store field |
|------|------|-------------|
| `promo-small-440x280.png` | 440×280 | Small promo tile |
| `promo-marquee-1400x560.png` | 1400×560 | Marquee promo tile |

Regenerate promo tiles:

```bash
py -3.12 scripts/generate-store-promo.py
```

Regenerate screenshots (dev server must run):

```bash
npm run dev
node scripts/capture-store-screenshots.mjs
```
