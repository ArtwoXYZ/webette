export type Locale = "en" | "fr";

export function normalizeLocale(raw?: string | null): Locale {
  if (raw?.toLowerCase().startsWith("fr")) return "fr";
  return "en";
}
