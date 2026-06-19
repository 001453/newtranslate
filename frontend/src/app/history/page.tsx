"use client";

import { useRouter } from "next/navigation";
import { HistoryPanel } from "@/components/HistoryPanel";
import { useHistory } from "@/hooks/useLocalStore";
import { useLocale } from "@/hooks/useLocale";

export default function HistoryPage() {
  const router = useRouter();
  const { messages: m } = useLocale();
  const { items, toggleFavorite, clear, exportJson } = useHistory();

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <header className="gb-hero">
        <h1 className="gb-page-title text-2xl">{m.history.title}</h1>
        <p className="gb-page-sub mt-1">{m.history.subtitle}</p>
      </header>
      <HistoryPanel
        items={items}
        onToggleFavorite={toggleFavorite}
        onClear={clear}
        onExport={() => exportJson(m.history.exportFilename)}
        onSelect={(h) => {
          sessionStorage.setItem(
            "gb-restore",
            JSON.stringify({ from: h.from, to: h.to, source: h.source, target: h.target })
          );
          router.push("/");
        }}
      />
    </div>
  );
}
