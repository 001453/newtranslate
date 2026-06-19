import { API_BASE } from "./types";

function apiPort(): string {
  try {
    return new URL(API_BASE).port || "8000";
  } catch {
    return "8000";
  }
}

export type LiveEndpoints = {
  host: string;
  wsLive: string;
  apiBase: string;
  health: string;
  transcript: string;
  summary: string;
  docs: string;
};

export function getLiveEndpoints(host?: string): LiveEndpoints {
  const h = host ?? (typeof window !== "undefined" ? window.location.hostname : "localhost");
  const port = apiPort();
  const apiBase = `http://${h}:${port}`;
  return {
    host: h,
    wsLive: `ws://${h}:${port}/api/v1/ws/live`,
    apiBase,
    health: `${apiBase}/health`,
    transcript: `${apiBase}/api/v1/meetings/transcript`,
    summary: `${apiBase}/api/v1/meetings/summary`,
    docs: `${apiBase}/docs`,
  };
}
