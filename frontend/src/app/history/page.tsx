"use client";

import { useRouter } from "next/navigation";
import { HistoryPanel } from "@/components/HistoryPanel";
import { useHistory } from "@/hooks/useLocalStore";

export default function HistoryPage() {
  const router = useRouter();
  const { items, toggleFavorite, clear, exportJson } = useHistory();

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h1 className="gb-page-title">Geçmiş</h1>
        <p className="gb-page-sub">Son çevirileriniz — birine tıklayarak çeviri ekranına dönün.</p>
      </div>
      <HistoryPanel
        items={items}
        onToggleFavorite={toggleFavorite}
        onClear={clear}
        onExport={exportJson}
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
