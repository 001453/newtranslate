"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";

type Props = {
  level: number;
  active: boolean;
  className?: string;
  compact?: boolean;
  /** Dictation: level bar only — no "no signal" warning (Speech API owns the mic). */
  variant?: "live" | "dictation";
};

const SIGNAL_THRESHOLD = 0.004;
const GRACE_MS = 1500;

export function AudioLevelBar({
  level,
  active,
  className,
  compact = false,
  variant = "live",
}: Props) {
  const { messages: m } = useLocale();
  const [ready, setReady] = useState(false);
  const startedAt = useRef(0);

  useEffect(() => {
    if (!active) {
      setReady(false);
      startedAt.current = 0;
      return;
    }
    startedAt.current = Date.now();
    setReady(false);
    const timer = setTimeout(() => setReady(true), GRACE_MS);
    return () => clearTimeout(timer);
  }, [active]);

  const pct = Math.min(100, Math.round(level * 500));
  const hasSignal = level > SIGNAL_THRESHOLD;

  if (!active) return null;

  const isDictation = variant === "dictation";
  const showSilentWarning = !isDictation && ready && !hasSignal;
  const statusLabel = isDictation
    ? hasSignal
      ? m.mic.audioReceiving
      : ready
        ? m.mic.speakNow
        : m.mic.speakNow
    : !ready
      ? m.mic.speakNow
      : hasSignal
        ? m.mic.audioReceiving
        : m.mic.audioSilent;

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex justify-between text-xs text-[var(--gb-muted)]">
        <span>{statusLabel}</span>
        {!compact && <span>{pct}%</span>}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--gb-border)]">
        <div
          className={cn(
            "h-full transition-all duration-100",
            showSilentWarning ? "bg-[var(--gb-warning)]" : "bg-[var(--gb-accent)]"
          )}
          style={{ width: `${Math.max(hasSignal ? 4 : 0, pct)}%` }}
        />
      </div>
    </div>
  );
}
