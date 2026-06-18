"use client";

import { useCallback, useEffect, useState } from "react";
import { SubtitleOverlay } from "@/components/SubtitleOverlay";
import { PrivacyBanner } from "@/components/PrivacyBanner";
import { useAudioCapture, useTabAudioCapture } from "@/hooks/useAudioCapture";
import { useWebSocket } from "@/hooks/useWebSocket";
import { LANGUAGES } from "@/lib/types";
import { cn, formatLatency } from "@/lib/utils";
import { Mic, MicOff, Monitor, Radio, Square, Wifi, WifiOff } from "lucide-react";

export function LiveCaption() {
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
  const [langA, setLangA] = useState("tr");
  const [langB, setLangB] = useState("en");
  const [bidirectional, setBidirectional] = useState(true);
  const [overlayMode, setOverlayMode] = useState<"browser" | "pip">("browser");
  const [fontSize, setFontSize] = useState(32);

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
    return () => disconnect();
  }, [connect, disconnect]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "L") {
        e.preventDefault();
        sessionActive ? handleStop() : handleStart();
      }
      if (e.ctrlKey && e.shiftKey && e.key === "M") {
        e.preventDefault();
        recording ? stop() : start();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const handleStart = () => {
    startSession({
      source_lang: "auto",
      target_lang: langB,
      bidirectional,
      lang_a: langA,
      lang_b: langB,
    });
    setSessionActive(true);
    start();
  };

  const handleStop = () => {
    stop();
    stopTabCapture();
    stopSession(langB);
    setSessionActive(false);
  };

  const openPiP = async () => {
    if (!document.pictureInPictureEnabled) return;
    const el = document.getElementById("caption-pip-source");
    if (el && el instanceof HTMLVideoElement) {
      await el.requestPictureInPicture();
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-bridge-900">Live Caption</h1>
          <p className="text-sm text-slate-500">
            Zoom · Meet · Teams · Discord — gerçek zamanlı çeviri altyazı
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {connected ? (
            <span className="flex items-center gap-1 text-green-600">
              <Wifi className="h-4 w-4" /> Bağlı
            </span>
          ) : (
            <span className="flex items-center gap-1 text-red-500">
              <WifiOff className="h-4 w-4" /> Bağlantı yok
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <PrivacyBanner />

      {/* Language config */}
      <div className="grid gap-4 rounded-xl border bg-white p-5 shadow-sm sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Dil A</label>
          <select
            value={langA}
            onChange={(e) => setLangA(e.target.value)}
            disabled={sessionActive}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            {LANGUAGES.filter((l) => l.code !== "auto").map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Dil B</label>
          <select
            value={langB}
            onChange={(e) => setLangB(e.target.value)}
            disabled={sessionActive}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            {LANGUAGES.filter((l) => l.code !== "auto").map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={bidirectional}
            onChange={(e) => setBidirectional(e.target.checked)}
            disabled={sessionActive}
          />
          Çift yönlü çeviri (A↔B otomatik algılama)
        </label>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        {!sessionActive ? (
          <button
            onClick={handleStart}
            disabled={!connected}
            className="flex items-center gap-2 rounded-lg bg-bridge-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-bridge-500 disabled:opacity-50"
          >
            <Radio className="h-4 w-4" />
            Oturumu Başlat
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-500"
          >
            <Square className="h-4 w-4" />
            Oturumu Bitir
          </button>
        )}

        <button
          onClick={recording ? stop : start}
          disabled={!sessionActive}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium",
            recording ? "border-red-300 bg-red-50 text-red-700" : "border-slate-200 bg-white"
          )}
        >
          {recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          {recording ? "Mikrofon Kapalı" : "Mikrofon"}
        </button>

        <button
          onClick={capturing ? stopTabCapture : startTabCapture}
          disabled={!sessionActive}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium"
        >
          <Monitor className="h-4 w-4" />
          {capturing ? "Sekme Sesini Durdur" : "Toplantı Sekmesi Sesi"}
        </button>

        <button
          onClick={openPiP}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium"
        >
          PiP Overlay
        </button>
      </div>

      {/* Latency monitor */}
      {lastPipeline && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <span className="font-medium">Gecikme: </span>
          <span
            className={cn(
              lastPipeline.total_ms <= 2000 ? "text-green-600" : "text-amber-600"
            )}
          >
            {formatLatency(lastPipeline.total_ms)}
          </span>
          <span className="ml-3 text-slate-500">
            STT {formatLatency(lastPipeline.stt_ms)} · Çeviri{" "}
            {formatLatency(lastPipeline.translation_ms)}
          </span>
        </div>
      )}

      {/* Font size */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Altyazı boyutu: {fontSize}px</label>
        <input
          type="range"
          min={20}
          max={48}
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="flex-1"
        />
      </div>

      {/* Transcript history */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-800">Transkript ({history.length})</h2>
        <div className="max-h-64 space-y-2 overflow-y-auto text-sm">
          {history.length === 0 && (
            <p className="text-slate-400">Konuşma başladığında transkript burada görünür.</p>
          )}
          {history.map((h, i) => (
            <div key={h.id || i} className="border-b border-slate-100 pb-2">
              <div className="font-medium text-bridge-900">{h.translated}</div>
              <div className="text-slate-500">{h.original}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Meeting summary */}
      {summary && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <h2 className="mb-2 font-semibold text-green-900">Toplantı Özeti</h2>
          <p className="text-sm text-green-800">{summary.summary}</p>
          {summary.action_items && summary.action_items.length > 0 && (
            <div className="mt-3">
              <h3 className="text-sm font-medium text-green-900">Aksiyon Maddeleri</h3>
              <ul className="mt-1 list-inside list-disc text-sm text-green-800">
                {summary.action_items.map((a, i) => (
                  <li key={i}>
                    {a.task} — {a.assignee}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-slate-400">
        Kısayollar: Ctrl+Shift+L oturum · Ctrl+Shift+M mikrofon
      </p>

      {/* Browser overlay */}
      {overlayMode === "browser" && (
        <SubtitleOverlay
          caption={
            caption
              ? {
                  ...caption,
                  style: {
                    fontSizePx: fontSize,
                    fontFamily: "'Segoe UI', 'Noto Sans', system-ui, sans-serif",
                    textColor: "#FFFFFF",
                    backgroundColor: "rgba(0, 0, 0, 0.72)",
                    paddingPx: 16,
                    borderRadiusPx: 8,
                    maxWidthPercent: 90,
                    position: "bottom",
                    bottomOffsetPx: 80,
                    textShadow: "0 2px 8px rgba(0,0,0,0.9)",
                    rtl: false,
                  },
                }
              : null
          }
        />
      )}

      <video id="caption-pip-source" className="hidden" />
    </div>
  );
}
