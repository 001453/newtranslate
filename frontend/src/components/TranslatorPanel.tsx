"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { HistoryPanel } from "@/components/HistoryPanel";
import { PackManagerBar } from "@/components/PackManagerBar";
import { MicSidebar } from "@/components/shared/MicSidebar";
import { useHistory, usePinnedPairs } from "@/hooks/useLocalStore";
import { useLanguagePacks } from "@/hooks/useLanguagePacks";
import { useMicDevices } from "@/hooks/useMicDevices";
import { useMicSettings } from "@/hooks/useMicSettings";
import { useSpeechDictation } from "@/hooks/useSpeechDictation";
import { translateText } from "@/lib/api";
import { LANGUAGES, langName } from "@/lib/languages";
import { cn } from "@/lib/utils";
import { ArrowLeftRight, ClipboardPaste, Copy, FileUp, History, Mic, Star, Trash2 } from "lucide-react";

const AUTO_MS = 450;

export function TranslatorPanel({ compact = true }: { compact?: boolean }) {
  const [from, setFrom] = useState("tr");
  const [to, setTo] = useState("en");
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const reqId = useRef(0);
  const lastHistorySource = useRef("");
  const dictationBase = useRef("");

  const { items, add, toggleFavorite, clear, exportJson } = useHistory();
  const { pins, togglePin, isPinned } = usePinnedPairs();
  const { isPairReady } = useLanguagePacks();
  const { settings, update, ready: settingsReady } = useMicSettings();
  const { devices, requestPermission } = useMicDevices();

  const dictLang = from === "auto" ? to : from;

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("gb-restore");
      if (!raw) return;
      const h = JSON.parse(raw) as { from: string; to: string; source: string; target: string };
      setFrom(h.from);
      setTo(h.to);
      setSource(h.source);
      setTarget(h.target);
      dictationBase.current = h.source;
      lastHistorySource.current = h.source;
      sessionStorage.removeItem("gb-restore");
    } catch {
      /* ignore */
    }
  }, []);

  const onDictation = useCallback((text: string, final: boolean) => {
    if (!text) return;
    if (final) {
      setSource((prev) => {
        const base = dictationBase.current || prev;
        const next = base ? `${base} ${text}`.trim() : text;
        dictationBase.current = next;
        return next;
      });
    } else {
      setSource(() => {
        const base = dictationBase.current;
        return base ? `${base} ${text}` : text;
      });
    }
  }, []);

  const { listening, supported, toggle, stop } = useSpeechDictation(dictLang, onDictation);

  useEffect(() => {
    if (settingsReady) requestPermission();
  }, [settingsReady, requestPermission]);

  useEffect(() => {
    if (listening) dictationBase.current = source;
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

  const runTranslate = useCallback(
    async (text: string, saveHistory: boolean) => {
      const trimmed = text.trim();
      if (!trimmed || !isPairReady(from, to)) return;

      const id = ++reqId.current;
      setLoading(true);
      try {
        const res = await translateText(trimmed, from, to);
        if (id !== reqId.current) return;
        setTarget(res.translated);
        if (saveHistory && trimmed !== lastHistorySource.current) {
          add({ source: trimmed, target: res.translated, from, to });
          lastHistorySource.current = trimmed;
        }
      } catch {
        if (id === reqId.current) {
          setTarget("Hata — backend (8000) ve QVAC (8765) çalışıyor mu?");
        }
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    },
    [from, to, add, isPairReady]
  );

  const commitTranslate = useCallback(() => {
    stop();
    runTranslate(source, true);
  }, [source, runTranslate, stop]);

  useEffect(() => {
    if (!source.trim()) {
      setTarget("");
      lastHistorySource.current = "";
      return;
    }
    if (!isPairReady(from, to)) return;

    const timer = setTimeout(() => {
      runTranslate(source, false);
    }, AUTO_MS);

    return () => clearTimeout(timer);
  }, [source, from, to, isPairReady, runTranslate]);

  const applyHistory = (h: { from: string; to: string; source: string; target: string }) => {
    setFrom(h.from);
    setTo(h.to);
    setSource(h.source);
    setTarget(h.target);
    dictationBase.current = h.source;
    lastHistorySource.current = h.source;
  };

  return (
    <div className={cn("flex flex-col gap-4", !compact && "xl:flex-row")}>
      <div className="min-w-0 flex-1">
        {pins.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {pins.map((k) => {
              const [f, t] = k.split("-");
              return (
                <button
                  key={k}
                  type="button"
                  className="rounded-full border border-[var(--gb-border)] px-2 py-0.5 text-xs text-[var(--gb-accent)]"
                  onClick={() => {
                    setFrom(f);
                    setTo(t);
                  }}
                >
                  {langName(f)} → {langName(t)}
                </button>
              );
            })}
          </div>
        )}

        <div className="gb-card overflow-hidden">
          <div className="flex items-end gap-2 border-b border-[var(--gb-border)] bg-[var(--gb-surface-2)] p-3">
            <div className="flex-1">
              <label className="text-[0.65rem] font-bold uppercase text-[var(--gb-muted)]">Kaynak</label>
              <select className="gb-select mt-1" value={from} onChange={(e) => setFrom(e.target.value)}>
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              disabled={from === "auto"}
              className="mb-1 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--gb-border)]"
              onClick={() => {
                setFrom(to);
                setTo(from);
                setSource(target);
                setTarget(source);
              }}
            >
              <ArrowLeftRight className="h-4 w-4" />
            </button>
            <div className="flex-1">
              <label className="text-[0.65rem] font-bold uppercase text-[var(--gb-muted)]">Hedef</label>
              <select className="gb-select mt-1" value={to} onChange={(e) => setTo(e.target.value)}>
                {LANGUAGES.filter((l) => l.code !== "auto").map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className={cn("mb-1 rounded-lg border p-2", isPinned(from, to) && "border-amber-400 text-amber-400")}
              onClick={() => togglePin(from, to)}
            >
              <Star className={cn("h-4 w-4", isPinned(from, to) && "fill-amber-400")} />
            </button>
          </div>

          <div className="grid md:grid-cols-2">
            <div className="border-[var(--gb-border)] md:border-r">
              <div className="gb-panel-head flex items-center justify-between">
                <span>Kaynak</span>
                {listening && (
                  <span className="flex items-center gap-1 font-normal normal-case text-[var(--gb-danger)]">
                    <Mic className="h-3 w-3 animate-pulse" /> dinleniyor
                  </span>
                )}
              </div>
              <textarea
                className="min-h-[220px] w-full resize-none bg-transparent p-4 outline-none"
                placeholder="Yazın veya mikrofonla dikte edin…"
                value={source}
                onChange={(e) => {
                  dictationBase.current = e.target.value;
                  setSource(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    commitTranslate();
                  }
                }}
              />
              <div className="flex flex-wrap gap-1 border-t border-[var(--gb-border)] p-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".txt"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const r = new FileReader();
                      r.onload = () => {
                        const t = String(r.result);
                        dictationBase.current = t;
                        setSource(t);
                      };
                      r.readAsText(f);
                    }
                  }}
                />
                <button
                  type="button"
                  className={cn("gb-btn-ghost text-xs", listening && "text-[var(--gb-danger)]")}
                  onClick={toggle}
                >
                  <Mic className="mr-1 inline h-3 w-3" />
                  {listening ? "Durdur" : "Dikte"}
                </button>
                <button type="button" className="gb-btn-ghost text-xs" onClick={() => fileRef.current?.click()}>
                  <FileUp className="mr-1 inline h-3 w-3" /> .txt
                </button>
                <button
                  type="button"
                  className="gb-btn-ghost text-xs"
                  onClick={() =>
                    navigator.clipboard.readText().then((t) => {
                      dictationBase.current = t;
                      setSource(t);
                    })
                  }
                >
                  <ClipboardPaste className="mr-1 inline h-3 w-3" /> Yapıştır
                </button>
                <button
                  type="button"
                  className="gb-btn-ghost text-xs"
                  onClick={() => {
                    stop();
                    setSource("");
                    setTarget("");
                    dictationBase.current = "";
                    lastHistorySource.current = "";
                  }}
                >
                  <Trash2 className="mr-1 inline h-3 w-3" /> Temizle
                </button>
              </div>
            </div>
            <div>
              <div className="gb-panel-head flex items-center justify-between">
                <span>Çeviri</span>
                {loading && <span className="font-normal normal-case text-[var(--gb-accent)]">çevriliyor…</span>}
              </div>
              <div className={cn("min-h-[220px] whitespace-pre-wrap p-4", loading && "opacity-70")}>
                {target || (source.trim() ? "…" : "Sonuç")}
              </div>
              <div className="flex justify-end gap-1 border-t border-[var(--gb-border)] p-2">
                <button
                  type="button"
                  className="gb-btn-ghost text-xs"
                  disabled={!target}
                  onClick={() => navigator.clipboard.writeText(target)}
                >
                  <Copy className="mr-1 inline h-3 w-3" /> Kopyala
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--gb-border)] bg-[var(--gb-surface-2)] px-4 py-3">
            <span className="text-xs text-[var(--gb-muted)]">
              Enter gönder · Ctrl+Shift+M dikte
              {compact && (
                <>
                  {" · "}
                  <Link href="/history" className="inline-flex items-center gap-1 text-[var(--gb-accent)] hover:underline">
                    <History className="h-3 w-3" />
                    Geçmiş
                  </Link>
                </>
              )}
            </span>
            <button
              type="button"
              className="gb-btn-primary"
              disabled={loading || !source.trim()}
              onClick={commitTranslate}
            >
              Gönder
            </button>
          </div>
          <PackManagerBar from={from} to={to} />
        </div>
      </div>

      {!compact && (
        <div className="flex flex-col gap-4 xl:w-72">
          <MicSidebar
            mode="dictation"
            devices={devices}
            deviceId={settings.deviceId}
            onDeviceChange={(id) => update({ deviceId: id })}
            listening={listening}
            onMicToggle={toggle}
            supported={supported}
            statusLabel={listening ? "Dinleniyor…" : undefined}
          />
          <HistoryPanel
            items={items}
            onToggleFavorite={toggleFavorite}
            onClear={clear}
            onExport={exportJson}
            onSelect={applyHistory}
          />
        </div>
      )}
    </div>
  );
}
