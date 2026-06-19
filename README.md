# GlobalBridge AI — Kurumsal Çeviri Köprüsü

100+ dil destekleyen çeviri, konuşma, canlı altyazı, Keet toplantı köprüsü ve belge çeviri sistemi.  
Veriler cihazda kalır — QVAC lokal AI + FastAPI backend + Next.js UI v2.

## Depolar

| Repo | Açıklama |
|------|----------|
| [Globalbridgeai](https://github.com/001453/Globalbridgeai) | Ana geliştirme deposu |
| [newtranslate](https://github.com/001453/newtranslate) | Temiz, tek parça kopya (aynı `main` dalı) |

```bash
git clone https://github.com/001453/newtranslate.git
cd newtranslate
```

## Özellikler (UI v2)

| Modül | Route | Açıklama |
|-------|-------|----------|
| **Çeviri** | `/` | Yazı + mikrofon dikte, otomatik çeviri, geçmiş |
| **Konuşma** | `/conversation` | İki yönlü konuşma modu |
| **Keet Toplantı** | `/meeting` | P2P Keet odası, kişisel ana dil altyazısı |
| **Canlı Altyazı** | `/live` | Zoom/Meet/Teams sekmesi veya mikrofon yakalama |
| **Belge** | `/document` | Metin/dosya çevirisi |
| **PDF** | `/pdf` | PDF/DOCX çeviri, layout koruma |
| **Sözlük** | `/glossary` | Şirket/teknik terim sözlüğü |
| **Geçmiş** | `/history` | Oturum geçmişi |

**Arayüz:** Sol sidebar (masaüstü) + alt sekmeler (mobil), footer'da **UI v2** etiketi.

### Keet + kişisel altyazı

- Kullanıcı **Benim ana dilim** ve **Karşı taraf dili** seçer.
- Her katılımcı altyazıyı kendi ana dilinde görür (ör. İngilizce konuşan EN, Türkçe konuşan TR).
- Backend `viewer_lang` ile çeviri hedefini kişiselleştirir.

## QVAC — Veriler Cihazda Kalır

[QVAC](https://qvac.tether.io/) (Tether) tamamen **lokal, merkeziyetsiz AI** sağlar:

| Bileşen | Sovereign Mode | Cloud Mode |
|---------|----------------|------------|
| STT (ses) | Faster-Whisper lokal | Lokal |
| Çeviri | QVAC `@qvac/sdk` lokal | Together AI (bulut) |
| PDF | QVAC + PyMuPDF lokal | Together AI |
| Özet | QVAC lokal | Together AI |

**Sovereign Mode** (`LOCAL_PROCESSING_ONLY=true`): Hiçbir konuşma, transkript veya dosya buluta gitmez.

```
Mikrofon / Sekme Sesi
    → WebSocket /api/v1/ws/live
    → Faster-Whisper STT
    → QVAC çeviri (localhost:8765)
    → Altyazı overlay + transkript
```

## Klasör Yapısı

```
globalbridge-ai/
├── backend/                    # FastAPI
│   ├── main.py
│   ├── api/
│   │   ├── websocket.py        # Canlı STT + çeviri pipeline
│   │   ├── translate.py
│   │   └── pdf.py
│   └── services/
│       ├── stt.py
│       ├── translation.py
│       ├── overlay.py          # viewer_lang, altyazı state
│       ├── qvac_client.py
│       └── pdf_translate.py
├── frontend/                   # Next.js 15 — UI v2
│   └── src/
│       ├── app/                # /, /conversation, /meeting, /live, …
│       ├── components/
│       │   ├── layout/AppShell.tsx
│       │   ├── TranslatorPanel.tsx
│       │   ├── KeetMeetingBridge.tsx
│       │   ├── ConversationMode.tsx
│       │   └── DocumentTranslator.tsx
│       ├── hooks/              # useSpeechDictation, useLanguagePacks, …
│       └── lib/                # api.ts, keet.ts, languages.ts
├── qvac-service/               # @qvac/sdk local AI bridge
├── electron/                   # Floating overlay (opsiyonel)
├── docs/
│   └── AGENT-STATUS.md         # Geliştirici durum notu
└── docker-compose.yml
```

## Kurulum

### Gereksinimler

- Python 3.12+
- Node.js 20+
- (Önerilen) NVIDIA GPU + CUDA
- [QVAC SDK](https://qvac.tether.io/)
- Together AI API key (sadece cloud mod)

### Hızlı kurulum (önerilen)

```bash
git clone https://github.com/001453/newtranslate.git
cd newtranslate
npm run setup    # .env + npm + Python venv
npm run dev      # QVAC 8765 + API 8000 + WEB 3000 (tek terminal)
```

**Windows (ayrı pencereler):**

```powershell
npm run setup
.\scripts\start-dev.ps1
```

**Linux/macOS:**

```bash
npm run setup
chmod +x scripts/start-dev.sh
./scripts/start-dev.sh
```

Tarayıcı: http://localhost:3000

> **Önemli:** Çeviri için **üç servis birlikte** çalışmalıdır:
> | Servis | Port | Görev |
> |--------|------|-------|
> | QVAC bridge | 8765 | Bergamot NMT (hızlı yerel çeviri) |
> | Backend | 8000 | FastAPI API |
> | Frontend | 3000 | Next.js UI |

QVAC kapalıysa çeviri çalışmaz (503 hatası).

### Manuel kurulum

### Docker

```bash
docker compose --profile sovereign up --build
```

## Kullanım

### Çeviri (ana ekran)

1. http://localhost:3000
2. Kaynak/hedef dil seçin, yazın veya mikrofonla dikte edin
3. Geçmiş: sidebar → **Geçmiş** veya `/history`

### Keet toplantı

1. http://localhost:3000/meeting
2. Ana dilinizi ve karşı taraf dilini ayarlayın
3. Keet davet linkini açın, oturumu başlatın
4. Altyazılar kendi ana dilinizde görünür

### Canlı altyazı (Zoom/Meet)

1. http://localhost:3000/live
2. Dil seçin, **Oturumu Başlat**
3. Mikrofon veya **Toplantı Sekmesi Sesi** (getDisplayMedia) ile yakalayın

### PDF çeviri

1. http://localhost:3000/pdf
2. Dosya yükleyin, dilleri seçin, indirin

## Sorun giderme

**Eski menü görünüyorsa** (üstte "Live Caption", landing kartları): yerel dosya geri dönüşü olabilir, GitHub'daki sürüm doğrudur.

```powershell
git checkout HEAD -- frontend/src
Remove-Item -Recurse -Force frontend/.next, frontend/node_modules/.cache -ErrorAction SilentlyContinue
```

Kalıcı çözüm: projeyi Temp klasörü dışına klonlayın (ör. `C:\Users\nihat\Projects\newtranslate`).

Detaylı not: [docs/AGENT-STATUS.md](docs/AGENT-STATUS.md)

## Performans

| Metrik | Hedef |
|--------|-------|
| STT gecikme | 300–800 ms |
| Çeviri gecikme | 500–1200 ms |
| Toplam | ≤ 1.5–2 sn |

GPU yoksa: `WHISPER_MODEL=distil-large-v3`, `WHISPER_DEVICE=cpu`

## Lisans

MIT
