"use client";

import { Keyboard, Mic, RefreshCw, Volume2 } from "lucide-react";
import { AudioLevelBar } from "@/components/shared/AudioLevelBar";
import { DictationDebugPanel } from "@/components/shared/DictationDebugPanel";
import { useMicLevel } from "@/hooks/useMicLevel";
import { useLocale } from "@/hooks/useLocale";
import type { DictationDebugState } from "@/lib/dictationDebug";
import { cn } from "@/lib/utils";

type Device = { deviceId: string; label: string };

export function MicSidebar({
  mode,
  devices,
  deviceId,
  onDeviceChange,
  listening,
  onMicToggle,
  supported = true,
  fontSize,
  onFontSizeChange,
  sessionActive,
  statusLabel,
  hideAudioMeter = false,
  dictationDebug,
  dictationLevel,
  onRefreshDevices,
}: {
  mode: "live" | "dictation";
  devices: Device[];
  deviceId: string;
  onDeviceChange: (id: string) => void;
  listening: boolean;
  onMicToggle: () => void;
  supported?: boolean;
  fontSize?: number;
  onFontSizeChange?: (n: number) => void;
  sessionActive?: boolean;
  statusLabel?: string;
  hideAudioMeter?: boolean;
  dictationDebug?: DictationDebugState;
  /** Whisper dictation level (0–1) — no extra mic stream. */
  dictationLevel?: number;
  onRefreshDevices?: () => void;
}) {
  const { messages: m } = useLocale();
  const locked = mode === "live" && sessionActive;
  const meterActive = listening && !hideAudioMeter && mode === "live";
  const audioLevel = useMicLevel(meterActive, deviceId || undefined);
  const previewActive = mode === "dictation" && !listening;
  const previewLevel = useMicLevel(previewActive, deviceId || undefined);
  const dictationMeterActive = listening && mode === "dictation" && dictationLevel != null;
  const deviceKnown =
    !deviceId || devices.length === 0 || devices.some((d) => d.deviceId === deviceId);

  const hotkeys =
    mode === "live"
      ? [
          { keys: "Ctrl + Shift + L", action: m.mic.hotkeys.sessionToggle },
          { keys: "Ctrl + Shift + M", action: m.mic.hotkeys.micToggle },
        ]
      : [
          { keys: "Ctrl + Shift + M", action: m.mic.hotkeys.dictateToggle },
          { keys: "Enter", action: m.mic.hotkeys.send },
          { keys: "Shift + Enter", action: m.mic.hotkeys.newLine },
        ];

  const defaultStatus =
    statusLabel ||
    (listening
      ? m.mic.speakNow
      : mode === "live"
        ? sessionActive
          ? m.mic.micOff
          : m.mic.waitingSession
        : m.mic.dictationToField);

  return (
    <div className="space-y-4 lg:w-72 lg:shrink-0">
      <div className="gb-card overflow-hidden">
        <div className="gb-panel-head flex items-center gap-2">
          <Mic className="h-3.5 w-3.5" />
          {m.mic.title}
        </div>
        <div className="space-y-3 p-4">
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className="text-xs text-[var(--gb-muted)]">{m.mic.inputDevice}</label>
              {onRefreshDevices && (
                <button
                  type="button"
                  onClick={onRefreshDevices}
                  disabled={locked || listening}
                  className="flex items-center gap-1 text-[0.65rem] text-[var(--gb-accent)] hover:underline disabled:opacity-40"
                  title={m.mic.refreshDevices}
                >
                  <RefreshCw className="h-3 w-3" />
                  {m.mic.refreshDevices}
                </button>
              )}
            </div>
            <select
              className="gb-select"
              value={deviceId}
              onChange={(e) => onDeviceChange(e.target.value)}
              disabled={locked || listening}
            >
              <option value="">{m.mic.defaultMic}</option>
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || m.mic.micFallback}
                </option>
              ))}
            </select>
            {!deviceKnown && (
              <p className="mt-1 text-[0.65rem] text-[var(--gb-warning)]">{m.mic.deviceUnknown}</p>
            )}
            <p className="mt-1 text-[0.65rem] leading-relaxed text-[var(--gb-muted)]">
              {m.mic.devicePlugHint}
            </p>
          </div>

          <button
            type="button"
            onClick={onMicToggle}
            disabled={!supported}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition",
              listening
                ? "border-[var(--gb-danger)] bg-[var(--gb-danger)]/10 text-[var(--gb-danger)]"
                : "border-[var(--gb-border)] hover:border-[var(--gb-accent)] hover:text-[var(--gb-accent)]"
            )}
          >
            <Mic className="h-4 w-4" />
            {listening
              ? m.mic.stopDictation
              : mode === "live"
                ? m.mic.micButton
                : m.mic.startDictation}
          </button>

          <div
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
              listening
                ? "border-[var(--gb-danger)] text-[var(--gb-danger)]"
                : "border-[var(--gb-border)] text-[var(--gb-muted)]"
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                listening ? "animate-pulse bg-[var(--gb-danger)]" : "bg-[var(--gb-border)]"
              )}
            />
            {defaultStatus}
          </div>

          {previewActive && (
            <AudioLevelBar level={previewLevel} active={previewActive} variant="dictation" />
          )}

          {meterActive && <AudioLevelBar level={audioLevel} active={meterActive} />}

          {previewActive && (
            <p className="text-[0.65rem] leading-relaxed text-[var(--gb-muted)]">{m.mic.micPreviewHint}</p>
          )}

          {dictationMeterActive && (
            <AudioLevelBar
              level={dictationLevel ?? 0}
              active={dictationMeterActive}
              variant="dictation"
            />
          )}

          {!supported && (
            <p className="text-[0.65rem] text-[var(--gb-danger)]">{m.mic.unsupported}</p>
          )}

          {mode === "dictation" && listening && dictationDebug && (
            <DictationDebugPanel debug={dictationDebug} />
          )}

          {mode === "dictation" && (
            <p className="text-[0.65rem] leading-relaxed text-[var(--gb-muted)]">{m.mic.dictationHint}</p>
          )}
        </div>
      </div>

      {mode === "live" && fontSize != null && onFontSizeChange && (
        <div className="gb-card overflow-hidden">
          <div className="gb-panel-head flex items-center gap-2">
            <Volume2 className="h-3.5 w-3.5" />
            {m.mic.caption}
          </div>
          <div className="p-4">
            <label className="mb-2 flex justify-between text-xs text-[var(--gb-muted)]">
              <span>{m.mic.fontSize}</span>
              <span>{fontSize}px</span>
            </label>
            <input
              type="range"
              min={20}
              max={48}
              value={fontSize}
              onChange={(e) => onFontSizeChange(Number(e.target.value))}
              className="w-full accent-[var(--gb-accent)]"
            />
          </div>
        </div>
      )}

      <div className="gb-card overflow-hidden">
        <div className="gb-panel-head flex items-center gap-2">
          <Keyboard className="h-3.5 w-3.5" />
          {m.mic.shortcuts}
        </div>
        <ul className="divide-y divide-[var(--gb-border)] text-sm">
          {hotkeys.map((h) => (
            <li key={h.keys} className="flex items-center justify-between gap-2 px-4 py-2.5">
              <span className="text-[var(--gb-muted)]">{h.action}</span>
              <kbd className="shrink-0 rounded border border-[var(--gb-border)] bg-[var(--gb-surface-2)] px-2 py-0.5 font-mono text-[0.65rem]">
                {h.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
