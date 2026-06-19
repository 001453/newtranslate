"use client";

import { Download, RefreshCw, CheckCircle2 } from "lucide-react";
import { useLocale } from "@/hooks/useLocale";
import { langName } from "@/lib/languages";
import { cn } from "@/lib/utils";

type Props = {
  from: string;
  to: string;
  ready: boolean;
  bundled: boolean;
  modelLoaded: boolean;
  qvacOnline: boolean;
  downloading: boolean;
  progress: number | null;
  onDownload: () => void;
  onRefresh: () => void;
  compact?: boolean;
};

export function PackManager(p: Props) {
  const { messages: m } = useLocale();

  if (p.bundled) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 border-t border-[var(--gb-border)] bg-[var(--gb-surface-2)] text-[var(--gb-success)]",
          p.compact ? "gb-pack-compact text-xs" : "px-4 py-3 text-sm"
        )}
      >
        <CheckCircle2 className="h-4 w-4" />
        {langName(p.from)} ↔ {langName(p.to)} {m.pack.bundled}
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t border-[var(--gb-border)] bg-[var(--gb-surface-2)]",
        p.compact ? "gb-pack-compact" : "p-4"
      )}
    >
      <div>
        <p className={cn("text-sm font-medium", p.ready ? "text-[var(--gb-success)]" : "text-[var(--gb-warning)]")}>
          {p.ready ? m.pack.enabled : `${m.pack.optional}: ${langName(p.from)} → ${langName(p.to)}`}
        </p>
        <p className="text-xs text-[var(--gb-muted)]">
          {p.modelLoaded ? m.pack.modelLoaded : m.pack.firstPack}
        </p>
        {p.downloading && p.progress != null && (
          <div className="mt-2 h-1 w-48 rounded bg-[var(--gb-border)]">
            <div className="h-full bg-[var(--gb-accent)]" style={{ width: `${p.progress}%` }} />
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button type="button" className="gb-btn-ghost border border-[var(--gb-border)]" onClick={p.onRefresh}>
          <RefreshCw className="mr-1 inline h-3 w-3" />
          {m.pack.refresh}
        </button>
        {!p.ready && (
          <button type="button" className="gb-btn-primary" disabled={p.downloading} onClick={p.onDownload}>
            <Download className="mr-1 inline h-4 w-4" />
            {p.downloading ? "…" : p.modelLoaded ? m.pack.activate : m.pack.download}
          </button>
        )}
      </div>
    </div>
  );
}
