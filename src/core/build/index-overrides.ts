/**
 * Index override parsing and resolution.
 *
 * Supports `index.root` and `index.collections` from `webette.config.ts`.
 */

import type { Logger } from "../../logging/logger";
import type { Collection, Entry, Site } from "../model";
import { matchCollection, matchEntry } from "../targets";

export type IndexEntryRef = { collection: string; entry: string };

export type IndexOverrides = {
  root?: IndexEntryRef;
  collections?: Record<string, IndexEntryRef>;
};

export function parseIndexOverrides(raw: unknown): IndexOverrides {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;

  const parseRef = (value: unknown): IndexEntryRef | undefined => {
    if (!value || typeof value !== "object") return undefined;
    const ref = value as Record<string, unknown>;
    const collection = typeof ref.collection === "string" ? ref.collection.trim() : "";
    const entry = typeof ref.entry === "string" ? ref.entry.trim() : "";
    if (!collection || !entry) return undefined;
    return { collection, entry };
  };

  const root = parseRef(obj.root);
  const collectionsRaw = obj.collections;
  const collections: Record<string, IndexEntryRef> = {};

  if (collectionsRaw && typeof collectionsRaw === "object") {
    for (const [key, value] of Object.entries(collectionsRaw as Record<string, unknown>)) {
      const parsed = parseRef(value);
      if (!parsed) continue;
      const normalizedKey = String(key ?? "").trim();
      if (!normalizedKey) continue;
      collections[normalizedKey] = parsed;
    }
  }

  return {
    ...(root ? { root } : {}),
    ...(Object.keys(collections).length ? { collections } : {}),
  };
}

export function resolveIndexEntry(
  site: Site,
  ref: IndexEntryRef | undefined,
  logger: Logger
): { collection: Collection; entry: Entry } | undefined {
  if (!ref) return undefined;
  const collection = matchCollection(site, ref.collection);
  if (!collection) {
    logger.warn("index.override.collectionMissing", { collection: ref.collection });
    return undefined;
  }
  const entry = matchEntry(collection, ref.entry);
  if (!entry) {
    logger.warn("index.override.entryMissing", { collection: ref.collection, entry: ref.entry });
    return undefined;
  }
  if (!entry.isUnlisted) {
    logger.warn("index.override.entryNotUnlisted", { collection: ref.collection, entry: ref.entry });
    return undefined;
  }
  return { collection, entry };
}
