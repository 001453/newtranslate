"use client";

import type { HistoryItem } from "@/hooks/useLocalStore";
import { useLocale } from "@/hooks/useLocale";
import { langName } from "@/lib/languages";
import { cn } from "@/lib/utils";
import { Star, Trash2 } from "lucide-react";

export function HistoryPanel({
  items,
  onSelect,
  onToggleFavorite,
  onClear,
  onExport,
}: {
  items: HistoryItem[];
  onSelect: (h: HistoryItem) => void;
  onToggleFavorite: (id: string) => void;
  onClear: () => void;
  onExport: () => void;
}) {
  const { messages: m } = useLocale();

  return (
    <aside className="gb-card w-full lg:w-64">
      <div className="flex items-center justify-between border-b border-[var(--gb-border)] px-3 py-2">
        <span className="text-sm font-semibold">{m.history.panelTitle}</span>
        <div className="flex gap-1">
          <button type="button" className="gb-btn-ghost text-xs" onClick={onExport}>
            {m.history.export}
          </button>
          <button type="button" className="gb-btn-ghost" onClick={onClear}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <ul className="max-h-96 overflow-y-auto p-2">
        {items.length === 0 ? (
          <li className="p-2 text-xs text-[var(--gb-muted)]">{m.history.empty}</li>
        ) : (
          items.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                className="w-full rounded-lg p-2 text-left text-xs hover:bg-[rgba(59,142,234,0.08)]"
                onClick={() => onSelect(h)}
              >
                <div className="mb-1 flex justify-between text-[var(--gb-muted)]">
                  <span>
                    {langName(h.from)} → {langName(h.to)}
                  </span>
                  <Star
                    className={cn("h-3 w-3", h.favorite && "fill-amber-400 text-amber-400")}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(h.id);
                    }}
                  />
                </div>
                <p className="truncate">{h.source}</p>
                <p className="truncate text-[var(--gb-accent)]">{h.target}</p>
              </button>
            </li>
          ))
        )}
      </ul>
    </aside>
  );
}
