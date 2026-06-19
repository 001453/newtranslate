"use client";

import type { DictationDebugState } from "@/lib/dictationDebug";
import { isDictationDebugOn } from "@/lib/dictationDebug";

export function DictationDebugPanel({ debug }: { debug: DictationDebugState }) {
  if (!isDictationDebugOn()) return null;

  return (
    <div className="rounded border border-amber-500/40 bg-amber-500/5 p-2 font-mono text-[0.6rem] leading-relaxed text-amber-200">
      <div className="mb-1 font-semibold text-amber-400">Dictation debug (Whisper)</div>
      <div>phase: {debug.phase}</div>
      <div>lang: {debug.lang || "—"}</div>
      <div>results: {debug.results}</div>
      <div>chunks: {debug.chunks}</div>
      <div>level: {debug.levelPct}%</div>
      <div>restarts: {debug.restarts}</div>
      <div>speech: {debug.speechStarted ? "yes" : "no"}</div>
      <div>audio: {debug.audioStarted ? "yes" : "no"}</div>
      {debug.lastError && <div className="text-[var(--gb-danger)]">err: {debug.lastError}</div>}
      {debug.lastText && <div className="truncate">text: {debug.lastText}</div>}
    </div>
  );
}
