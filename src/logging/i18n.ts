export type Locale = "en" | "fr";
export type Messages = Record<string, string>;

// Requires "resolveJsonModule": true in your tsconfig
import enMessages from "../../locales/en/logs.json";
import frMessages from "../../locales/fr/logs.json";

const catalogs: Record<Locale, Messages> = {
  en: enMessages,
  fr: frMessages,
};

// Fallback to English for any unsupported or missing locale
export function normalizeLocale(raw?: string | null): Locale {
  if (!raw) return "en";
  const lc = raw.toLowerCase();
  if (lc.startsWith("fr")) return "fr";
  if (lc.startsWith("en")) return "en";
  return "en";
}

export function t(
  locale: Locale,
  key: string,
  params: Record<string, unknown> = {}
): string {
  const messages = catalogs[locale] ?? catalogs.en;
  const template = messages[key] ?? key;

  return template.replace(/\{([^}]+)\}/g, (_, name: string) => {
    const value = params[name];
    return value == null ? `{${name}}` : String(value);
  });
}
