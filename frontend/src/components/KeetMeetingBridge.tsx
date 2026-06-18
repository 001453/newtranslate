"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PrivacyBanner } from "@/components/PrivacyBanner";
import { SubtitleOverlay } from "@/components/SubtitleOverlay";
import { useAudioCapture, useTabAudioCapture } from "@/hooks/useAudioCapture";
import { useWebSocket } from "@/hooks/useWebSocket";
import {
  KEET_DOWNLOAD_URL,
  KEET_SETUP_STEPS,
  isKeetInvite,
  keetOpenHref,
  normalizeKeetInvite,
} from "@/lib/keet";
import { LANGUAGES } from "@/lib/languages";
import { cn, formatLatency } from "@/lib/utils";
import {
  Copy,
  ExternalLink,
  Link2,
  Mic,
  MicOff,
  Monitor,
  Radio,
  Square,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";

const KEET_INVITE_KEY = "gb-keet-invite";

type Props = {
  /** Keet odaklı sunum adımları göster */
  keetMode?: boolean;
  title?: string;
  subtitle?: string;
};

export function KeetMeetingBridge({
  keetMode = true,
  title = "Keet & Online Toplantı",
  subtitle = "P2P görüşme + ana dilinizde anlık altyazı",
}: Props) {
  const {
    connected,
    connect,
    disconnect,
    startSession,
    stopSession,
    sendAudio,
    caption,
    history,
    lastPipeline,
    summary,
    error,
  } = useWebSocket();

  const [sessionActive, setSessionActive] = useState(false);
  const [myLang, setMyLang] = useState("tr");
  const [otherLang, setOtherLang] = useState("en");
  const [keetInvite, setKeetInvite] = useState("");
  const [copied, setCopied] = useState(false);
  const [showGuide, setShowGuide] = useState(keetMode);
  const [fontSize, setFontSize] = useState(34);
  const [audioSource, setAudioSource] = useState<"tab" | "mic" | "both">("tab");

  const onChunk = useCallback(
    (pcm: ArrayBuffer) => {
      if (sessionActive) sendAudio(pcm);
    },
    [sessionActive, sendAudio]
  );

  const { recording, start, stop } = useAudioCapture(onChunk);
  const { capturing, startTabCapture, stopTabCapture } = useTabAudioCapture(onChunk);

  useEffect(() => {
    connect();
    try {
      const saved = localStorage.getItem(KEET_INVITE_KEY);
      if (saved) setKeetInvite(saved);
    } catch {
      /* ignore */
    }
    return () => disconnect();
  }, [connect, disconnect]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "L") {
        e.preventDefault();
        sessionActive ? handleStop() : void handleStart();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const saveInvite = (v: string) => {
    setKeetInvite(v);
    try {
      localStorage.setItem(KEET_INVITE_KEY, v);
    } catch {
      /* ignore */
    }
  };

  const handleStart = async () => {
    startSession({
      source_lang: "auto",
      target_lang: otherLang,
      bidirectional: true,
      lang_a: myLang,
      lang_b: otherLang,
      viewer_lang: myLang,
    });
    setSessionActive(true);
    if (audioSource === "mic" || audioSource === "both") await start();
    if (audioSource === "tab" || audioSource === "both") await startTabCapture();
  };

  const handleStop = () => {
    stop();
    stopTabCapture();
    stopSession(myLang);
    setSessionActive(false);
  };

  const copyInvite = async () => {
    const link = normalizeKeetInvite(keetInvite);
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const keetHref = keetInvite ? keetOpenHref(keetInvite) : "";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="gb-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Users className="h-5 w-5 text-[var(--gb-accent)]" />
              <h1 className="gb-page-title text-xl">{title}</h1>
            </div>
            <p className="gb-page-sub">{subtitle}</p>
          </div>
          <div className="text-sm">
            {connected ? (
              <span className="gb-badge gb-badge-accent">
                <Wifi className="mr-1 inline h-3.5 w-3.5" /> Canlı
              </span>
            ) : (
              <span className="gb-badge">
                <WifiOff className="mr-1 inline h-3.5 w-3.5" /> Bağlantı yok
              </span>
            )}
          </div>
        </div>
      </div>

      {error && <div className="gb-alert-danger">{error}</div>}
      <PrivacyBanner />

      {keetMode && showGuide && (
        <div className="gb-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Keet ile başlangıç</h2>
            <button type="button" className="gb-btn-ghost text-xs" onClick={() => setShowGuide(false)}>
              Gizle
            </button>
          </div>
          <ol className="space-y-3">
            {KEET_SETUP_STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--gb-accent-muted)] text-xs font-bold text-[var(--gb-accent)]">
                  {i + 1}
                </span>
                <div>
                  <div className="font-medium">{s.title}</div>
                  <p className="text-[var(--gb-muted)]">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <a
            href={KEET_DOWNLOAD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="gb-btn-ghost mt-4 inline-flex text-sm"
          >
            <ExternalLink className="mr-1 h-4 w-4" /> Keet indir (keet.io)
          </a>
        </div>
      )}

      {keetMode && (
        <div className="gb-card p-5">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Link2 className="h-4 w-4 text-[var(--gb-accent)]" />
            Keet oda bağlantısı
          </h2>
          <p className="mb-3 text-xs text-[var(--gb-muted)]">
            Davet linkini yapıştırın — Keet uygulamasında odaya katılın. Karşılıklı P2P görüşme Keet üzerinden; altyazı GlobalBridge ile yerel.
          </p>
          <input
            className="gb-input"
            placeholder="keet://… veya davet linki"
            value={keetInvite}
            onChange={(e) => saveInvite(e.target.value)}
            disabled={sessionActive}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {isKeetInvite(keetInvite) && (
              <a href={keetHref} className="gb-btn-primary text-sm">
                Keet&apos;te aç
              </a>
            )}
            <button type="button" className="gb-btn-ghost text-sm" disabled={!keetInvite} onClick={() => void copyInvite()}>
              <Copy className="mr-1 h-3.5 w-3.5" />
              {copied ? "Kopyalandı" : "Linki kopyala"}
            </button>
          </div>
        </div>
      )}

      <div className="gb-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Diller — kişisel altyazı</h2>
        <p className="mb-3 text-xs text-[var(--gb-muted)]">
          <strong>Benim ana dilim:</strong> altyazılar bu dilde. Karşı taraf {otherLang === "en" ? "İngilizce" : "diğer dilde"} konuşunca otomatik çevrilir.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs text-[var(--gb-muted)]">Benim ana dilim</label>
            <select className="gb-select mt-1" value={myLang} disabled={sessionActive} onChange={(e) => setMyLang(e.target.value)}>
              {LANGUAGES.filter((l) => l.code !== "auto").map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--gb-muted)]">Karşı taraf dili</label>
            <select className="gb-select mt-1" value={otherLang} disabled={sessionActive} onChange={(e) => setOtherLang(e.target.value)}>
              {LANGUAGES.filter((l) => l.code !== "auto").map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="gb-live-box">
        <div className="mb-1 text-xs font-bold uppercase text-[var(--gb-muted)]">Anlık altyazı (ana dilinizde)</div>
        {caption ? (
          <>
            <p className="text-2xl font-semibold leading-snug">{caption.translated}</p>
            {caption.original !== caption.translated && (
              <p className="mt-2 text-sm opacity-70">{caption.original}</p>
            )}
          </>
        ) : sessionActive ? (
          <p className="opacity-70">Konuşma bekleniyor…</p>
        ) : (
          <p className="opacity-70">Köprüyü başlatın — Keet veya toplantı sesi yakalanır.</p>
        )}
      </div>

      <div className="gb-card p-4">
        <h3 className="gb-panel-head mb-3 border-0 px-0">Ses kaynağı</h3>
        <div className="mb-4 flex flex-wrap gap-2">
          {(
            [
              { id: "tab" as const, label: "Keet / toplantı sekmesi", icon: Monitor },
              { id: "mic" as const, label: "Mikrofon", icon: Mic },
              { id: "both" as const, label: "İkisi birden", icon: Radio },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              disabled={sessionActive}
              onClick={() => setAudioSource(id)}
              className={cn(
                "gb-btn-ghost text-xs",
                audioSource === id && "border-[var(--gb-accent)] text-[var(--gb-accent)]"
              )}
            >
              <Icon className="mr-1 inline h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {!sessionActive ? (
          <button type="button" disabled={!connected} onClick={() => void handleStart()} className="gb-btn-primary w-full py-3">
            <Radio className="h-4 w-4" />
            Köprüyü Başlat
          </button>
        ) : (
          <button type="button" onClick={handleStop} className="gb-btn-danger w-full py-3">
            <Square className="h-4 w-4" />
            Bitir
          </button>
        )}

        {sessionActive && (
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={recording ? stop : () => void start()}
              className={cn("gb-btn-ghost flex-1 text-xs", recording && "text-[var(--gb-danger)]")}
            >
              {recording ? <MicOff className="inline h-3 w-3" /> : <Mic className="inline h-3 w-3" />} Mic
            </button>
            <button
              type="button"
              onClick={capturing ? stopTabCapture : () => void startTabCapture()}
              className={cn("gb-btn-ghost flex-1 text-xs", capturing && "text-[var(--gb-accent)]")}
            >
              <Monitor className="inline h-3 w-3" /> Sekme
            </button>
          </div>
        )}

        {lastPipeline && (
          <p className="mt-3 text-center text-xs text-[var(--gb-muted)]">
            Gecikme {formatLatency(lastPipeline.total_ms)}
          </p>
        )}
        <p className="mt-2 text-center text-[0.65rem] text-[var(--gb-muted)]">Ctrl+Shift+L başlat/bitir</p>
      </div>

      <div className="gb-card p-4">
        <label className="text-xs text-[var(--gb-muted)]">Altyazı boyutu: {fontSize}px</label>
        <input type="range" min={22} max={48} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="mt-2 w-full accent-[var(--gb-accent)]" />
      </div>

      <div className="gb-card p-4">
        <h2 className="mb-2 text-sm font-semibold">Transkript ({history.length})</h2>
        <div className="max-h-48 space-y-2 overflow-y-auto text-sm">
          {history.length === 0 && <p className="text-[var(--gb-muted)]">Konuşmalar burada birikir.</p>}
          {history.map((h, i) => (
            <div key={h.id || i} className="border-b border-[var(--gb-border-subtle)] pb-2">
              <p className="font-medium text-[var(--gb-accent)]">{h.translated}</p>
              {h.original !== h.translated && <p className="text-[var(--gb-muted)]">{h.original}</p>}
            </div>
          ))}
        </div>
      </div>

      {summary?.summary && (
        <div className="gb-alert-success p-4">
          <h2 className="font-semibold">Toplantı özeti</h2>
          <p className="mt-1 text-sm">{summary.summary}</p>
        </div>
      )}

      {!keetMode && (
        <p className="text-center text-xs text-[var(--gb-muted)]">
          Zoom / Meet için{" "}
          <Link href="/meeting" className="text-[var(--gb-accent)] hover:underline">
            Keet modu
          </Link>
        </p>
      )}

      <SubtitleOverlay
        caption={
          caption
            ? {
                ...caption,
                style: {
                  fontSizePx: fontSize,
                  fontFamily: "'Segoe UI', 'Noto Sans', system-ui, sans-serif",
                  textColor: "#FFFFFF",
                  backgroundColor: "rgba(0, 0, 0, 0.78)",
                  paddingPx: 16,
                  borderRadiusPx: 10,
                  maxWidthPercent: 92,
                  position: "bottom",
                  bottomOffsetPx: 72,
                  textShadow: "0 2px 10px rgba(0,0,0,0.9)",
                  rtl: false,
                },
              }
            : null
        }
      />
    </div>
  );
}
