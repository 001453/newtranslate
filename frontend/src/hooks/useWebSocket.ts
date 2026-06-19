"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CaptionLine, LiveSessionConfig, MeetingSummary, PipelineResult } from "@/lib/types";
import { WS_URL } from "@/lib/types";

type WsMessage = {
  event: string;
  payload: Record<string, unknown>;
  session_id?: string;
};

const MAX_RECONNECT_DELAY_MS = 30_000;

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
  const [error, setError] = useState<string | null>(null);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

    intentionalClose.current = false;
    clearReconnectTimer();

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
        case "caption_update":
          setCaption(msg.payload as unknown as CaptionLine);
          if (msg.event === "caption_show") {
            setHistory((h) => [...h.slice(-99), msg.payload as unknown as CaptionLine]);
          }
          break;
        case "caption_hide":
          setCaption(null);
          break;
        case "pipeline_result":
          setLastPipeline(msg.payload as unknown as PipelineResult);
          break;
        case "meeting_summary":
          setSummary(msg.payload as unknown as MeetingSummary);
          break;
        case "error":
          setError(String((msg.payload as { message?: string }).message));
          break;
      }
    };

    wsRef.current = ws;
  }, [clearReconnectTimer]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const disconnect = useCallback(() => {
    intentionalClose.current = true;
    clearReconnectTimer();
    setReconnecting(false);
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
  }, [clearReconnectTimer]);

  const send = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const startSession = useCallback(
    (config: LiveSessionConfig) => {
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
    wsRef.current?.send(pcm);
  }, []);

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
    caption,
    history,
    lastPipeline,
    summary,
    error,
  };
}
