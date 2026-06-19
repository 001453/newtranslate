"use client";

import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";

export function LocaleToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();

  return (
    <div
      className={cn("gb-lang-toggle", className)}
      role="group"
      aria-label="Interface language"
    >
      <button
        type="button"
        className={cn("gb-lang-btn", locale === "en" && "active")}
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
      >
        EN
      </button>
      <button
        type="button"
        className={cn("gb-lang-btn", locale === "tr" && "active")}
        onClick={() => setLocale("tr")}
        aria-pressed={locale === "tr"}
      >
        TR
      </button>
    </div>
  );
}
