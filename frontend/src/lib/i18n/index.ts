import { en, type Messages } from "./en";
import { tr } from "./tr";

export type Locale = "en" | "tr";

const catalogs: Record<Locale, Messages> = { en, tr };

export function getMessages(locale: Locale): Messages {
  return catalogs[locale] ?? en;
}

export { en, tr };
export type { Messages };
