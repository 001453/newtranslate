# GlobalBridge AI — Agent durum notu

**Son doğrulama:** 2026-06-18

## Push durumu: EVET

- **Repo (ana):** https://github.com/001453/Globalbridgeai
- **Repo (temiz kopya):** https://github.com/001453/newtranslate
- **Branch:** `main` = `origin/main`
- **Commit:** `a8002f9` — Keet toplantı köprüsü, kişisel ana dil altyazısı, P2P oda bağlantısı
- **Önceki:** `50b7623` — Kurumsal UI v2 (sidebar, sade çeviri ana ekranı, alt sekmeler)

Working tree temiz; `git push origin main` → Everything up-to-date.

## Doğru menü (UI v2) — GitHub'da mevcut

| Öğe | Beklenen |
|-----|----------|
| Footer | **UI v2** |
| Ana sayfa | Sadece `TranslatorPanel compact`, başlık **Yazın veya dikte edin** |
| Sol menü | AppShell: Yardım, Mod (Çeviri, Konuşma, Keet Toplantı, Canlı), Belge |
| Mobil | Alt sekmeler: Çeviri, Konuşma, Canlı, Belge, Menü |
| Eski UI yok | Üstte "Live Caption" / landing kartları yok |

## Sayfalar

- `/` — çeviri
- `/conversation` — konuşma modu
- `/meeting` — Keet P2P (`KeetMeetingBridge`, keetMode)
- `/live` — Zoom/Meet sekmesi yakalama
- `/history`, `/glossary`, `/document`, `/pdf`

## Keet + altyazı

- `viewer_lang`: kullanıcı ana dilinde altyazı (EN konuşan EN, TR konuşan TR görür)
- Backend: `overlay.py`, `websocket.py`

## Eski menü tekrar görünürse (Temp workspace)

Bu **GitHub eksikliği değil**, yerel dosya geri dönüşü:

```powershell
git checkout HEAD -- frontend/src
Remove-Item -Recurse -Force frontend/.next, frontend/node_modules/.cache -ErrorAction SilentlyContinue
# port 3000 kapat, npm run dev
```

Kalıcı çözüm: projeyi Temp dışına klonla, örn. `C:\Users\nihat\Projects\Globalbridgeai`.

## Servisler

```powershell
npm run setup          # ilk kurulum
npm run dev            # hepsi tek terminalde
.\scripts\start-dev.ps1   # Windows: 3 ayrı pencere
```

Manuel:

```powershell
cd qvac-service && node server.js          # 8765
cd backend && .\.venv\Scripts\uvicorn main:app --host 0.0.0.0 --port 8000 --reload
cd frontend && npm run dev                 # 3000
```
