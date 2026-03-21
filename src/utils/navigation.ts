/**
 * Shared parsing + filtering helpers for navigation (menu + navigation.webt).
 */

export type CollectionLike = {
  slug?: string;
  id?: string;
  isUnlisted?: boolean;
};

export type EntryLike = {
  slug?: string;
  id?: string;
  isDraft?: boolean;
  isUnlisted?: boolean;
};

export { parseBoolean } from "./parse";

export function parseList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).map((item) => item.trim()).filter(Boolean);
  }
  if (typeof value !== "string") return [];
  // Comma-separated strings are supported for config brevity.
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeKey(value: string): string {
  // Normalize keys for predictable include/exclude matching.
  return value.trim().toLowerCase();
}

export function buildExcludeSet(values?: string[]): Set<string> {
  // Build a normalized lookup set for fast excludes.
  return new Set((values ?? []).map(normalizeKey).filter(Boolean));
}

export function matchesExcludedCollection(
  collection: CollectionLike,
  excludeCollections: Set<string>
): boolean {
  const key = normalizeKey(collection.slug || collection.id || "");
  return key ? excludeCollections.has(key) : false;
}

export function matchesExcludedEntry(
  entry: EntryLike,
  collection: CollectionLike | undefined,
  excludeEntries: Set<string>
): boolean {
  // Supports both "entry" and "collection/entry" exclusion keys.
  const entryKey = normalizeKey(entry.slug || entry.id || "");
  if (entryKey && excludeEntries.has(entryKey)) return true;
  const collectionKey = normalizeKey(collection?.slug || collection?.id || "");
  if (collectionKey && entryKey && excludeEntries.has(`${collectionKey}/${entryKey}`)) {
    return true;
  }
  return false;
}

export function shouldIncludeCollection(
  collection: CollectionLike,
  includeUnlisted: boolean,
  excludeCollections: Set<string>
): boolean {
  if (!includeUnlisted && collection.isUnlisted) return false;
  if (matchesExcludedCollection(collection, excludeCollections)) return false;
  return true;
}

export function shouldIncludeEntry(
  entry: EntryLike,
  collection: CollectionLike | undefined,
  includeUnlisted: boolean,
  includeDrafts: boolean,
  excludeEntries: Set<string>
): boolean {
  if (!includeDrafts && entry.isDraft) return false;
  if (!includeUnlisted && entry.isUnlisted) return false;
  if (matchesExcludedEntry(entry, collection, excludeEntries)) return false;
  return true;
}
