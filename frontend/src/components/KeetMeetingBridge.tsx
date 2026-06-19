"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LiveSetupPanel } from "@/components/live/LiveSetupPanel";
import { PrivacyBanner } from "@/components/PrivacyBanner";
import { SubtitleOverlay } from "@/components/SubtitleOverlay";
import { type AudioCaptureError, useAudioCapture, useTabAudioCapture } from "@/hooks/useAudioCapture";
import { useMicDevices } from "@/hooks/useMicDevices";
import { defaultTranslationPair, useLocale } from "@/hooks/useLocale";
import { useWebSocket } from "@/hooks/useWebSocket";
import { KEET_DOWNLOAD_URL, isKeetInvite, keetOpenHref, normalizeKeetInvite } from "@/lib/keet";
import { fmt } from "@/lib/i18n/fmt";
import { LANGUAGES, langName } from "@/lib/languages";
import { cn, formatLatency } from "@/lib/utils";
import {
  ArrowLeftRight,
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
const LIVE_LANG_KEY = "gb-live-langs-v1";

function loadLiveLangs(locale: "en" | "tr"): { my: string; other: string } {
  const fallback = defaultTranslationPair(locale);
  try {
    const raw = localStorage.getItem(LIVE_LANG_KEY);
    if (raw) {
      const p = JSON.parse(raw) as { my?: string; other?: string };
      if (p.my && p.other && p.my !== p.other) return { my: p.my, other: p.other };
    }
  } catch {
    /* ignore */
  }
  return { my: fallback.from, other: fallback.to };
}

function isWebUrl(raw: string): boolean {
  return /^https?:\/\//i.test(raw.trim());
}

type Props = {
  keetMode?: boolean;
  title?: string;
  subtitle?: string;
};

export function KeetMeetingBridge({ keetMode = true, title, subtitle }: Props) {
  const { messages: m, locale, hydrated } = useLocale();
  const pageTitle = title ?? m.meeting.title;
  const pageSubtitle = subtitle ?? m.meeting.subtitle;

  const {
    connected,
    reconnecting,
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
    send,
    waitForOpen,
  } = useWebSocket();

  const [sessionActive, setSessionActive] = useState(false);
  const [myLang, setMyLang] = useState("tr");
  const [otherLang, setOtherLang] = useState("en");
  const langInit = useRef(false);
  const [keetInvite, setKeetInvite] = useState("");
  const [copied, setCopied] = useState(false);
  const [showGuide, setShowGuide] = useState(keetMode);
  const [showLiveGuide, setShowLiveGuide] = useState(!keetMode);
  const [fontSize, setFontSize] = useState(34);
  const [audioSource, setAudioSource] = useState<"tab" | "mic" | "both">("tab");
  const [audioError, setAudioError] = useState<string | null>(null);
  const [insecureContext, setInsecureContext] = useState(false);
  const sessionActiveRef = useRef(false);
  const { devices: micDevices, requestPermission: requestMicPermission } = useMicDevices();

  const onChunk = useCallback(
    (pcm: ArrayBuffer) => {
      if (sessionActiveRef.current) sendAudio(pcm);
    },
    [sendAudio]
  );

  const { recording, start, stop, setDeviceId, deviceId } = useAudioCapture(onChunk);
  const { capturing, startTabCapture, stopTabCapture } = useTabAudioCapture(onChunk);

  const audioErrorText = (code: AudioCaptureError): string => {
    const map = m.meeting.audioErrors;
    switch (code) {
      case "secure_context":
        return map.secureContext;
      case "denied":
        return map.denied;
      case "not_found":
        return map.notFound;
      case "no_tab_audio":
        return map.tabNoAudio;
      case "cancelled":
        return map.cancelled;
      default:
        return map.unknown;
    }
  };

  useEffect(() => {
    connect();
    setInsecureContext(typeof window !== "undefined" && !window.isSecureContext);
    void requestMicPermission();
    try {
      const saved = localStorage.getItem(KEET_INVITE_KEY);
      if (saved) setKeetInvite(saved);
    } catch {
      /* ignore */
    }
    return () => disconnect();
  }, [connect, disconnect, requestMicPermission]);

  useEffect(() => {
    if (!hydrated || langInit.current) return;
    const { my, other } = loadLiveLangs(locale);
    setMyLang(my);
    setOtherLang(other);
    langInit.current = true;
  }, [locale, hydrated]);

  const persistLangs = (my: string, other: string) => {
    try {
      localStorage.setItem(LIVE_LANG_KEY, JSON.stringify({ my, other }));
    } catch {
      /* ignore */
    }
  };

  const pushLangConfig = useCallback(
    (my: string, other: string) => {
      send({
        action: "update_languages",
        config: {
          source_lang: "auto",
          target_lang: other,
          bidirectional: true,
          lang_a: my,
          lang_b: other,
          viewer_lang: my,
        },
      });
    },
    [send]
  );

  const applyLangPair = (my: string, other: string) => {
    if (my === other) return;
    setMyLang(my);
    setOtherLang(other);
    persistLangs(my, other);
    if (sessionActive) pushLangConfig(my, other);
  };

  const swapLangs = () => applyLangPair(otherLang, myLang);

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
    if (!connected) return;
    setAudioError(null);

    const wsReady = await waitForOpen();
    if (!wsReady) {
      setAudioError(audioErrorText("unknown"));
      return;
    }

    sessionActiveRef.current = true;
    setSessionActive(true);

    startSession({
      source_lang: "auto",
      target_lang: otherLang,
      bidirectional: true,
      lang_a: myLang,
      lang_b: otherLang,
      viewer_lang: myLang,
    });

    const errors: string[] = [];
    if (audioSource === "mic" || audioSource === "both") {
      const err = await start();
      if (err) errors.push(audioErrorText(err));
    }
    if (audioSource === "tab" || audioSource === "both") {
      const err = await startTabCapture();
      if (err) errors.push(audioErrorText(err));
    }
    if (errors.length) setAudioError(errors.join(" "));
  };

  const handleStop = () => {
    sessionActiveRef.current = false;
    stop();
    stopTabCapture();
    stopSession(myLang);
    setSessionActive(false);
    setAudioError(null);
  };

  const copyInvite = async () => {
    const link = normalizeKeetInvite(keetInvite);
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const keetHref = keetInvite ? keetOpenHref(keetInvite) : "";
  const invalidKeetLink = keetMode && keetInvite.trim() && isWebUrl(keetInvite);
  const langOptions = LANGUAGES.filter((l) => l.code !== "auto");

  const audioSources = [
    { id: "tab" as const, label: keetMode ? m.meeting.sourceTab : m.meeting.sourceTabLive, icon: Monitor },
    { id: "mic" as const, label: m.meeting.sourceMic, icon: Mic },
    { id: "both" as const, label: m.meeting.sourceBoth, icon: Radio },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="gb-card gb-hero border-0 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Users className="h-5 w-5 text-[var(--gb-accent)]" />
              <h1 className="gb-page-title text-xl">{pageTitle}</h1>
            </div>
            <p className="gb-page-sub">{pageSubtitle}</p>
          </div>
          <div className="text-sm">
            {connected ? (
              <span className="gb-badge gb-badge-accent">
                <Wifi className="mr-1 inline h-3.5 w-3.5" /> {m.meeting.connected}
              </span>
            ) : reconnecting ? (
              <span className="gb-badge gb-badge-accent">
                <Wifi className="mr-1 inline h-3.5 w-3.5 animate-pulse" /> {m.meeting.reconnecting}
              </span>
            ) : (
              <span className="gb-badge">
                <WifiOff className="mr-1 inline h-3.5 w-3.5" /> {m.meeting.disconnected}
              </span>
            )}
          </div>
        </div>
      </div>

      {error && <div className="gb-alert-danger">{error}</div>}
      {insecureContext && <div className="gb-alert-danger">{m.meeting.audioErrors.secureContext}</div>}
      {audioError && <div className="gb-alert-danger">{audioError}</div>}
      <PrivacyBanner />

      {!keetMode && showLiveGuide && <LiveSetupPanel onHide={() => setShowLiveGuide(false)} />}

      {!keetMode && !showLiveGuide && (
        <button type="button" className="gb-btn-ghost w-full text-xs" onClick={() => setShowLiveGuide(true)}>
          {m.meeting.liveGuideTitle}
        </button>
      )}

      {keetMode && showGuide && (
        <div className="gb-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">{m.meeting.keetStart}</h2>
            <button type="button" className="gb-btn-ghost text-xs" onClick={() => setShowGuide(false)}>
              {m.meeting.hide}
            </button>
          </div>
          <ol className="space-y-3">
            {m.meeting.steps.map((s, i) => (
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
            <ExternalLink className="mr-1 h-4 w-4" /> {m.meeting.downloadKeet}
          </a>
        </div>
      )}

      {keetMode && (
        <div className="gb-card p-5">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Link2 className="h-4 w-4 text-[var(--gb-accent)]" />
            {m.meeting.roomLink}
          </h2>
          <p className="mb-3 text-xs text-[var(--gb-muted)]">{m.meeting.roomHint}</p>
          <input
            className="gb-input"
            placeholder={m.meeting.invitePlaceholder}
            value={keetInvite}
            onChange={(e) => saveInvite(e.target.value)}
            disabled={sessionActive}
          />
          {invalidKeetLink && (
            <p className="mt-2 text-xs text-[var(--gb-warning)]">{m.meeting.invalidKeetLink}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {isKeetInvite(keetInvite) && !invalidKeetLink && (
              <a href={keetHref} className="gb-btn-primary text-sm">
                {m.meeting.openInKeet}
              </a>
            )}
            <button
              type="button"
              className="gb-btn-ghost text-sm"
              disabled={!keetInvite}
              onClick={() => void copyInvite()}
            >
              <Copy className="mr-1 h-3.5 w-3.5" />
              {copied ? m.meeting.copied : m.meeting.copyLink}
            </button>
          </div>
        </div>
      )}

      <div className="gb-card p-5">
        <h2 className="mb-3 text-sm font-semibold">{m.meeting.languagesTitle}</h2>
        <p className="mb-3 text-xs text-[var(--gb-muted)]">
          {fmt(m.meeting.languagesHint, { mine: langName(myLang), other: langName(otherLang) })}
        </p>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--gb-border)] bg-[var(--gb-surface-2)] px-3 py-1 text-xs font-medium text-[var(--gb-accent)]">
          {langName(myLang)} ↔ {langName(otherLang)}
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <div>
            <label className="text-xs text-[var(--gb-muted)]">{m.meeting.myLang}</label>
            <select
              className="gb-select mt-1"
              value={myLang}
              onChange={(e) => {
                const next = e.target.value;
                if (next !== otherLang) applyLangPair(next, otherLang);
              }}
            >
              {langOptions.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="gb-btn-ghost mb-0.5 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--gb-border)]"
            onClick={swapLangs}
            title={m.meeting.swapLangs}
          >
            <ArrowLeftRight className="h-4 w-4" />
          </button>
          <div>
            <label className="text-xs text-[var(--gb-muted)]">{m.meeting.otherLang}</label>
            <select
              className="gb-select mt-1"
              value={otherLang}
              onChange={(e) => {
                const next = e.target.value;
                if (next !== myLang) applyLangPair(myLang, next);
              }}
            >
              {langOptions.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {sessionActive && (
          <p className="mt-2 text-xs text-[var(--gb-success)]">{m.meeting.langLiveUpdate}</p>
        )}
      </div>

      <div className="gb-live-box">
        <div className="mb-1 text-xs font-bold uppercase text-[var(--gb-muted)]">{m.meeting.captionLabel}</div>
        {caption ? (
          <>
            <p className="text-2xl font-semibold leading-snug">{caption.translated}</p>
            {caption.original !== caption.translated && (
              <p className="mt-2 text-sm opacity-70">{caption.original}</p>
            )}
          </>
        ) : sessionActive ? (
          <p className="opacity-70">{m.meeting.waitingSpeech}</p>
        ) : (
          <p className="opacity-70">{keetMode ? m.meeting.waitingStart : m.meeting.liveWaitingStart}</p>
        )}
      </div>

      <div className="gb-card p-4">
        <h3 className="gb-panel-head mb-3 border-0 px-0">{m.meeting.audioSource}</h3>
        {(audioSource === "mic" || audioSource === "both") && (
          <div className="mb-3">
            <label className="mb-1 block text-xs text-[var(--gb-muted)]">{m.mic.inputDevice}</label>
            <select
              className="gb-select"
              value={deviceId || ""}
              disabled={sessionActive}
              onChange={(e) => setDeviceId(e.target.value || undefined)}
            >
              <option value="">{m.mic.defaultMic}</option>
              {micDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || m.mic.micFallback}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="mb-4 flex flex-wrap gap-2">
          {audioSources.map(({ id, label, icon: Icon }) => (
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
          <button
            type="button"
            disabled={!connected}
            onClick={() => void handleStart()}
            className="gb-btn-primary w-full py-3"
          >
            <Radio className="h-4 w-4" />
            {m.meeting.startBridge}
          </button>
        ) : (
          <button type="button" onClick={handleStop} className="gb-btn-danger w-full py-3">
            <Square className="h-4 w-4" />
            {m.meeting.stopBridge}
          </button>
        )}

        {sessionActive && (
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (recording) {
                  stop();
                  return;
                }
                void start().then((err) => setAudioError(err ? audioErrorText(err) : null));
              }}
              className={cn("gb-btn-ghost flex-1 text-xs", recording && "text-[var(--gb-danger)]")}
            >
              {recording ? <MicOff className="inline h-3 w-3" /> : <Mic className="inline h-3 w-3" />} Mic
            </button>
            <button
              type="button"
              onClick={() => {
                if (capturing) {
                  stopTabCapture();
                  return;
                }
                void startTabCapture().then((err) => setAudioError(err ? audioErrorText(err) : null));
              }}
              className={cn("gb-btn-ghost flex-1 text-xs", capturing && "text-[var(--gb-accent)]")}
            >
              <Monitor className="inline h-3 w-3" /> {m.meeting.tabShort}
            </button>
          </div>
        )}

        {lastPipeline && (
          <p className="mt-3 text-center text-xs text-[var(--gb-muted)]">
            {fmt(m.meeting.latency, { ms: formatLatency(lastPipeline.total_ms) })}
          </p>
        )}
        <p className="mt-2 text-center text-[0.65rem] text-[var(--gb-muted)]">{m.meeting.shortcutHint}</p>
      </div>

      <div className="gb-card p-4">
        <label className="text-xs text-[var(--gb-muted)]">
          {fmt(m.meeting.captionSize, { px: fontSize })}
        </label>
        <input
          type="range"
          min={22}
          max={48}
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="mt-2 w-full accent-[var(--gb-accent)]"
        />
      </div>

      <div className="gb-card p-4">
        <h2 className="mb-2 text-sm font-semibold">
          {fmt(m.meeting.transcript, { n: history.length })}
        </h2>
        <div className="max-h-48 space-y-2 overflow-y-auto text-sm">
          {history.length === 0 && <p className="text-[var(--gb-muted)]">{m.meeting.transcriptEmpty}</p>}
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
          <h2 className="font-semibold">{m.meeting.meetingSummary}</h2>
          <p className="mt-1 text-sm">{summary.summary}</p>
        </div>
      )}

      {!keetMode && (
        <p className="text-center text-xs text-[var(--gb-muted)]">
          {m.meeting.zoomHint}{" "}
          <Link href="/meeting" className="text-[var(--gb-accent)] hover:underline">
            {m.meeting.keetModeLink}
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
