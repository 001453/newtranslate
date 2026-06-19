# Katkı rehberi

## Dal koruması

`main` dalına **doğrudan push yasaktır** (yöneticiler dahil). Değişiklikler pull request ile gelir.

1. Fork alın veya yeni dal açın: `git checkout -b feature/kisa-aciklama`
2. Commit atın
3. GitHub'da Pull Request açın
4. İnceleme sonrası merge

## Yerel kurulum

```bash
git clone https://github.com/001453/newtranslate.git
cd newtranslate
npm run setup    # .env + frontend/.env.local oluşturur
npm run dev      # QVAC 8765 + API 8000 + WEB 3000
```

Ayarları `.env` ve `frontend/.env.local` dosyalarından düzenleyin. Bu dosyalar repoya eklenmez.

## Gereksinimler

- Node.js 20+
- Python 3.12+
- Google Chrome (canlı altyazı / sekme sesi için)
- QVAC bridge (qvac-service, port 8765)
