"use client";

import { useCallback, useRef, useState } from "react";

const SAMPLE_RATE = 16000;
const CHUNK_MS = 500;

export type AudioCaptureError =
  | "secure_context"
  | "denied"
  | "not_found"
  | "no_tab_audio"
  | "cancelled"
  | "unknown";

async function resumeContext(ctx: AudioContext) {
  if (ctx.state === "suspended") await ctx.resume();
}

export function useAudioCapture(onChunk: (pcm: ArrayBuffer) => void) {
  const [recording, setRecording] = useState(false);
  const [deviceId, setDeviceId] = useState<string | undefined>();
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const bufferRef = useRef<Float32Array[]>([]);

  const floatTo16BitPCM = (float32: Float32Array): ArrayBuffer => {
    const buffer = new ArrayBuffer(float32.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  };

  const stop = useCallback(() => {
    processorRef.current?.disconnect();
    ctxRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    processorRef.current = null;
    ctxRef.current = null;
    streamRef.current = null;
    bufferRef.current = [];
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
      sampleRate: SAMPLE_RATE,
    };
    if (deviceId) audioConstraints.deviceId = { exact: deviceId };

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
    } catch (err) {
      if (deviceId) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: SAMPLE_RATE,
            },
          });
        } catch (retryErr) {
          return mapMediaError(retryErr);
        }
      } else {
        return mapMediaError(err);
      }
    }

    try {
      const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
      await resumeContext(ctx);

      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);

      let samplesCollected = 0;
      const chunkSamples = (SAMPLE_RATE * CHUNK_MS) / 1000;

      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        bufferRef.current.push(new Float32Array(input));
        samplesCollected += input.length;

        if (samplesCollected >= chunkSamples) {
          const merged = new Float32Array(samplesCollected);
          let offset = 0;
          for (const buf of bufferRef.current) {
            merged.set(buf, offset);
            offset += buf.length;
          }
          onChunk(floatTo16BitPCM(merged));
          bufferRef.current = [];
          samplesCollected = 0;
        }
      };

      source.connect(processor);
      processor.connect(ctx.destination);

      streamRef.current = stream;
      ctxRef.current = ctx;
      processorRef.current = processor;
      setRecording(true);
      return null;
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      return "unknown";
    }
  }, [deviceId, onChunk, stop]);

  const listDevices = useCallback(async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === "audioinput");
  }, []);

  return { recording, start, stop, listDevices, setDeviceId, deviceId };
}

function mapMediaError(err: unknown): AudioCaptureError {
  const name = (err as DOMException)?.name || "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") return "denied";
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return "not_found";
  if (name === "AbortError") return "cancelled";
  return "unknown";
}

/** Capture system/tab audio via getDisplayMedia (Zoom/Meet/Teams) */
export function useTabAudioCapture(onChunk: (pcm: ArrayBuffer) => void) {
  const [capturing, setCapturing] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);

  const stopTabCapture = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
  }, []);

  const startTabCapture = useCallback(async (): Promise<AudioCaptureError | null> => {
    if (typeof window !== "undefined" && !window.isSecureContext) {
      return "secure_context";
    }

    stopTabCapture();

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
    } catch (err) {
      return mapMediaError(err);
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      stream.getTracks().forEach((t) => t.stop());
      return "no_tab_audio";
    }

    try {
      const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
      await resumeContext(ctx);

      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);

      let samplesCollected = 0;
      const chunkSamples = (SAMPLE_RATE * CHUNK_MS) / 1000;
      const bufferRef: Float32Array[] = [];

      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        bufferRef.push(new Float32Array(input));
        samplesCollected += input.length;

        if (samplesCollected >= chunkSamples) {
          const merged = new Float32Array(samplesCollected);
          let offset = 0;
          for (const buf of bufferRef) {
            merged.set(buf, offset);
            offset += buf.length;
          }
          onChunk(floatTo16BitPCM(merged));
          bufferRef.length = 0;
          samplesCollected = 0;
        }
      };

      source.connect(processor);
      processor.connect(ctx.destination);
      setCapturing(true);

      stopRef.current = () => {
        processor.disconnect();
        ctx.close();
        stream.getTracks().forEach((t) => t.stop());
        setCapturing(false);
      };
      return null;
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      return "unknown";
    }
  }, [onChunk, stopTabCapture]);

  return { capturing, startTabCapture, stopTabCapture };
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
