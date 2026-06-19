"use client";

import { useCallback, useState } from "react";
import { getPdfJob, pdfDownloadUrl, uploadPdf, bilingualPreviewUrl } from "@/lib/api";
import { useLocale } from "@/hooks/useLocale";
import { LANGUAGES } from "@/lib/types";
import { FileText, Loader2, Download, Eye } from "lucide-react";

export function PdfUploader() {
  const { messages: m } = useLocale();
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("en");
  const [jobs, setJobs] = useState<
    Array<{ job_id: string; filename: string; status: string; progress: number }>
  >([]);
  const [uploading, setUploading] = useState(false);

  const statusLabel = (status: string) => {
    const key = status as keyof typeof m.pdf.status;
    return m.pdf.status[key] ?? status;
  };

  const pollJob = useCallback(async (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const job = await getPdfJob(jobId);
        setJobs((prev) =>
          prev.map((j) =>
            j.job_id === jobId ? { ...j, status: job.status, progress: job.progress ?? 0 } : j
          )
        );
        if (job.status === "completed" || job.status === "failed") {
          clearInterval(interval);
        }
      } catch {
        clearInterval(interval);
      }
    }, 2000);
  }, []);

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const job = await uploadPdf(file, sourceLang, targetLang);
        setJobs((prev) => [
          ...prev,
          { job_id: job.job_id, filename: job.filename, status: job.status, progress: 0 },
        ]);
        pollJob(job.job_id);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="gb-hero">
        <h1 className="gb-page-title text-2xl">{m.pdf.title}</h1>
        <p className="gb-page-sub mt-1">
          {m.pdf.subtitle}
          <span className="mt-1 block text-xs opacity-75">{m.pdf.pptxNote}</span>
        </p>
      </header>

      <div className="gb-card grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-[var(--gb-muted)]">
            {m.pdf.sourceLang}
          </label>
          <select value={sourceLang} onChange={(e) => setSourceLang(e.target.value)} className="gb-select">
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-[var(--gb-muted)]">
            {m.pdf.targetLang}
          </label>
          <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)} className="gb-select">
            {LANGUAGES.filter((l) => l.code !== "auto").map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="gb-card flex cursor-pointer flex-col items-center justify-center border-2 border-dashed p-12 transition hover:border-[var(--gb-accent)]">
        <FileText className="mb-3 h-10 w-10 text-[var(--gb-muted)]" />
        <span className="text-sm font-medium">{uploading ? m.pdf.uploading : m.pdf.dropzone}</span>
        <input
          type="file"
          accept=".pdf,.docx"
          multiple
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
          disabled={uploading}
        />
      </label>

      {jobs.length > 0 && (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div key={job.job_id} className="gb-card flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{job.filename}</div>
                <div className="text-sm text-[var(--gb-muted)]">
                  {statusLabel(job.status)}
                  {job.status === "translating" && ` — ${Math.round(job.progress * 100)}%`}
                </div>
                {job.status !== "completed" && job.status !== "failed" && (
                  <Loader2 className="mt-1 h-4 w-4 animate-spin text-[var(--gb-accent)]" />
                )}
              </div>
              {job.status === "completed" && (
                <div className="flex gap-2">
                  <a
                    href={bilingualPreviewUrl(job.job_id)}
                    target="_blank"
                    rel="noopener"
                    className="gb-btn-ghost text-sm"
                  >
                    <Eye className="mr-1 h-4 w-4" /> {m.pdf.bilingual}
                  </a>
                  <a href={pdfDownloadUrl(job.job_id)} className="gb-btn-primary text-sm">
                    <Download className="mr-1 h-4 w-4" /> {m.pdf.download}
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
