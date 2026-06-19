"use client";

import { ModuleQuickBar } from "@/components/layout/ModuleQuickBar";
import { TranslatorPanel } from "@/components/TranslatorPanel";
import { useLocale } from "@/hooks/useLocale";

export function HomePage() {
  const { messages: m } = useLocale();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="gb-hero">
        <div>
          <p className="gb-hero-eyebrow">GlobalBridge AI</p>
          <h1 className="gb-page-title text-3xl">{m.home.title}</h1>
          <p className="gb-page-sub mt-2 max-w-xl text-base">{m.home.subtitle}</p>
        </div>
      </header>

      <TranslatorPanel compact />

      <section className="hidden lg:block">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--gb-muted)]">
          {m.nav.otherModules}
        </p>
        <ModuleQuickBar />
      </section>
    </div>
  );
}
