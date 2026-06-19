"use client";

import { useServiceHealth } from "@/hooks/useServiceHealth";
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

function StatusPill({ label, ok, loading }: { label: string; ok: boolean; loading?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide",
        loading
          ? "border-[var(--gb-border)] text-[var(--gb-muted)]"
          : ok
            ? "border-[rgba(34,197,94,0.35)] bg-[rgba(34,197,94,0.1)] text-[var(--gb-success)]"
            : "border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.1)] text-[var(--gb-danger)]"
      )}
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {label}
    </span>
  );
}

export function ServiceStatusBar() {
  const { messages: m } = useLocale();
  const { apiOnline, qvacOnline, loading } = useServiceHealth();

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <StatusPill label={m.home.statusApi} ok={apiOnline} loading={loading} />
      <StatusPill label={m.home.statusQvac} ok={qvacOnline} loading={loading && apiOnline} />
    </div>
  );
}
