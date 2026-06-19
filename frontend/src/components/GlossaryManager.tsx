"use client";

import { useEffect, useState } from "react";
import { addGlossaryTerm, deleteGlossaryTerm, listGlossary } from "@/lib/api";
import { useLocale } from "@/hooks/useLocale";
import { LANGUAGES, langName } from "@/lib/languages";
import { Plus, Trash2 } from "lucide-react";

export function GlossaryManager() {
  const { messages: m } = useLocale();
  const [terms, setTerms] = useState<
    Array<{ id: string; source: string; target: string; source_lang: string; target_lang: string }>
  >([]);
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [sl, setSl] = useState("en");
  const [tl, setTl] = useState("tr");

  const langOptions = LANGUAGES.filter((l) => l.code !== "auto");

  const load = () => listGlossary().then((d) => setTerms(d.terms)).catch(() => setTerms([]));
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mx-auto max-w-3xl">
      <header className="gb-hero mb-6">
        <h1 className="gb-page-title text-2xl">{m.glossary.title}</h1>
        <p className="gb-page-sub mt-1">{m.glossary.subtitle}</p>
      </header>
      <div className="gb-card overflow-hidden">
        <div className="grid gap-2 border-b border-[var(--gb-border)] p-4 sm:grid-cols-6">
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase text-[var(--gb-muted)]">
              {m.glossary.sourceLang}
            </label>
            <select className="gb-select" value={sl} onChange={(e) => setSl(e.target.value)}>
              {langOptions.map((l) => (
                <option key={l.code} value={l.code}>
                  {langName(l.code)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase text-[var(--gb-muted)]">
              {m.glossary.targetLang}
            </label>
            <select className="gb-select" value={tl} onChange={(e) => setTl(e.target.value)}>
              {langOptions.map((l) => (
                <option key={l.code} value={l.code}>
                  {langName(l.code)}
                </option>
              ))}
            </select>
          </div>
          <input
            className="gb-input sm:col-span-2"
            placeholder={m.glossary.source}
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
          <input
            className="gb-input"
            placeholder={m.glossary.target}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
          <button
            type="button"
            className="gb-btn-primary self-end"
            onClick={async () => {
              await addGlossaryTerm({ source, target, source_lang: sl, target_lang: tl });
              setSource("");
              setTarget("");
              load();
            }}
          >
            <Plus className="mr-1 inline h-4 w-4" />
            {m.glossary.add}
          </button>
        </div>
        <ul className="max-h-96 overflow-y-auto p-4">
          {terms.map((t) => (
            <li key={t.id} className="flex justify-between border-b border-[var(--gb-border)] py-2 text-sm">
              <span>
                [{t.source_lang}→{t.target_lang}] {t.source} → <strong>{t.target}</strong>
              </span>
              <button
                type="button"
                onClick={async () => {
                  await deleteGlossaryTerm(t.id);
                  load();
                }}
              >
                <Trash2 className="h-4 w-4 text-[var(--gb-danger)]" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
