"use client";

import { useEffect, useRef } from "react";
import type { MicDevice } from "@/hooks/useMicDevices";

const PREFERRED_MIC = /hyperx|cloud|headset|usb|external|microphone\s*\(/i;

/** Clear stale saved mic IDs and prefer a newly plugged USB/headset mic. */
export function useMicDeviceGuard(
  deviceId: string,
  devices: MicDevice[],
  ready: boolean,
  update: (patch: { deviceId: string }) => void
) {
  const prevCountRef = useRef(0);

  useEffect(() => {
    if (!ready) return;

    const count = devices.length;
    const pluggedNew = count > prevCountRef.current && prevCountRef.current > 0;
    prevCountRef.current = count;

    if (count === 0) return;

    const known = !deviceId || devices.some((d) => d.deviceId === deviceId);
    if (deviceId && !known) {
      const preferred = devices.find((d) => PREFERRED_MIC.test(d.label));
      update({ deviceId: preferred?.deviceId ?? "" });
      return;
    }

    if (!deviceId && count > 0) {
      const labeled = devices.filter((d) => d.label && d.label !== "Mikrofon");
      if (labeled.length > 0) {
        const preferred = labeled.find((d) => PREFERRED_MIC.test(d.label));
        update({ deviceId: preferred?.deviceId ?? labeled[0].deviceId });
        return;
      }
    }

    if (!deviceId && pluggedNew) {
      const preferred = devices.find(
        (d) => PREFERRED_MIC.test(d.label) && d.deviceId && d.deviceId !== "default"
      );
      if (preferred) update({ deviceId: preferred.deviceId });
    }
  }, [deviceId, devices, ready, update]);
}
