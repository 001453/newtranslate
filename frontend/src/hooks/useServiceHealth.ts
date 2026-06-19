"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchHealth } from "@/lib/api";

export type ServiceHealth = {
  apiOnline: boolean;
  qvacOnline: boolean;
  loading: boolean;
};

const POLL_MS = 12_000;

export function useServiceHealth() {
  const [health, setHealth] = useState<ServiceHealth>({
    apiOnline: false,
    qvacOnline: false,
    loading: true,
  });

  const refresh = useCallback(async () => {
    try {
      const data = await fetchHealth();
      setHealth({
        apiOnline: data.status === "ok",
        qvacOnline: Boolean(data.qvac_available),
        loading: false,
      });
    } catch {
      setHealth({ apiOnline: false, qvacOnline: false, loading: false });
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return { ...health, refresh };
}
