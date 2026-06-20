"use client";

import { useCallback, useRef, useState } from "react";
import { micConstraints, resumeAudioContext } from "@/lib/micConstraints";
import { startPcmCapture } from "@/lib/pcmCapture";

const CHUNK_MS = 1200;
/** Skip near-silent chunks — reduces Whisper hallucinations on tab/music pauses. */
const MIN_RMS_TO_SEND = 0.006;

export type AudioCaptureError =
  | "secure_context"
  | "denied"
  | "not_found"
  | "no_tab_audio"
  | "cancelled"
  | "audio_suspended"
  | "unknown";

export type AudioCaptureStats = {
  level: number;
  chunksSent: number;
};

function mapMediaError(err: unknown): AudioCaptureError {
  const name = (err as DOMException)?.name || "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") return "denied";
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return "not_found";
  if (name === "AbortError") return "cancelled";
  return "unknown";
}

type CaptureOpts = {
  minRmsToSend?: number;
  micProfile?: "default" | "headset";
  strictDevice?: boolean;
  chunkMs?: number;
  overlapMs?: number;
};

export function useAudioCapture(
  onChunk: (pcm: ArrayBuffer) => void,
  onStats?: (s: AudioCaptureStats) => void,
  opts?: CaptureOpts
) {
  const minRms = opts?.minRmsToSend ?? MIN_RMS_TO_SEND;
  const micProfile = opts?.micProfile ?? "default";
  const strictDevice = opts?.strictDevice ?? false;
  const chunkMs = opts?.chunkMs ?? CHUNK_MS;
  const overlapMs = opts?.overlapMs ?? 0;
  const [recording, setRecording] = useState(false);
  const [deviceId, setDeviceId] = useState<string | undefined>();
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const stopProcessorRef = useRef<(() => void) | null>(null);
  const onChunkRef = useRef(onChunk);
  const onStatsRef = useRef(onStats);
  onChunkRef.current = onChunk;
  onStatsRef.current = onStats;

  const stop = useCallback(() => {
    stopProcessorRef.current?.();
    stopProcessorRef.current = null;
    ctxRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    ctxRef.current = null;
    streamRef.current = null;
    setRecording(false);
  }, []);

  const start = useCallback(async (preferredDeviceId?: string): Promise<AudioCaptureError | null> => {
    if (typeof window !== "undefined" && !window.isSecureContext) {
      return "secure_context";
    }

    stop();

    const ctx = new AudioContext({ latencyHint: "interactive" });
    await resumeAudioContext(ctx);

    const activeDevice = preferredDeviceId || deviceId;
    let stream: MediaStream;

    const tryGetUserMedia = async (dev: string | undefined, profile: "default" | "headset", strict: boolean) =>
      navigator.mediaDevices.getUserMedia({
        audio: micConstraints(dev, profile, strict),
      });

    try {
      stream = await tryGetUserMedia(activeDevice, micProfile, strictDevice);
    } catch (err) {
      if (activeDevice || micProfile === "headset") {
        try {
          stream = await tryGetUserMedia(activeDevice, micProfile, false);
        } catch (retryErr) {
          if (micProfile === "headset") {
            try {
              stream = await tryGetUserMedia(activeDevice, "default", false);
            } catch (fallbackErr) {
              ctx.close();
              return mapMediaError(fallbackErr);
            }
          } else {
            ctx.close();
            return mapMediaError(retryErr);
          }
        }
      } else {
        ctx.close();
        return mapMediaError(err);
      }
    }

    await resumeAudioContext(ctx);
    if (ctx.state !== "running") {
      stream.getTracks().forEach((t) => t.stop());
      ctx.close();
      return "audio_suspended";
    }

    const track = stream.getAudioTracks()[0];
    if (!track || track.readyState === "ended") {
      stream.getTracks().forEach((t) => t.stop());
      ctx.close();
      return "not_found";
    }

    try {
      stopProcessorRef.current = await startPcmCapture(
        { ctx, stream, chunkMs, minRmsToSend: minRms, overlapMs },
        {
          onChunk: (pcm) => onChunkRef.current(pcm),
          onStats: (s) => onStatsRef.current?.(s),
        }
      );
      streamRef.current = stream;
      ctxRef.current = ctx;
      setRecording(true);
      return null;
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      ctx.close();
      return "unknown";
    }
  }, [chunkMs, deviceId, micProfile, minRms, overlapMs, stop, strictDevice]);

  const listDevices = useCallback(async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === "audioinput");
  }, []);

  return { recording, start, stop, listDevices, setDeviceId, deviceId };
}

const LIVE_CHUNK_MS = 2500;
const LIVE_OVERLAP_MS = 600;
const LIVE_MIN_RMS = 0.005;

/** Capture system/tab audio via getDisplayMedia (YouTube / Zoom / Meet) */
export function useTabAudioCapture(
  onChunk: (pcm: ArrayBuffer) => void,
  onStats?: (s: AudioCaptureStats) => void,
  opts?: Pick<CaptureOpts, "chunkMs" | "overlapMs" | "minRmsToSend">
) {
  const chunkMs = opts?.chunkMs ?? LIVE_CHUNK_MS;
  const overlapMs = opts?.overlapMs ?? LIVE_OVERLAP_MS;
  const minRms = opts?.minRmsToSend ?? LIVE_MIN_RMS;
  const [capturing, setCapturing] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);
  const onChunkRef = useRef(onChunk);
  const onStatsRef = useRef(onStats);
  onChunkRef.current = onChunk;
  onStatsRef.current = onStats;

  const stopTabCapture = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
    setCapturing(false);
  }, []);

  const startTabCapture = useCallback(async (): Promise<AudioCaptureError | null> => {
    if (typeof window !== "undefined" && !window.isSecureContext) {
      return "secure_context";
    }

    stopTabCapture();

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" } as MediaTrackConstraints,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          suppressLocalAudioPlayback: false,
        },
        preferCurrentTab: false,
      } as DisplayMediaStreamOptions);
    } catch (err) {
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
      } catch (fallbackErr) {
        return mapMediaError(fallbackErr);
      }
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      stream.getTracks().forEach((t) => t.stop());
      return "no_tab_audio";
    }

    try {
      const ctx = new AudioContext();
      await resumeAudioContext(ctx);
      const stopProcessor = await startPcmCapture(
        { ctx, stream, chunkMs, minRmsToSend: minRms, overlapMs },
        {
          onChunk: (pcm) => onChunkRef.current(pcm),
          onStats: (s) => onStatsRef.current?.(s),
        }
      );
      setCapturing(true);

      stopRef.current = () => {
        stopProcessor();
        ctx.close();
        stream.getTracks().forEach((t) => t.stop());
        setCapturing(false);
      };
      return null;
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      return "unknown";
    }
  }, [chunkMs, minRms, overlapMs, stopTabCapture]);

  return { capturing, startTabCapture, stopTabCapture };
}
