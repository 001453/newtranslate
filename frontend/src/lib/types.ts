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

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

export const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  API_BASE.replace(/^http/, "ws") + "/api/v1/ws/live";
