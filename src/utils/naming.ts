/**
 * Naming utilities (cleanName, slugify, ordering helpers).
 */
export function cleanName(rawName: string): string {
  const trimmed = rawName.trim();
  const match = /^(\d+)[\s._-]*(.*)$/i.exec(trimmed);
  const cleaned = (match?.[2] ?? "").trim();
  return cleaned.length > 0 ? cleaned : trimmed;
}

export function slugify(input: string): string {
  const ascii = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/æ/g, "ae")
    .replace(/œ/g, "oe");

  return (
    ascii
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled"
  );
}

export function orderKey(rawName: string): number {
  const match = /^(\d+)/.exec(rawName.trim());
  const value = match?.[1];
  return value ? parseInt(value, 10) : Number.POSITIVE_INFINITY;
}

export function limitSlugWords(slug: string, maxWords = 3): string {
  const parts = slug.split(/[-_]+/).filter(Boolean);
  const limited = parts.slice(0, maxWords).join("-");
  return limited || slug;
}
