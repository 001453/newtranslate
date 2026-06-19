export interface CaptionStyle {
  fontSizePx: number;
  fontFamily: string;
  textColor: string;
  backgroundColor: string;
  paddingPx: number;
  borderRadiusPx: number;
  maxWidthPercent: number;
  position: "bottom" | "top" | "floating";
  bottomOffsetPx: number;
  textShadow: string;
  rtl: boolean;
}

export interface CaptionLine {
  id: string;
  original: string;
  translated: string;
  source_lang: string;
  target_lang: string;
  speaker: string | null;
  timestamp: number;
  is_final: boolean;
  confidence: number;
  style?: CaptionStyle;
}

export interface LiveSessionConfig {
  source_lang: string;
  target_lang: string;
  bidirectional: boolean;
  lang_a: string;
  lang_b: string;
  /** Kişisel altyazı: her zaman bu dilde göster (Parley/Keet modu) */
  viewer_lang?: string;
}

export interface PipelineResult {
  original: string;
  translated: string;
  source_lang: string;
  target_lang: string;
  stt_ms: number;
  translation_ms: number;
  total_ms: number;
}

export interface MeetingSummary {
  title?: string;
  summary?: string;
  action_items?: Array<{
    task: string;
    assignee: string;
    due_date: string | null;
    priority: string;
  }>;
  topics?: Array<{ topic: string; summary: string; importance: string }>;
  key_decisions?: string[];
}

export interface PdfJob {
  job_id: string;
  filename: string;
  status: string;
  progress?: number;
  error?: string;
}

const SERVER_API =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

/** Browser: same-origin via Next.js rewrites. SSR: direct backend. */
export function getApiBase(): string {
  return typeof window !== "undefined" ? "" : SERVER_API;
}

export function apiV1(path: string): string {
  const p = path.startsWith("/") ? path.slice(1) : path;
  return `${getApiBase()}/api/${p}`;
}

export function apiHealth(): string {
  return `${getApiBase()}/health`;
}

/** Full backend URL (WebSocket, server-side). */
export const API_BASE = SERVER_API;

export const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  SERVER_API.replace(/^http/, "ws") + "/api/v1/ws/live";
