"use client";

import { ModuleQuickBar } from "@/components/layout/ModuleQuickBar";
import { TranslatorPanel } from "@/components/TranslatorPanel";
import { useLocale } from "@/hooks/useLocale";

export function HomePage() {
  const { messages: m } = useLocale();

  return (
    <div className="gb-home">
      <div className="gb-card gb-home-card">
        <header className="gb-home-head">
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold tracking-tight lg:text-lg">{m.home.title}</h1>
            <p className="mt-0.5 text-xs text-[var(--gb-muted)]">{m.home.subtitle}</p>
          </div>
          <div className="gb-home-head-modules hidden shrink-0 lg:block">
            <ModuleQuickBar />
          </div>
        </header>

        <TranslatorPanel compact unified />

        <footer className="gb-home-modules lg:hidden">
          <ModuleQuickBar />
        </footer>
      </div>
    </div>
  );
}
