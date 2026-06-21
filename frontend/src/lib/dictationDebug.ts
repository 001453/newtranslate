"use client";

export type DictationDebugState = {
  lang: string;
  phase: string;
  results: number;
  lastText: string;
  lastError: string;
  micDevice: string;
  restarts: number;
  speechStarted: boolean;
  audioStarted: boolean;
  chunks: number;
  levelPct: number;
  updatedAt: number;
};

export const EMPTY_DICTATION_DEBUG: DictationDebugState = {
  lang: "",
  phase: "idle",
  results: 0,
  lastText: "",
  lastError: "",
  micDevice: "",
  restarts: 0,
  speechStarted: false,
  audioStarted: false,
  chunks: 0,
  levelPct: 0,
  updatedAt: 0,
};

export function isDictationDebugOn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem("gb-dictation-debug") === "1") return true;
    if (new URLSearchParams(window.location.search).get("dictation_debug") === "1") return true;
  } catch {
    /* ignore */
  }
  return process.env.NODE_ENV === "development";
}

export function dictationLog(phase: string, detail?: unknown) {
  if (!isDictationDebugOn()) return;
  if (detail !== undefined) console.log(`[dictation:${phase}]`, detail);
  else console.log(`[dictation:${phase}]`);
}
