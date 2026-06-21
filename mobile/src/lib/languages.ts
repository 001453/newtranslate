export const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "tr", name: "Türkçe" },
  { code: "de", name: "Deutsch" },
  { code: "fr", name: "Français" },
  { code: "es", name: "Español" },
  { code: "ar", name: "العربية" },
  { code: "ru", name: "Русский" },
] as const;

export type LangCode = (typeof LANGUAGES)[number]["code"];

export function langName(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.name ?? code;
}

export function nextLang(code: LangCode): LangCode {
  const i = LANGUAGES.findIndex((l) => l.code === code);
  return LANGUAGES[(i + 1) % LANGUAGES.length].code;
}
