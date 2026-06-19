"use client";

import { ModuleQuickBar } from "@/components/layout/ModuleQuickBar";
import { ServiceStatusBar } from "@/components/home/ServiceStatusBar";
import { TranslatorPanel } from "@/components/TranslatorPanel";
import { useServiceHealth } from "@/hooks/useServiceHealth";
import { useLocale } from "@/hooks/useLocale";

export function HomePage() {
  const { messages: m } = useLocale();
  const { apiOnline, qvacOnline, loading } = useServiceHealth();
  const servicesReady = apiOnline && qvacOnline;

  return (
    <div className="gb-home">
      <div className="gb-card gb-home-card">
        <header className="gb-home-head">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-bold tracking-tight lg:text-lg">{m.home.title}</h1>
              <ServiceStatusBar />
            </div>
            <p className="mt-0.5 text-xs text-[var(--gb-muted)]">{m.home.subtitle}</p>
            {!loading && !servicesReady && (
              <p className="mt-1 text-xs text-[var(--gb-warning)]">{m.home.servicesDown}</p>
            )}
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
