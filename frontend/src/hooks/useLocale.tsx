"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getMessages, type Locale, type Messages } from "@/lib/i18n";

const STORAGE_KEY = "gb-ui-locale-v1";

type LocaleContextValue = {
  locale: Locale;
  messages: Messages;
  hydrated: boolean;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved === "en" || saved === "tr") setLocaleState(saved);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.lang = locale;
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
  }, [locale, hydrated]);

  const setLocale = useCallback((next: Locale) => setLocaleState(next), []);

  const toggleLocale = useCallback(() => {
    setLocaleState((prev) => (prev === "en" ? "tr" : "en"));
  }, []);

  const messages = useMemo(() => getMessages(locale), [locale]);

  const value = useMemo(
    () => ({ locale, messages, hydrated, setLocale, toggleLocale }),
    [locale, messages, hydrated, setLocale, toggleLocale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

/** Default translation pair for UI locale */
export function defaultTranslationPair(locale: Locale): { from: string; to: string } {
  return locale === "en" ? { from: "en", to: "tr" } : { from: "tr", to: "en" };
}
