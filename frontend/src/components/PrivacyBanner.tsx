"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/types";
import { useLocale } from "@/hooks/useLocale";
import { Shield, ShieldAlert, Cloud } from "lucide-react";
import { cn } from "@/lib/utils";

interface PrivacyStatus {
  mode: string;
  local_processing_only: boolean;
  translation_provider: string;
  qvac_available: boolean;
  cloud_allowed: boolean;
  data_egress_points?: unknown;
  guarantees?: unknown;
}

function normalizePrivacyStatus(raw: unknown): PrivacyStatus | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  return {
    mode: String(s.mode ?? "hybrid"),
    local_processing_only: Boolean(s.local_processing_only),
    translation_provider: String(s.translation_provider ?? "unknown"),
    qvac_available: Boolean(s.qvac_available),
    cloud_allowed: Boolean(s.cloud_allowed),
    data_egress_points: Array.isArray(s.data_egress_points) ? s.data_egress_points : [],
    guarantees: Array.isArray(s.guarantees) ? s.guarantees : [],
  };
}

export function PrivacyBanner() {
  const { messages: m } = useLocale();
  const [status, setStatus] = useState<PrivacyStatus | null>(null);

  useEffect(() => {
    const load = () =>
      fetch(`${API_BASE}/api/v1/privacy/status`)
        .then((r) => r.json())
        .then((data) => setStatus(normalizePrivacyStatus(data)))
        .catch(() => null);

    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  if (!status) return null;

  const isSovereign = status.mode === "sovereign" || status.local_processing_only;
  const egress = (status.data_egress_points as string[]) ?? [];

  return (
    <div
      className={cn(
        isSovereign ? "gb-alert-success" : status.mode === "cloud" ? "gb-alert-warning" : "gb-alert-info"
      )}
    >
      <div className="flex items-center gap-2 font-medium">
        {isSovereign ? (
          <Shield className="h-4 w-4" />
        ) : status.mode === "cloud" ? (
          <Cloud className="h-4 w-4" />
        ) : (
          <ShieldAlert className="h-4 w-4" />
        )}
        {isSovereign ? m.privacy.sovereign : status.mode === "cloud" ? m.privacy.cloud : m.privacy.hybrid}
      </div>
      <div className="mt-1 text-xs opacity-80">
        {m.privacy.provider}: {status.translation_provider}
        {status.qvac_available ? ` · ${m.privacy.qvacOn}` : ` · ${m.privacy.qvacOff}`}
      </div>
      {egress.length > 0 && (
        <ul className="mt-1 list-inside list-disc text-xs opacity-75">
          {egress.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
