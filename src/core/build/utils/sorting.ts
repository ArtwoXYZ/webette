/**
 * Apply site-level sorting (including date-based sorting) after history is known.
 */

import type { Site, Collection, Entry, Block } from "../../model";
import { SiteModelTransformer } from "../../site-model-transformer";
import type { Logger } from "../../../logging/logger";
import { cleanName, orderKey, slugify } from "../../../utils/naming";
import { toPosix } from "../../../utils/path";
import type { SortOrder } from "../../scan/internal-types";

type SortType = "name" | "created" | "updated";
type SortSpec = { type: SortType; order: SortOrder };

type SortingSection = {
  type?: SortType;
  order?: SortOrder;
  custom?: CustomSorting[];
};

export type SortingConfig = {
  type?: SortType;
  order?: SortOrder;
  collections?: SortingSection;
  entries?: SortingSection;
  blocks?: SortingSection;
};

type CustomSorting = {
  collection?: string;
  entry?: string;
  type?: SortType;
  order?: SortOrder;
};

const DEFAULT_SORT: SortSpec = { type: "name", order: "asc" };

function normalizeSortOrder(value: unknown): SortOrder | undefined {
  return value === "asc" || value === "desc" ? value : undefined;
}

function normalizeSortType(
  value: unknown,
  scope: string,
  warned: Set<string>,
  logger?: Logger
): SortType | undefined {
  if (value === undefined || value === null) return undefined;
  if (value === "name" || value === "created" || value === "updated") return value;
  const key = `${scope}:${String(value)}`;
  if (!warned.has(key)) {
    warned.add(key);
    logger?.warn("scan.sortingUnknownType", { scope, type: value, fallback: "name" });
  }
  return "name";
}

function pickType(
  candidates: Array<{ value: unknown; scope: string }>,
  warned: Set<string>,
  logger?: Logger
): SortType | undefined {
  for (const candidate of candidates) {
    if (candidate.value === undefined || candidate.value === null) continue;
    return normalizeSortType(candidate.value, candidate.scope, warned, logger) ?? "name";
  }
  return undefined;
}

function pickOrder(candidates: Array<{ value: unknown }>): SortOrder | undefined {
  for (const candidate of candidates) {
    const order = normalizeSortOrder(candidate.value);
    if (order) return order;
  }
  return undefined;
}

function resolveSortSpec(
  candidates: {
    type: Array<{ value: unknown; scope: string }>;
    order: Array<{ value: unknown }>;
  },
  warned: Set<string>,
  logger?: Logger
): SortSpec {
  const type = pickType(candidates.type, warned, logger) ?? "name";
  const order = pickOrder(candidates.order) ?? "asc";
  return { type, order };
}

function findCustomSorting(
  items: CustomSorting[] | undefined,
  collectionKey: string | undefined,
  entryKey: string | undefined
): CustomSorting | undefined {
  if (!collectionKey || !items) return undefined;
  let collectionMatch: CustomSorting | undefined;
  for (const item of items) {
    if (item.collection !== collectionKey) continue;
    if (typeof item.entry === "string") {
      if (entryKey && item.entry === entryKey) return item;
      continue;
    }
    if (!collectionMatch) collectionMatch = item;
  }
  return collectionMatch;
}

function buildCollectionKeyIndex(site: Site): Map<string, string> {
  const map = new Map<string, string>();
  const raw = site.config?.collections;
  if (!raw || typeof raw !== "object") return map;

  for (const [key, value] of Object.entries(raw)) {
    if (!value || typeof value !== "object") continue;
    const cfg = value as Record<string, unknown>;
    const normalizedPath =
      typeof cfg.path === "string" && cfg.path ? toPosix(cfg.path) : toPosix(key);
    map.set(normalizedPath, key);
  }

  return map;
}

function resolveCollectionKey(
  collection: Collection,
  index: Map<string, string>
): string | undefined {
  return (
    index.get(collection.path) ??
    index.get(toPosix(collection.rawName)) ??
    collection.slug ??
    collection.id
  );
}

function entryKeyFromEntry(entry: Entry): string {
  if (entry.slug && entry.slug.trim()) return entry.slug;
  return slugify(cleanName(entry.rawName));
}

function resolveCollectionSort(
  sorting: SortingConfig | undefined,
  warned: Set<string>,
  logger?: Logger
): SortSpec {
  if (!sorting) return DEFAULT_SORT;
  return resolveSortSpec(
    {
      type: [
        { value: sorting.collections?.type, scope: "sorting.collections.type" },
        { value: sorting.type, scope: "sorting.type" },
      ],
      order: [{ value: sorting.collections?.order }, { value: sorting.order }],
    },
    warned,
    logger
  );
}

function resolveEntrySort(
  sorting: SortingConfig | undefined,
  collectionKey: string | undefined,
  warned: Set<string>,
  logger?: Logger
): SortSpec {
  if (!sorting) return DEFAULT_SORT;
  const custom = findCustomSorting(sorting.entries?.custom, collectionKey, undefined);
  const customScope = collectionKey
    ? `sorting.entries.custom.type:${collectionKey}`
    : "sorting.entries.custom.type";
  return resolveSortSpec(
    {
      type: [
        { value: custom?.type, scope: customScope },
        { value: sorting.entries?.type, scope: "sorting.entries.type" },
        { value: sorting.type, scope: "sorting.type" },
      ],
      order: [
        { value: custom?.order },
        { value: sorting.entries?.order },
        { value: sorting.order },
      ],
    },
    warned,
    logger
  );
}

function resolveBlockSort(
  sorting: SortingConfig | undefined,
  collectionKey: string | undefined,
  entryKey: string | undefined,
  warned: Set<string>,
  logger?: Logger
): SortSpec {
  if (!sorting) return DEFAULT_SORT;
  const custom = findCustomSorting(sorting.blocks?.custom, collectionKey, entryKey);
  const customScope = collectionKey
    ? entryKey
      ? `sorting.blocks.custom.type:${collectionKey}:${entryKey}`
      : `sorting.blocks.custom.type:${collectionKey}`
    : "sorting.blocks.custom.type";
  return resolveSortSpec(
    {
      type: [
        { value: custom?.type, scope: customScope },
        { value: sorting.blocks?.type, scope: "sorting.blocks.type" },
        { value: sorting.type, scope: "sorting.type" },
      ],
      order: [
        { value: custom?.order },
        { value: sorting.blocks?.order },
        { value: sorting.order },
      ],
    },
    warned,
    logger
  );
}

function compareByName(
  a: { rawName: string },
  b: { rawName: string },
  order: SortOrder
): number {
  const dir = order === "desc" ? -1 : 1;
  const orderA = orderKey(a.rawName);
  const orderB = orderKey(b.rawName);
  if (orderA !== orderB) return (orderA - orderB) * dir;
  return a.rawName.localeCompare(b.rawName, undefined, { sensitivity: "base" }) * dir;
}

function toTimestamp(value: unknown): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : null;
}

function compareByDate(
  a: { rawName: string; createdAt?: string; updatedAt?: string },
  b: { rawName: string; createdAt?: string; updatedAt?: string },
  field: "createdAt" | "updatedAt",
  order: SortOrder
): number {
  const aTs = toTimestamp(a[field]);
  const bTs = toTimestamp(b[field]);
  if (aTs === null && bTs === null) return compareByName(a, b, order);
  if (aTs === null) return 1;
  if (bTs === null) return -1;
  if (aTs === bTs) return compareByName(a, b, order);
  return order === "asc" ? aTs - bTs : bTs - aTs;
}

function sortList<T extends { rawName: string; createdAt?: string; updatedAt?: string }>(
  items: T[],
  sort: SortSpec
): T[] {
  if (items.length < 2) return items;
  const sorted = [...items];
  if (sort.type === "name") {
    sorted.sort((a, b) => compareByName(a, b, sort.order));
    return sorted;
  }
  const field = sort.type === "created" ? "createdAt" : "updatedAt";
  sorted.sort((a, b) => compareByDate(a, b, field, sort.order));
  return sorted;
}

function sortBlocks(blocks: Block[] | undefined, sort: SortSpec): Block[] | undefined {
  if (!blocks) return blocks;
  const sorted = sortList(blocks, sort);
  return sorted.map((block) => {
    if (!block.subBlocks) return block;
    const subBlocks = sortBlocks(block.subBlocks, sort);
    return subBlocks === block.subBlocks ? block : { ...block, subBlocks };
  });
}

export function applySorting(site: Site, logger?: Logger): Site {
  const sortingRaw = site?.config?.sorting;
  const sorting =
    sortingRaw && typeof sortingRaw === "object"
      ? (sortingRaw as SortingConfig)
      : undefined;
  if (!sorting) return site;

  const warned = new Set<string>();
  const collectionKeyIndex = buildCollectionKeyIndex(site);
  const collectionSort = resolveCollectionSort(sorting, warned, logger);

  const collections = site.collections ? sortList(site.collections, collectionSort) : undefined;
  const rootEntries = site.rootEntries
    ? (() => {
      const entrySort = resolveEntrySort(sorting, undefined, warned, logger);
      return sortList(site.rootEntries, entrySort).map((entry) => {
        const entryKey = entryKeyFromEntry(entry);
        const blockSort = resolveBlockSort(sorting, undefined, entryKey, warned, logger);
        const blocks = sortBlocks(entry.blocks, blockSort) ?? entry.blocks;
        return blocks === entry.blocks ? entry : { ...entry, blocks };
      });
    })()
    : undefined;
  if (!collections) {
    return {
      ...site,
      ...(rootEntries ? { rootEntries } : {}),
    };
  }

  const sortedCollections = collections.map((collection) => {
    const collectionKey = resolveCollectionKey(collection, collectionKeyIndex);
    const entrySort = resolveEntrySort(sorting, collectionKey, warned, logger);
    const entries = sortList(collection.entries ?? [], entrySort).map((entry) => {
      const entryKey = entryKeyFromEntry(entry);
      const blockSort = resolveBlockSort(sorting, collectionKey, entryKey, warned, logger);
      const blocks = sortBlocks(entry.blocks, blockSort) ?? entry.blocks;
      return blocks === entry.blocks ? entry : { ...entry, blocks };
    });

    const assetsSort = resolveBlockSort(sorting, collectionKey, undefined, warned, logger);
    const assets = collection.assets ? sortBlocks(collection.assets, assetsSort) : undefined;

    return {
      ...collection,
      entries,
      ...(assets ? { assets } : {}),
    };
  });

  const collectionByKey = new Map(
    sortedCollections.map((collection) => [collection.slug || collection.id, collection])
  );

  const sortedRootIndex =
    site.indexes?.root
      ? (() => {
        const entryKey = entryKeyFromEntry(site.indexes!.root!);
        const blockSort = resolveBlockSort(sorting, undefined, entryKey, warned, logger);
        const blocks = sortBlocks(site.indexes!.root!.blocks, blockSort) ?? site.indexes!.root!.blocks;
        return blocks === site.indexes!.root!.blocks
          ? site.indexes!.root!
          : { ...site.indexes!.root!, blocks };
      })()
      : undefined;

  const sortedCollectionIndexes = site.indexes?.collections
    ? Object.fromEntries(
      Object.entries(site.indexes.collections).map(([key, entry]) => {
        const collection = collectionByKey.get(key);
        const collectionKey = collection ? resolveCollectionKey(collection, collectionKeyIndex) : undefined;
        const entryKey = entryKeyFromEntry(entry);
        const blockSort = resolveBlockSort(sorting, collectionKey, entryKey, warned, logger);
        const blocks = sortBlocks(entry.blocks, blockSort) ?? entry.blocks;
        const nextEntry = blocks === entry.blocks ? entry : { ...entry, blocks };
        return [key, nextEntry];
      })
    )
    : undefined;

  // Build the update object
  const update: Partial<Site> = {
    ...(rootEntries ? { rootEntries } : {}),
    collections: sortedCollections,
    ...((sortedRootIndex || sortedCollectionIndexes)
      ? {
        indexes: {
          ...(site.indexes ?? {}),
          ...(sortedRootIndex ? { root: sortedRootIndex } : {}),
          ...(sortedCollectionIndexes ? { collections: sortedCollectionIndexes } : {}),
        },
      }
      : {}),
  };

  // Use SiteModelTransformer to ensure all properties are preserved
  return SiteModelTransformer.fromPartialUpdate(site, update).build();
}
