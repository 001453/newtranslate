import { API_BASE } from "./types";
import type { PdfJob } from "./types";

export async function fetchHealth(): Promise<{
  status: string;
  qvac_available?: boolean;
  translation_provider?: string;
}> {
  const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
  if (!res.ok) throw new Error("health");
  return res.json();
}

export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string
) {
  const res = await fetch(`${API_BASE}/api/v1/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      source_lang: sourceLang,
      target_lang: targetLang,
    }),
  });
  if (!res.ok) throw new Error("Translation failed");
  return res.json();
}

export async function fetchPackStatus(from: string, to: string) {
  const res = await fetch(`${API_BASE}/api/v1/packs/status?from=${from}&to=${to}`);
  if (!res.ok) throw new Error("pack status");
  return res.json();
}

export async function fetchInstalledPacks() {
  const res = await fetch(`${API_BASE}/api/v1/packs/installed`);
  if (!res.ok) throw new Error("installed");
  return res.json();
}

export async function downloadLanguagePack(
  from: string,
  to: string,
  onProgress?: (n: number) => void
) {
  const res = await fetch(`${API_BASE}/api/v1/packs/download`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from, to }),
  });
  if (!res.ok) throw new Error("download failed");

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("ndjson") && !res.body) {
    const j = await res.json();
    return { ready: Boolean(j.ready) };
  }

  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let ready = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    for (const line of buf.split("\n")) {
      if (!line.trim()) continue;
      try {
        const m = JSON.parse(line);
        if (m.type === "progress") onProgress?.(m.percent);
        if (m.type === "done") ready = m.ready;
      } catch {
        /* skip */
      }
    }
    buf = buf.split("\n").pop() ?? "";
  }

  return { ready };
}

export async function listGlossary() {
  const res = await fetch(`${API_BASE}/api/v1/glossary`);
  if (!res.ok) throw new Error("glossary");
  return res.json();
}

export async function addGlossaryTerm(term: {
  source: string;
  target: string;
  source_lang: string;
  target_lang: string;
}) {
  const res = await fetch(`${API_BASE}/api/v1/glossary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...term, category: "user" }),
  });
  if (!res.ok) throw new Error("add");
  return res.json();
}

export async function deleteGlossaryTerm(id: string) {
  await fetch(`${API_BASE}/api/v1/glossary/${id}`, { method: "DELETE" });
}

export async function uploadPdf(
  file: File,
  sourceLang: string,
  targetLang: string
): Promise<PdfJob> {
  const form = new FormData();
  form.append("file", file);
  form.append("source_lang", sourceLang);
  form.append("target_lang", targetLang);

  const res = await fetch(`${API_BASE}/api/v1/pdf/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

export async function getPdfJob(jobId: string) {
  const res = await fetch(`${API_BASE}/api/v1/pdf/jobs/${jobId}`);
  if (!res.ok) throw new Error("Job not found");
  return res.json();
}

export function pdfDownloadUrl(jobId: string) {
  return `${API_BASE}/api/v1/pdf/jobs/${jobId}/download`;
}

export function bilingualPreviewUrl(jobId: string) {
  return `${API_BASE}/api/v1/pdf/jobs/${jobId}/bilingual`;
}
