/**
 * Enrichment pass from raw scan shapes to public model blocks/entries/collections.
 */

import * as path from "node:path";
import { cleanName, limitSlugWords, slugify } from "../../utils/naming";
import type { Block, Collection, Entry, Site } from "../model";
import type { CollectionConfig, RawBlock, RawCollection, RawEntry } from "./internal-types";
import { normalizePath } from "./utils";

export function buildConfigIndex(site: Site): Map<string, CollectionConfig> {
  const map = new Map<string, CollectionConfig>();
  const raw = site.config?.collections;
  if (!raw || typeof raw !== "object") return map;

  for (const [key, value] of Object.entries(raw)) {
    if (!value || typeof value !== "object") continue;
    const cfg = value as CollectionConfig;
    const normalizedKey = normalizePath(key);
    const normalizedPath =
      typeof cfg.path === "string" && cfg.path ? normalizePath(cfg.path) : undefined;
    map.set(normalizedPath ?? normalizedKey, cfg);
  }

  return map;
}

export function enrichBlocks(rawBlocks: RawBlock[]): Block[] {
  const blockSlugCounts = new Map<string, number>();

  const walk = (blocks: RawBlock[]): Block[] =>
    blocks.map((blk) => {
      const baseName = blk.ext ? path.parse(blk.rawName).name : blk.rawName;
      const name = cleanName(baseName);
      const baseSlug = slugify(name);
      const count = blockSlugCounts.get(baseSlug) ?? 0;
      const slug = count === 0 ? baseSlug : `${baseSlug}-${count + 1}`;
      blockSlugCounts.set(baseSlug, count + 1);

      const idBase = `blk__${limitSlugWords(slug).replace(/-/g, "_")}`;
      const idCount = blockSlugCounts.get(idBase) ?? 0;
      const id = idCount === 0 ? idBase : `${idBase}_${idCount + 1}`;
      blockSlugCounts.set(idBase, idCount + 1);

      const subBlocks = blk.subBlocks ? walk(blk.subBlocks) : undefined;

      return {
        id,
        rawName: blk.rawName,
        name,
        slug,
        type: blk.type,
        ext: blk.ext,
        path: blk.path,
        ...(blk.skipRender ? { skipRender: true } : {}),
        ...(subBlocks ? { subBlocks } : {}),
      };
    });

  return walk(rawBlocks);
}

export function enrichEntries(rawEntries: RawEntry[]): Entry[] {
  const entrySlugCounts = new Map<string, number>();

  return rawEntries.map((raw) => {
    const name = cleanName(raw.rawName);
    const baseSlug = slugify(name);
    const count = entrySlugCounts.get(baseSlug) ?? 0;
    const slug = count === 0 ? baseSlug : `${baseSlug}-${count + 1}`;
    entrySlugCounts.set(baseSlug, count + 1);

    const idBase = `ent__${limitSlugWords(slug).replace(/-/g, "_")}`;
    const idCount = entrySlugCounts.get(idBase) ?? 0;
    const id = idCount === 0 ? idBase : `${idBase}_${idCount + 1}`;
    entrySlugCounts.set(idBase, idCount + 1);

    const blocks = enrichBlocks(raw.blocks);

    return {
      id,
      rawName: raw.rawName,
      name,
      slug,
      path: raw.path,
      blocks,
      ...(raw.description ? { description: raw.description } : {}),
      ...(raw.displayName ? { displayName: raw.displayName } : {}),
      ...(raw.tags ? { tags: raw.tags } : {}),
      ...(raw.isDraft ? { isDraft: true } : {}),
      ...(raw.isUnlisted ? { isUnlisted: true } : {}),
    };
  });
}

export function enrichCollections(
  rawCollections: RawCollection[],
  configIndex: Map<string, CollectionConfig>
): Collection[] {
  const collectionSlugCounts = new Map<string, number>();
  const collectionIdCounts = new Map<string, number>();

  return rawCollections.map((raw) => {
    const matchConfig =
      configIndex.get(raw.path) ?? configIndex.get(normalizePath(raw.rawName));

    const configuredName =
      matchConfig?.name && typeof matchConfig.name === "string"
        ? cleanName(matchConfig.name)
        : undefined;
    const name = configuredName ?? cleanName(raw.rawName);

    const configuredSlug =
      matchConfig?.slug && typeof matchConfig.slug === "string"
        ? slugify(matchConfig.slug)
        : undefined;
    const baseSlug = configuredSlug ?? slugify(name);
    const slugCount = collectionSlugCounts.get(baseSlug) ?? 0;
    const slug = slugCount === 0 ? baseSlug : `${baseSlug}-${slugCount + 1}`;
    collectionSlugCounts.set(baseSlug, slugCount + 1);

    const idBase = `col__${limitSlugWords(slug).replace(/-/g, "_")}`;
    const idCount = collectionIdCounts.get(idBase) ?? 0;
    const id = idCount === 0 ? idBase : `${idBase}_${idCount + 1}`;
    collectionIdCounts.set(idBase, idCount + 1);

    const entries = enrichEntries(raw.entries);
    const isUnlisted = !!raw.isUnlisted;
    const entriesWithUnlisted = isUnlisted
      ? entries.map((entry) => ({ ...entry, isUnlisted: true }))
      : entries;
    const assets = raw.assets ? enrichBlocks(raw.assets) : undefined;

    return {
      id,
      rawName: raw.rawName,
      name,
      slug,
      path: raw.path,
      entries: entriesWithUnlisted,
      ...(assets ? { assets } : {}),
      ...(raw.description ? { description: raw.description } : {}),
      ...(raw.displayName ? { displayName: raw.displayName } : {}),
      ...(isUnlisted ? { isUnlisted: true } : {}),
    };
  });
}
