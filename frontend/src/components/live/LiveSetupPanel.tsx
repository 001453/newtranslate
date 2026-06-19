"use client";

import { useEffect, useState } from "react";
import { ChromeRequiredBanner } from "@/components/shared/ChromeRequiredBanner";
import { useLocale } from "@/hooks/useLocale";
import { getLiveEndpoints, type LiveEndpoints } from "@/lib/endpoints";
import { Copy, Link2, Radio, Server } from "lucide-react";

function EndpointRow({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="rounded-lg border border-[var(--gb-border)] bg-[var(--gb-surface-2)] p-2.5">
      <div className="mb-1 text-[0.65rem] font-bold uppercase tracking-wide text-[var(--gb-muted)]">{label}</div>
      <div className="flex items-start gap-2">
        <code className="min-w-0 flex-1 break-all text-xs text-[var(--gb-accent)]">{value}</code>
        <button type="button" className="gb-btn-ghost shrink-0 px-2 py-1 text-xs" onClick={onCopy} title={copied ? "" : "copy"}>
          <Copy className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export function LiveSetupPanel({ onHide }: { onHide: () => void }) {
  const { messages: m } = useLocale();
  const [endpoints, setEndpoints] = useState<LiveEndpoints | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    setEndpoints(getLiveEndpoints());
  }, []);

  const copy = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-4">
      <ChromeRequiredBanner />
      <div className="gb-card p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-semibold">
            <Radio className="h-4 w-4 text-[var(--gb-accent)]" />
            {m.meeting.liveGuideTitle}
          </h2>
          <button type="button" className="gb-btn-ghost text-xs" onClick={onHide}>
            {m.meeting.hide}
          </button>
        </div>
        <p className="mb-3 text-xs text-[var(--gb-muted)]">{m.meeting.liveGuideHint}</p>
        <ol className="space-y-3">
          {m.meeting.youtubeSteps.map((s, i) => (
            <li key={s.title} className="flex gap-3 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--gb-accent-muted)] text-xs font-bold text-[var(--gb-accent)]">
                {i + 1}
              </span>
              <div>
                <div className="font-medium">{s.title}</div>
                <p className="text-[var(--gb-muted)]">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {endpoints && (
        <div className="gb-card p-5">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
            <Server className="h-4 w-4 text-[var(--gb-accent)]" />
            {m.meeting.endpointsTitle}
          </h2>
          <p className="mb-3 text-xs text-[var(--gb-muted)]">{m.meeting.endpointsHint}</p>
          <div className="mb-3 flex items-center gap-2 text-xs text-[var(--gb-muted)]">
            <Link2 className="h-3.5 w-3.5" />
            {m.meeting.endpointsHost}: <strong className="text-[var(--gb-text)]">{endpoints.host}</strong>
          </div>
          <div className="space-y-2">
            <EndpointRow
              label={m.meeting.endpointWs}
              value={endpoints.wsLive}
              copied={copiedKey === "ws"}
              onCopy={() => void copy("ws", endpoints.wsLive)}
            />
            <EndpointRow
              label={m.meeting.endpointApi}
              value={endpoints.apiBase}
              copied={copiedKey === "api"}
              onCopy={() => void copy("api", endpoints.apiBase)}
            />
            <EndpointRow
              label={m.meeting.endpointTranscript}
              value={endpoints.transcript}
              copied={copiedKey === "transcript"}
              onCopy={() => void copy("transcript", endpoints.transcript)}
            />
            <EndpointRow
              label={m.meeting.endpointSummary}
              value={endpoints.summary}
              copied={copiedKey === "summary"}
              onCopy={() => void copy("summary", endpoints.summary)}
            />
            <EndpointRow
              label={m.meeting.endpointHealth}
              value={endpoints.health}
              copied={copiedKey === "health"}
              onCopy={() => void copy("health", endpoints.health)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
