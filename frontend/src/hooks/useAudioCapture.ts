"use client";

import { useCallback, useRef, useState } from "react";

const TARGET_RATE = 16000;
const CHUNK_MS = 500;

export type AudioCaptureError =
  | "secure_context"
  | "denied"
  | "not_found"
  | "no_tab_audio"
  | "cancelled"
  | "unknown";

export type AudioCaptureStats = {
  level: number;
  chunksSent: number;
};

async function resumeContext(ctx: AudioContext) {
  if (ctx.state === "suspended") await ctx.resume();
}

function downsampleTo16k(input: Float32Array, inputRate: number): Float32Array {
  if (inputRate === TARGET_RATE) return input;
  const ratio = inputRate / TARGET_RATE;
  const outLen = Math.max(1, Math.floor(input.length / ratio));
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    out[i] = input[Math.floor(i * ratio)] ?? 0;
  }
  return out;
}

function rmsLevel(samples: Float32Array): number {
  if (!samples.length) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / samples.length);
}

function floatTo16BitPCM(float32: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

function mapMediaError(err: unknown): AudioCaptureError {
  const name = (err as DOMException)?.name || "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") return "denied";
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return "not_found";
  if (name === "AbortError") return "cancelled";
  return "unknown";
}

type ProcessorOpts = {
  ctx: AudioContext;
  stream: MediaStream;
  onChunk: (pcm: ArrayBuffer) => void;
  onStats?: (stats: AudioCaptureStats) => void;
};

function startPcmProcessor({ ctx, stream, onChunk, onStats }: ProcessorOpts) {
  const audioOnly = new MediaStream(stream.getAudioTracks());
  const source = ctx.createMediaStreamSource(audioOnly);
  const processor = ctx.createScriptProcessor(4096, 1, 1);

  let samplesCollected = 0;
  let chunksSent = 0;
  const chunkSamples = Math.floor((TARGET_RATE * CHUNK_MS) / 1000);
  const bufferRef: Float32Array[] = [];

  processor.onaudioprocess = (e) => {
    const input = e.inputBuffer.getChannelData(0);
    const level = rmsLevel(input);
    const resampled = downsampleTo16k(input, ctx.sampleRate);

    bufferRef.push(resampled);
    samplesCollected += resampled.length;

    if (samplesCollected >= chunkSamples) {
      const merged = new Float32Array(samplesCollected);
      let offset = 0;
      for (const buf of bufferRef) {
        merged.set(buf, offset);
        offset += buf.length;
      }
      const slice = merged.subarray(0, chunkSamples);
      const remainder = merged.subarray(chunkSamples);
      onChunk(floatTo16BitPCM(slice));
      chunksSent += 1;
      onStats?.({ level, chunksSent });
      bufferRef.length = 0;
      if (remainder.length) bufferRef.push(remainder);
      samplesCollected = remainder.length;
    } else {
      onStats?.({ level, chunksSent });
    }
  };

  source.connect(processor);
  processor.connect(ctx.destination);

  return () => {
    processor.disconnect();
    source.disconnect();
  };
}

export function useAudioCapture(onChunk: (pcm: ArrayBuffer) => void, onStats?: (s: AudioCaptureStats) => void) {
  const [recording, setRecording] = useState(false);
  const [deviceId, setDeviceId] = useState<string | undefined>();
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const stopProcessorRef = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    stopProcessorRef.current?.();
    stopProcessorRef.current = null;
    ctxRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    ctxRef.current = null;
    streamRef.current = null;
    setRecording(false);
  }, []);

  const start = useCallback(async (): Promise<AudioCaptureError | null> => {
    if (typeof window !== "undefined" && !window.isSecureContext) {
      return "secure_context";
    }

    stop();

    const audioConstraints: MediaTrackConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    };
    if (deviceId) audioConstraints.deviceId = { exact: deviceId };

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
    } catch (err) {
      if (deviceId) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          });
        } catch (retryErr) {
          return mapMediaError(retryErr);
        }
      } else {
        return mapMediaError(err);
      }
    }

    try {
      const ctx = new AudioContext();
      await resumeContext(ctx);
      stopProcessorRef.current = startPcmProcessor({ ctx, stream, onChunk, onStats });
      streamRef.current = stream;
      ctxRef.current = ctx;
      setRecording(true);
      return null;
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      return "unknown";
    }
  }, [deviceId, onChunk, onStats, stop]);

  const listDevices = useCallback(async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === "audioinput");
  }, []);

  return { recording, start, stop, listDevices, setDeviceId, deviceId };
}

/** Capture system/tab audio via getDisplayMedia (YouTube / Zoom / Meet) */
export function useTabAudioCapture(onChunk: (pcm: ArrayBuffer) => void, onStats?: (s: AudioCaptureStats) => void) {
  const [capturing, setCapturing] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);

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
        // Chrome: prefer tab/window picker with audio option
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
      await resumeContext(ctx);
      const stopProcessor = startPcmProcessor({ ctx, stream, onChunk, onStats });
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
  }, [onChunk, onStats, stopTabCapture]);

  return { capturing, startTabCapture, stopTabCapture };
}
