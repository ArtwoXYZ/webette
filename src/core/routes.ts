/**
 * Route generation for collections/entries/blocks (slug-based, config-aware).
 */
import type { Block, Collection, Entry, Site } from "./model";
import { SiteModelTransformer } from "./site-model-transformer";
import { ensureLeadingSlash } from "../utils/path";

type CollectionConfig = {
  path?: string;
  name?: string;
  route?: string;
};

function normalizePath(value: unknown): string | undefined {
  return typeof value === "string" && value ? value.replace(/\\/g, "/") : undefined;
}

function normalizeRouteSegment(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().replace(/^\/+|\/+$/g, "");
  return trimmed || undefined;
}

function routeSegments(base: string): string[] {
  return base.split("/").filter(Boolean);
}

function joinRoute(...segments: string[]): string {
  return segments.filter(Boolean).join("/");
}

function resolveBlockRoutes(block: Block, parentSegments: string[]): Block {
  // Blocks inherit the parent route segments for structure, but the route itself
  // is set later by resolvers/processors when needed.
  const segments = [...parentSegments, block.slug];
  const subBlocks = block.subBlocks?.map((sub) => resolveBlockRoutes(sub, segments));

  return {
    ...block,
    ...(subBlocks ? { subBlocks } : {}),
  };
}

function resolveEntryRoutes(entry: Entry, collectionRoute: string): Entry {
  // Entries live under the collection route; blocks nest beneath entries.
  const baseSegments = routeSegments(collectionRoute);
  const parentSegments = [...baseSegments, entry.slug];
  const route = ensureLeadingSlash(`${joinRoute(...parentSegments)}/`);
  const blocks = entry.blocks.map((block) =>
    resolveBlockRoutes(block, parentSegments)
  );

  return {
    ...entry,
    route,
    blocks,
  };
}

function resolveRootEntryRoutes(entry: Entry): Entry {
  const parentSegments = [entry.slug];
  const route = ensureLeadingSlash(`${joinRoute(...parentSegments)}/`);
  const blocks = entry.blocks.map((block) => resolveBlockRoutes(block, parentSegments));

  return {
    ...entry,
    route,
    blocks,
  };
}

function resolveCollectionRoutes(
  collection: Collection,
  config: Record<string, unknown> | undefined,
  baseRoute: string
): Collection {
  const route = ensureLeadingSlash(`${joinRoute(baseRoute)}/`);
  const entries = collection.entries.map((entry) =>
    resolveEntryRoutes(entry, baseRoute)
  );

  return {
    ...collection,
    route,
    entries,
  };
}

function resolveRootIndexRoutes(entry: Entry): Entry {
  const baseRoute = entry.slug;
  const parentSegments = routeSegments(baseRoute);
  const route = ensureLeadingSlash(`${joinRoute(...parentSegments)}/`);
  const blocks = entry.blocks.map((block) => resolveBlockRoutes(block, parentSegments));

  return {
    ...entry,
    route,
    blocks,
  };
}

function buildConfigIndex(site: Site): Map<string, CollectionConfig> {
  // Build a lookup keyed by configured path (or collection key) for fast matching.
  const map = new Map<string, CollectionConfig>();
  const raw = site.config?.collections;
  if (!raw || typeof raw !== "object") return map;

  for (const [key, value] of Object.entries(raw)) {
    if (!value || typeof value !== "object") continue;
    const cfg = value as CollectionConfig;
    const path = normalizePath(cfg.path) ?? key;
    map.set(path, cfg);
  }

  return map;
}

export function resolveRoutes(site: Site): Site {
  const configIndex = buildConfigIndex(site);
  const collectionList = site.collections ?? [];
  const collectionsByPath = new Map<string, Collection>(
    collectionList.map((collection) => [normalizePath(collection.path) ?? collection.path, collection])
  );
  const resolvedCollectionByPath = new Map<string, Collection>();

  const resolveCollectionBaseRoute = (collection: Collection): string => {
    const pathKey = normalizePath(collection.path) ?? collection.path;
    const cached = resolvedCollectionByPath.get(pathKey);
    if (cached?.route) {
      return cached.route.replace(/^\/+|\/+$/g, "");
    }

    // Match config by full path (preferred) or rawName as fallback.
    const matchConfig =
      configIndex.get(collection.path) ??
      configIndex.get(normalizePath(collection.rawName) ?? "");
    const collectionConfig = matchConfig as CollectionConfig | undefined;
    const configuredRoute = normalizeRouteSegment(collectionConfig?.route);
    const localSegment = configuredRoute ?? collection.slug;

    const parentPathRaw = normalizePath(collection.path)
      ?.split("/")
      .slice(0, -1)
      .join("/");
    const parentPath = parentPathRaw && parentPathRaw.trim() ? parentPathRaw : undefined;
    const parentCollection = parentPath ? collectionsByPath.get(parentPath) : undefined;
    const parentBaseRoute = parentCollection ? resolveCollectionBaseRoute(parentCollection) : "";
    return joinRoute(parentBaseRoute, localSegment);
  };

  const collections = collectionList.map((collection) => {
    const matchConfig =
      configIndex.get(collection.path) ??
      configIndex.get(normalizePath(collection.rawName) ?? "");
    const baseRoute = resolveCollectionBaseRoute(collection);
    const resolved = resolveCollectionRoutes(collection, matchConfig, baseRoute);
    const pathKey = normalizePath(collection.path) ?? collection.path;
    resolvedCollectionByPath.set(pathKey, resolved);
    return resolved;
  });

  const rootEntries = site.rootEntries?.map((entry) => resolveRootEntryRoutes(entry));

  const rootIndex = site.indexes?.root ? resolveRootIndexRoutes(site.indexes.root) : undefined;
  const collectionIndexes = site.indexes?.collections
    ? Object.fromEntries(
      Object.entries(site.indexes.collections).map(([key, entry]) => {
        const collection = collections?.find(
          (col) => (col.slug || col.id) === key || col.path === key
        );
        if (!collection) return [key, entry];
        const baseRoute = (collection.route ?? "")
          .replace(/^\/+|\/+$/g, "")
          .trim();
        const resolved = baseRoute ? resolveEntryRoutes(entry, baseRoute) : entry;
        return [key, resolved];
      })
    )
    : undefined;

  // Use SiteModelTransformer for clean site transformation
  return SiteModelTransformer.fromPartialUpdate(site, {
    route: "/",
    ...(rootEntries ? { rootEntries } : {}),
    ...(collections ? { collections } : {}),
    ...((rootIndex || collectionIndexes)
      ? {
        indexes: {
          ...(site.indexes ?? {}),
          ...(rootIndex ? { root: rootIndex } : {}),
          ...(collectionIndexes ? { collections: collectionIndexes } : {}),
        },
      }
      : {}),
  }).build();
}
