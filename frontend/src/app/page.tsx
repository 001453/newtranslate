import { ModuleQuickBar } from "@/components/layout/ModuleQuickBar";
import { TranslatorPanel } from "@/components/TranslatorPanel";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="gb-page-title">Yazın veya dikte edin</h1>
        <p className="gb-page-sub mt-1">Türkçe ↔ English hazır — yazın, dikte edin veya geçmişten seçin.</p>
      </header>

      <TranslatorPanel compact />

      <section className="hidden lg:block">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--gb-muted)]">
          Diğer modüller
        </p>
        <ModuleQuickBar />
      </section>
    </div>
  );
}
