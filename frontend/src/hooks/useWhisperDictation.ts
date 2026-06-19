"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAudioCapture, type AudioCaptureError } from "@/hooks/useAudioCapture";
import { transcribePcm } from "@/lib/api";
import {
  dictationLog,
  EMPTY_DICTATION_DEBUG,
  type DictationDebugState,
} from "@/lib/dictationDebug";
import { mergeDictationChunk } from "@/lib/dictationMerge";

const DICTATION_CHUNK_MS = 2000;
const DICTATION_OVERLAP_MS = 400;

function mapCaptureError(code: AudioCaptureError): string {
  if (code === "denied") return "denied";
  if (code === "secure_context") return "secure_context";
  if (code === "not_found") return "not_found";
  if (code === "audio_suspended") return "audio_suspended";
  return "unknown";
}

/** Local Whisper dictation via backend — reliable on Windows (single mic stream). */
export function useWhisperDictation(
  langCode: string,
  deviceId: string | undefined,
  onTranscript: (text: string, final: boolean) => void
) {
  const [listening, setListening] = useState(false);
  const [supported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [debug, setDebug] = useState<DictationDebugState>({
    ...EMPTY_DICTATION_DEBUG,
    phase: "whisper",
  });

  const onTranscriptRef = useRef(onTranscript);
  const langRef = useRef(langCode);
  const deviceRef = useRef(deviceId);
  const transcriptRef = useRef("");
  const resultCountRef = useRef(0);
  const chunkCountRef = useRef(0);
  const queueRef = useRef<ArrayBuffer[]>([]);
  const drainingRef = useRef(false);

  onTranscriptRef.current = onTranscript;
  langRef.current = langCode;
  deviceRef.current = deviceId;

  const patchDebug = useCallback((patch: Partial<DictationDebugState>) => {
    setDebug((prev) => ({ ...prev, ...patch, updatedAt: Date.now() }));
  }, []);

  const drainQueue = useCallback(async () => {
    if (drainingRef.current) return;
    drainingRef.current = true;

    while (queueRef.current.length > 0) {
      const pcm = queueRef.current.shift()!;
      dictationLog("whisper_transcribe", { bytes: pcm.byteLength });

      try {
        const result = await transcribePcm(pcm, langRef.current, {
          mode: "dictation",
          prevText: transcriptRef.current,
        });
        const text = result.text.trim();
        patchDebug({
          lang: langRef.current,
          lastText: text,
          lastError: text ? "" : "empty_chunk",
          phase: text ? "result_final" : "empty_chunk",
          speechStarted: Boolean(text),
        });

        if (text) {
          const delta = mergeDictationChunk(transcriptRef.current, text);
          if (delta) {
            resultCountRef.current += 1;
            transcriptRef.current = transcriptRef.current
              ? `${transcriptRef.current} ${delta}`.trim()
              : delta;
            patchDebug({ results: resultCountRef.current });
            setError(null);
            onTranscriptRef.current(delta, true);
          }
        }
      } catch (err) {
        dictationLog("whisper_error", err);
        patchDebug({ lastError: "transcribe_failed", phase: "error:transcribe" });
        setError("unknown");
      }
    }

    drainingRef.current = false;
  }, [patchDebug]);

  const onStats = useCallback(
    (stats: { level: number; chunksSent: number }) => {
      setLevel(stats.level);
      const pct = Math.min(100, Math.round(stats.level * 500));
      patchDebug({
        levelPct: pct,
        chunks: stats.chunksSent,
        audioStarted: stats.chunksSent > 0 || stats.level > 0.001,
        phase:
          stats.chunksSent > 0
            ? "streaming"
            : stats.level > 0.001
              ? "hearing_audio"
              : "listening",
      });
    },
    [patchDebug]
  );

  const onChunk = useCallback(
    (pcm: ArrayBuffer) => {
      chunkCountRef.current += 1;
      queueRef.current.push(pcm);
      patchDebug({ chunks: chunkCountRef.current, phase: "chunk_queued" });
      void drainQueue();
    },
    [drainQueue, patchDebug]
  );

  const { start: startCapture, stop: stopCapture, setDeviceId } = useAudioCapture(onChunk, onStats, {
    minRmsToSend: 0.004,
    micProfile: "headset",
    strictDevice: Boolean(deviceId),
    chunkMs: DICTATION_CHUNK_MS,
    overlapMs: DICTATION_OVERLAP_MS,
  });

  useEffect(() => {
    setDeviceId(deviceId || undefined);
  }, [deviceId, setDeviceId]);

  const start = useCallback(async () => {
    dictationLog("whisper_start", { lang: langRef.current, device: deviceRef.current });
    transcriptRef.current = "";
    resultCountRef.current = 0;
    chunkCountRef.current = 0;
    queueRef.current = [];
    setError(null);
    setListening(true);
    patchDebug({
      ...EMPTY_DICTATION_DEBUG,
      phase: "starting",
      lang: langRef.current,
    });

    const err = await startCapture(deviceRef.current || undefined);
    if (err) {
      setListening(false);
      setError(mapCaptureError(err));
      patchDebug({ phase: `error:${err}`, lastError: err, audioStarted: false });
    } else {
      patchDebug({
        phase: "listening",
        audioStarted: true,
        lastError: deviceRef.current ? "" : "default_mic",
      });
    }
  }, [patchDebug, startCapture]);

  const stop = useCallback(() => {
    dictationLog("whisper_stop");
    queueRef.current = [];
    stopCapture();
    setListening(false);
    patchDebug({ phase: "stopped", audioStarted: false, speechStarted: false });
  }, [patchDebug, stopCapture]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else void start();
  }, [listening, start, stop]);

  const stopRef = useRef(stop);
  stopRef.current = stop;

  useEffect(() => {
    return () => {
      stopRef.current();
    };
  }, []);

  return { listening, supported, error, start, stop, toggle, debug, level };
}
