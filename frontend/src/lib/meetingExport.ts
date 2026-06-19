/** Download meeting transcript files exported from backend. */

export type MeetingExportPayload = {
  session_id: string;
  segment_count: number;
  txt: string;
  srt: string;
  json: string;
  summary?: Record<string, unknown>;
};

function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadMeetingExport(payload: MeetingExportPayload, prefix = "toplanti") {
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const base = `${prefix}-${ts}`;

  if (payload.txt?.trim()) {
    downloadBlob(`${base}.txt`, payload.txt, "text/plain");
  }
  if (payload.json?.trim()) {
    downloadBlob(`${base}.json`, payload.json, "application/json");
  }
  if (payload.srt?.trim()) {
    downloadBlob(`${base}.srt`, payload.srt, "text/plain");
  }
}

export function isChromeBrowser(): boolean {
  if (typeof navigator === "undefined") return true;
  const ua = navigator.userAgent;
  return /Chrome|CriOS/.test(ua) && !/Edg|OPR|Firefox|SamsungBrowser/.test(ua);
}
