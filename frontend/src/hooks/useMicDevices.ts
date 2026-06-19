"use client";

import { useCallback, useEffect, useState } from "react";

export type MicDevice = { deviceId: string; label: string };

export function useMicDevices() {
  const [devices, setDevices] = useState<MicDevice[]>([]);

  const refresh = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const list = await navigator.mediaDevices.enumerateDevices();
      const seen = new Set<string>();
      setDevices(
        list
          .filter((d) => d.kind === "audioinput" && d.deviceId)
          .filter((d) => {
            if (seen.has(d.deviceId)) return false;
            seen.add(d.deviceId);
            return true;
          })
          .map((d) => ({ deviceId: d.deviceId, label: d.label || "Mikrofon" }))
      );
    } catch {
      setDevices([]);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      await refresh();
    } catch {
      /* izin reddedildi */
    }
  }, [refresh]);

  useEffect(() => {
    void refresh();
    const onChange = () => {
      void refresh();
    };
    navigator.mediaDevices?.addEventListener("devicechange", onChange);
    return () => navigator.mediaDevices?.removeEventListener("devicechange", onChange);
  }, [refresh]);

  return { devices, refresh, requestPermission };
}
