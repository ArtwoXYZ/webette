/**
 * Shared string parsing utilities.
 */

const truthy = new Set(["true", "1", "yes", "on"]);
const falsy = new Set(["false", "0", "no", "off"]);

export function parseBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().toLowerCase();
  if (truthy.has(trimmed)) return true;
  if (falsy.has(trimmed)) return false;
  return undefined;
}

/** Extract a non-empty trimmed string from an unknown value, or undefined. */
export function pickString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function normalizeClassList(value: unknown): string[] {
  const split = (v: string): string[] =>
    v.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
  if (typeof value === "string") return split(value);
  if (Array.isArray(value)) return value.map(String).flatMap(split);
  return [];
}
