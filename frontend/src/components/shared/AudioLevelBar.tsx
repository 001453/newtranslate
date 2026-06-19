"use client";

import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";

type Props = {
  level: number;
  active: boolean;
  className?: string;
  compact?: boolean;
};

export function AudioLevelBar({ level, active, className, compact = false }: Props) {
  const { messages: m } = useLocale();
  const pct = Math.min(100, Math.round(level * 500));
  const hasSignal = level > 0.008;

  if (!active) return null;

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex justify-between text-xs text-[var(--gb-muted)]">
        <span>{hasSignal ? m.mic.audioReceiving : m.mic.audioSilent}</span>
        {!compact && <span>{pct}%</span>}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--gb-border)]">
        <div
          className={cn(
            "h-full transition-all duration-100",
            hasSignal ? "bg-[var(--gb-accent)]" : "bg-[var(--gb-warning)]"
          )}
          style={{ width: `${Math.max(hasSignal ? 4 : 0, pct)}%` }}
        />
      </div>
    </div>
  );
}
