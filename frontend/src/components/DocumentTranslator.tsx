"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PackManagerBar } from "@/components/PackManagerBar";
import { defaultTranslationPair, useLocale } from "@/hooks/useLocale";
import { useLanguagePacks } from "@/hooks/useLanguagePacks";
import { translateText } from "@/lib/api";
import { LANGUAGES } from "@/lib/languages";
import { FileText } from "lucide-react";

export function DocumentTranslator() {
  const { messages: m, locale, hydrated } = useLocale();
  const [from, setFrom] = useState("en");
  const [to, setTo] = useState("tr");
  const pairInit = useRef(false);
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const { isPairReady } = useLanguagePacks();

  useEffect(() => {
    if (!hydrated || pairInit.current) return;
    const pair = defaultTranslationPair(locale);
    setFrom(pair.from);
    setTo(pair.to);
    pairInit.current = true;
  }, [locale, hydrated]);

  const run = async () => {
    if (!source.trim() || !isPairReady(from, to)) return;
    setLoading(true);
    const chunks = source.split(/\n\n+/);
    const out: string[] = [];
    try {
      for (const c of chunks) {
        if (!c.trim()) continue;
        const r = await translateText(c, from, to);
        out.push(r.translated);
        setTarget(out.join("\n\n"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <header className="gb-hero mb-2">
        <h1 className="gb-page-title text-2xl">{m.document.title}</h1>
      </header>
      <div className="gb-card gb-translate-card overflow-hidden">
        <div className="gb-lang-bar flex gap-2 border-b border-[var(--gb-border)] p-3">
          <select className="gb-select max-w-[160px]" value={from} onChange={(e) => setFrom(e.target.value)}>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
          <select className="gb-select max-w-[160px]" value={to} onChange={(e) => setTo(e.target.value)}>
            {LANGUAGES.filter((l) => l.code !== "auto").map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid md:grid-cols-2">
          <textarea
            className="min-h-[300px] border-0 bg-transparent p-4 outline-none md:border-r md:border-[var(--gb-border)]"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder={m.document.placeholder}
          />
          <div className="min-h-[300px] whitespace-pre-wrap p-4 text-[var(--gb-muted)]">
            {loading ? m.document.translating : target || m.document.result}
          </div>
        </div>
        <div className="flex justify-end border-t border-[var(--gb-border)] p-4">
          <button type="button" className="gb-btn-primary" onClick={run} disabled={loading}>
            {m.document.translateBtn}
          </button>
        </div>
        <PackManagerBar from={from} to={to} />
      </div>
      <Link href="/pdf" className="gb-card flex items-center gap-3 p-4 transition hover:border-[var(--gb-accent)]">
        <FileText className="h-8 w-8 text-[var(--gb-accent)]" />
        <div>
          <div className="font-medium">{m.document.pdfTitle}</div>
          <div className="text-sm text-[var(--gb-muted)]">{m.document.pdfSubtitle}</div>
        </div>
      </Link>
    </div>
  );
}
