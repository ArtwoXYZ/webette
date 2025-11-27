// Route resolver: enriches the scanned model with slug-based routes, honoring
// optional collection-level overrides from the site config.
import type { Block, Collection, Entry, Site } from "./model";

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
  const route = `${joinRoute(...parentSegments)}/`;
  const blocks = entry.blocks.map((block) =>
    resolveBlockRoutes(block, parentSegments)
  );

  return {
    ...entry,
    route,
    blocks,
  };
}

function resolveCollectionRoutes(
  collection: Collection,
  config?: Record<string, unknown>
): Collection {
  const collectionConfig = config as CollectionConfig | undefined;
  const configuredRoute = normalizeRouteSegment(collectionConfig?.route);

  const baseRoute = configuredRoute ?? collection.slug;
  const route = `${joinRoute(baseRoute)}/`;
  const entries = collection.entries.map((entry) =>
    resolveEntryRoutes(entry, baseRoute)
  );

  return {
    ...collection,
    route,
    entries,
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

  const collections = site.collections?.map((collection) => {
    // Match config by normalized path (preferred) or rawName as fallback.
    const matchConfig =
      configIndex.get(collection.path) ??
      configIndex.get(normalizePath(collection.rawName) ?? "");
    return resolveCollectionRoutes(collection, matchConfig);
  });

  return {
    ...site,
    route: "/",
    ...(collections ? { collections } : {}),
  };
}
