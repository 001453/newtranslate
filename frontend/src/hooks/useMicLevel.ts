"use client";

import { useEffect, useRef, useState } from "react";

/** Live microphone RMS level (0–1) while `active`. */
export function useMicLevel(active: boolean, deviceId?: string) {
  const [level, setLevel] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      setLevel(0);
      return;
    }

    let cancelled = false;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;

    const stop = () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      ctx?.close();
      stream?.getTracks().forEach((t) => t.stop());
      ctx = null;
      stream = null;
    };

    const run = async () => {
      try {
        const audio: MediaTrackConstraints = deviceId ? { deviceId: { exact: deviceId } } : {};
        stream = await navigator.mediaDevices.getUserMedia({ audio });
        ctx = new AudioContext();
        if (ctx.state === "suspended") await ctx.resume();

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.65;
        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);

        const buf = new Float32Array(analyser.fftSize);

        const tick = () => {
          if (cancelled) return;
          analyser.getFloatTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
          const rms = Math.sqrt(sum / buf.length);
          setLevel((prev) => prev * 0.55 + rms * 0.45);
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        if (!cancelled) setLevel(0);
      }
    };

    void run();

    return () => {
      cancelled = true;
      stop();
      setLevel(0);
    };
  }, [active, deviceId]);

  return level;
}
