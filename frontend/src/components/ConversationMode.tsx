"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PackManagerBar } from "@/components/PackManagerBar";
import { MicSidebar } from "@/components/shared/MicSidebar";
import { useConversation } from "@/hooks/useLocalStore";
import { defaultTranslationPair, useLocale } from "@/hooks/useLocale";
import { useLanguagePacks } from "@/hooks/useLanguagePacks";
import { useMicDeviceGuard } from "@/hooks/useMicDeviceGuard";
import { useMicDevices } from "@/hooks/useMicDevices";
import { useMicSettings } from "@/hooks/useMicSettings";
import { useWhisperDictation } from "@/hooks/useWhisperDictation";
import { translateText } from "@/lib/api";
import { fmt } from "@/lib/i18n/fmt";
import { LANGUAGES, langName } from "@/lib/languages";
import { cn } from "@/lib/utils";
import { Mic, Send, Trash2 } from "lucide-react";

export function ConversationMode() {
  const { messages: m, locale, hydrated } = useLocale();
  const [langA, setLangA] = useState("en");
  const [langB, setLangB] = useState("tr");
  const [speaker, setSpeaker] = useState<"a" | "b">("a");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const dictationBase = useRef("");
  const pairInit = useRef(false);

  const { messages, push, clear } = useConversation();
  const { isPairReady } = useLanguagePacks();
  const { settings, update, ready: settingsReady } = useMicSettings();
  const { devices, requestPermission } = useMicDevices();

  useMicDeviceGuard(settings.deviceId, devices, settingsReady, (patch) => update(patch));

  const activeLang = speaker === "a" ? langA : langB;

  useEffect(() => {
    if (!hydrated || pairInit.current) return;
    const pair = defaultTranslationPair(locale);
    setLangA(pair.from);
    setLangB(pair.to);
    pairInit.current = true;
  }, [locale, hydrated]);

  const onDictation = useCallback((text: string, final: boolean) => {
    if (!text) return;
    if (final) {
      setInput((prev) => {
        const base = dictationBase.current || prev;
        const next = base ? `${base} ${text}`.trim() : text;
        dictationBase.current = next;
        return next;
      });
    } else {
      setInput(() => {
        const base = dictationBase.current;
        return base ? `${base} ${text}` : text;
      });
    }
  }, []);

  const { listening, supported, error: dictationError, toggle, stop, debug: dictationDebug, level: dictationLevel } =
    useWhisperDictation(activeLang, settings.deviceId || undefined, onDictation);

  useEffect(() => {
    if (settingsReady) requestPermission();
  }, [settingsReady, requestPermission]);

  useEffect(() => {
    if (listening) dictationBase.current = input;
  }, [listening]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "M") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggle]);

  const send = async () => {
    stop();
    const text = input.trim();
    if (!text || loading) return;
    const from = speaker === "a" ? langA : langB;
    const to = speaker === "a" ? langB : langA;
    if (!isPairReady(from, to)) return;
    setLoading(true);
    try {
      const res = await translateText(text, from, to);
      push({ speaker, from, to, source: text, target: res.translated });
      setInput("");
      dictationBase.current = "";
      setSpeaker((s) => (s === "a" ? "b" : "a"));
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = listening
    ? fmt(m.conversation.listeningLang, { lang: langName(activeLang) })
    : fmt(m.conversation.dictateLang, { lang: langName(activeLang) });

  const dictationErrorText =
    dictationError === "denied"
      ? m.mic.dictationErrors.denied
      : dictationError === "secure_context"
        ? m.mic.dictationErrors.secureContext
        : dictationError === "unsupported"
          ? m.mic.dictationErrors.unsupported
          : dictationError === "no_speech"
            ? fmt(m.mic.dictationErrors.noSpeech, { lang: langName(activeLang) })
            : dictationError === "network"
              ? m.mic.dictationErrors.network
              : dictationError === "audio_suspended"
                ? m.mic.dictationErrors.audioSuspended
                : dictationError
                ? m.mic.dictationErrors.unknown
                : null;

  return (
    <div className="mx-auto max-w-6xl">
      <header className="gb-hero mb-6">
        <h1 className="gb-page-title text-2xl">{m.conversation.title}</h1>
        <p className="gb-page-sub mt-1">{m.conversation.subtitle}</p>
      </header>

      {dictationErrorText && (
        <div className="gb-alert-danger mb-4 text-sm">{dictationErrorText}</div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="gb-card gb-translate-card overflow-hidden">
          <div className="gb-lang-bar flex flex-wrap items-center gap-2 border-b border-[var(--gb-border)] p-3">
            <select className="gb-select max-w-[150px]" value={langA} onChange={(e) => setLangA(e.target.value)}>
              {LANGUAGES.filter((l) => l.code !== "auto").map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
            <span className="text-[var(--gb-muted)]">↔</span>
            <select className="gb-select max-w-[150px]" value={langB} onChange={(e) => setLangB(e.target.value)}>
              {LANGUAGES.filter((l) => l.code !== "auto").map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                className={cn(
                  "rounded-full border px-3 py-1 text-sm font-medium transition",
                  speaker === "a"
                    ? "border-[var(--gb-accent)] bg-[var(--gb-accent-muted)] text-[var(--gb-accent)]"
                    : "border-[var(--gb-border)] text-[var(--gb-muted)]"
                )}
                onClick={() => setSpeaker("a")}
              >
                {langName(langA)}
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-full border px-3 py-1 text-sm font-medium transition",
                  speaker === "b"
                    ? "border-[var(--gb-accent)] bg-[var(--gb-accent-muted)] text-[var(--gb-accent)]"
                    : "border-[var(--gb-border)] text-[var(--gb-muted)]"
                )}
                onClick={() => setSpeaker("b")}
              >
                {langName(langB)}
              </button>
            </div>
          </div>

          <div className="min-h-[280px] max-h-[360px] overflow-y-auto p-4">
            {messages.length === 0 && (
              <p className="text-center text-sm text-[var(--gb-muted)]">{m.conversation.empty}</p>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "mb-3 max-w-[85%] rounded-xl border p-3 text-sm",
                  msg.speaker === "a"
                    ? "mr-auto border-[var(--gb-border)] bg-[var(--gb-surface-2)]"
                    : "ml-auto border-[var(--gb-accent)] bg-[var(--gb-accent-muted)]"
                )}
              >
                <p className="text-[var(--gb-text)]">{msg.source}</p>
                <p className="mt-1.5 text-[var(--gb-accent)]">{msg.target}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-[var(--gb-border)] bg-[var(--gb-surface-2)] p-4">
            <div className="mb-2 flex items-center justify-between text-xs text-[var(--gb-muted)]">
              <span>
                {m.conversation.speaking}:{" "}
                <strong className="text-[var(--gb-text)]">{langName(activeLang)}</strong>
              </span>
              {listening && (
                <span className="flex items-center gap-1 text-[var(--gb-danger)]">
                  <Mic className="h-3 w-3 animate-pulse" /> {m.conversation.listening}
                </span>
              )}
            </div>
            <textarea
              className="gb-textarea min-h-[80px] text-[0.95rem]"
              placeholder={m.conversation.placeholder}
              value={input}
              onChange={(e) => {
                dictationBase.current = e.target.value;
                setInput(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                className={cn(
                  "gb-btn-ghost border border-[var(--gb-border)]",
                  listening && "border-[var(--gb-danger)] text-[var(--gb-danger)]"
                )}
                onClick={toggle}
                title={m.translate.dictate}
              >
                <Mic className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="gb-btn-ghost border border-[var(--gb-border)]"
                onClick={clear}
                title={m.translate.clear}
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="gb-btn-primary min-w-[6.5rem]"
                onClick={send}
                disabled={loading || !input.trim()}
              >
                <Send className="mr-1 inline h-4 w-4" />
                {m.conversation.send}
              </button>
            </div>
          </div>
          <PackManagerBar from={langA} to={langB} />
        </div>

        <MicSidebar
          mode="dictation"
          devices={devices}
          deviceId={settings.deviceId}
          onDeviceChange={(id) => update({ deviceId: id })}
          listening={listening}
          onMicToggle={toggle}
          supported={supported}
          statusLabel={statusLabel}
          dictationDebug={dictationDebug}
          dictationLevel={dictationLevel}
          onRefreshDevices={() => void requestPermission()}
        />
      </div>
    </div>
  );
}
