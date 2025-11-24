import type { Block, Collection, Entry, Site } from "./model";

function joinRoute(...segments: string[]): string {
  return segments.filter(Boolean).join("/");
}

function resolveBlockRoutes(block: Block, parentSegments: string[]): Block {
  const segments = [...parentSegments, block.slug];
  const routeBase = joinRoute(...segments);
  const route = block.ext ? `${routeBase}${block.ext}` : `${routeBase}/`;

  const subBlocks = block.subBlocks?.map((sub) => resolveBlockRoutes(sub, segments));

  return {
    ...block,
    route,
    ...(subBlocks ? { subBlocks } : {}),
  };
}

function resolveEntryRoutes(entry: Entry, collectionSlug: string): Entry {
  const parentSegments = [collectionSlug, entry.slug];
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

function resolveCollectionRoutes(collection: Collection): Collection {
  const route = `${joinRoute(collection.slug)}/`;
  const entries = collection.entries.map((entry) =>
    resolveEntryRoutes(entry, collection.slug)
  );

  return {
    ...collection,
    route,
    entries,
  };
}

export function resolveRoutes(site: Site): Site {
  const collections = site.collections?.map(resolveCollectionRoutes);

  return {
    ...site,
    route: "/",
    ...(collections ? { collections } : {}),
  };
}
