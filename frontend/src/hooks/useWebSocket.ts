"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CaptionLine, LiveSessionConfig, MeetingSummary, PipelineResult } from "@/lib/types";
import type { MeetingExportPayload } from "@/lib/meetingExport";
import { WS_URL } from "@/lib/types";

type WsMessage = {
  event: string;
  payload: Record<string, unknown>;
  session_id?: string;
};

const MAX_RECONNECT_DELAY_MS = 30_000;

function normCaptionLine(text: string): string {
  return text.toLowerCase().replace(/[.!?,;:'"]+$/g, "").trim();
}

function isSameCaption(a: CaptionLine, b: CaptionLine): boolean {
  return (
    normCaptionLine(a.translated) === normCaptionLine(b.translated) ||
    normCaptionLine(a.original) === normCaptionLine(b.original)
  );
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const intentionalClose = useRef(false);
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectRef = useRef<() => void>(() => {});
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [caption, setCaption] = useState<CaptionLine | null>(null);
  const [history, setHistory] = useState<CaptionLine[]>([]);
  const [lastPipeline, setLastPipeline] = useState<PipelineResult | null>(null);
  const [summary, setSummary] = useState<MeetingSummary | null>(null);
  const [transcriptExport, setTranscriptExport] = useState<MeetingExportPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
  }, []);

  const closeSocket = useCallback((intentional: boolean) => {
    intentionalClose.current = intentional;
    clearReconnectTimer();
    const ws = wsRef.current;
    if (!ws) return;
    ws.onopen = null;
    ws.onclose = null;
    ws.onmessage = null;
    ws.onerror = null;
    ws.close();
    wsRef.current = null;
  }, [clearReconnectTimer]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

    closeSocket(true);
    intentionalClose.current = false;

    const ws = new WebSocket(WS_URL);
    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      reconnectAttempt.current = 0;
      setConnected(true);
      setReconnecting(false);
      setError(null);
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      if (!intentionalClose.current) {
        clearReconnectTimer();
        const delay = Math.min(1000 * 2 ** reconnectAttempt.current, MAX_RECONNECT_DELAY_MS);
        setReconnecting(true);
        reconnectTimer.current = setTimeout(() => {
          reconnectAttempt.current += 1;
          connectRef.current();
        }, delay);
      } else {
        setReconnecting(false);
      }
    };

    ws.onerror = () => setError("WebSocket connection failed");

    ws.onmessage = (ev) => {
      if (typeof ev.data !== "string") return;
      const msg: WsMessage = JSON.parse(ev.data);

      switch (msg.event) {
        case "caption_show":
        case "caption_update": {
          const line = msg.payload as unknown as CaptionLine;
          setCaption(line);
          if (msg.event === "caption_show") {
            setHistory((h) => {
              if (h.some((x) => x.id === line.id)) return h;
              const last = h[h.length - 1];
              if (last && isSameCaption(last, line)) return h;
              return [...h.slice(-99), line];
            });
          }
          break;
        }
        case "caption_hide":
          setCaption(null);
          break;
        case "pipeline_result":
          setLastPipeline(msg.payload as unknown as PipelineResult);
          break;
        case "meeting_summary":
          setSummary(msg.payload as unknown as MeetingSummary);
          break;
        case "transcript_export":
          setTranscriptExport(msg.payload as unknown as MeetingExportPayload);
          break;
        case "error":
          setError(String((msg.payload as { message?: string }).message));
          break;
      }
    };

    wsRef.current = ws;
  }, [clearReconnectTimer, closeSocket]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const disconnect = useCallback(() => {
    setReconnecting(false);
    setConnected(false);
    closeSocket(true);
  }, [closeSocket]);

  const send = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const startSession = useCallback(
    (config: LiveSessionConfig) => {
      setSummary(null);
      setTranscriptExport(null);
      send({ action: "start_session", config });
    },
    [send]
  );

  const stopSession = useCallback(
    (language = "en") => {
      send({ action: "stop_session", language });
    },
    [send]
  );

  const sendAudio = useCallback((pcm: ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(pcm);
    }
  }, []);

  const waitForOpen = useCallback(
    (timeoutMs = 10_000): Promise<boolean> =>
      new Promise((resolve) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          resolve(true);
          return;
        }
        const deadline = Date.now() + timeoutMs;
        const poll = () => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            resolve(true);
            return;
          }
          if (Date.now() >= deadline) {
            resolve(false);
            return;
          }
          setTimeout(poll, 50);
        };
        if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
          connect();
        }
        poll();
      }),
    [connect]
  );

  useEffect(() => () => disconnect(), [disconnect]);

  return {
    connected,
    reconnecting,
    connect,
    disconnect,
    startSession,
    stopSession,
    sendAudio,
    send,
    waitForOpen,
    caption,
    history,
    lastPipeline,
    summary,
    transcriptExport,
    error,
  };
}
