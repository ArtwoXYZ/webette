/**
 * Block resolution walker: enriches blocks by running type-specific resolvers.
 */

import type { Collection, Entry, Site, Block } from "../model";
import type { WebetteEnv } from "../../config/env";
import { resolveImageConfig } from "../block-types/image/config";
import { clearImageAssetCache } from "../block-types/image/engine";
import { resolveAudioConfig } from "../block-types/audio/config";
import { clearAudioAssetCache } from "../block-types/audio/engine";
import { resolveVideoConfig } from "../block-types/video/config";
import { clearVideoAssetCache } from "../block-types/video/engine";
import { findResolver, type ResolveContext } from "./registry";
import { parseRouteSegments, buildBlockRouteHint } from "./route-hints";

export interface ResolveOptions {
  rootDir?: string;
  readContent?: boolean;
  logger?: ResolveContext["logger"];
  remarkPlugins?: ResolveContext["remarkPlugins"];
  beforeBlock?: ResolveContext["beforeBlock"];
  afterBlock?: ResolveContext["afterBlock"];
  toolEnv?: WebetteEnv;
}

function createContext(site: Site, options: ResolveOptions): ResolveContext {
  const rootDir = options.rootDir ?? site.rootDir;
  const imageConfig = options.toolEnv
    ? resolveImageConfig(rootDir, options.toolEnv, site)
    : undefined;
  const audioConfig = options.toolEnv
    ? resolveAudioConfig(rootDir, options.toolEnv, site)
    : undefined;
  const videoConfig = options.toolEnv
    ? resolveVideoConfig(rootDir, options.toolEnv, site)
    : undefined;

  return {
    rootDir,
    site,
    toolEnv: options.toolEnv,
    imageConfig,
    audioConfig,
    videoConfig,
    readContent: options.readContent,
    logger: options.logger,
    remarkPlugins: options.remarkPlugins,
    beforeBlock: options.beforeBlock,
    afterBlock: options.afterBlock,
  };
}

async function resolveBlock(
  block: Block,
  ctx: ResolveContext,
  parentRouteSegments: string[]
): Promise<Block> {
  ctx.beforeBlock?.(block);

  const { routeHint, routeSegments } = buildBlockRouteHint(block, parentRouteSegments);
  const scopedCtx: ResolveContext = { ...ctx, routeHint, routeSegments };

  // Resolve children first so folder/meta resolvers see already enriched subBlocks
  const subBlocks = block.subBlocks
    ? await Promise.all(block.subBlocks.map((child) => resolveBlock(child, scopedCtx, routeSegments)))
    : undefined;

  const resolver = findResolver(block);
  const resolved = resolver ? await resolver(block, scopedCtx) : undefined;

  ctx.afterBlock?.(block, resolved);

  const { blockRoute, changedType, changedName, ...content } = resolved ?? {};

  return {
    ...block,
    ...(blockRoute ? { route: blockRoute } : {}),
    ...(changedType ? { type: changedType } : {}),
    ...(changedName ? { name: changedName } : {}),
    ...(subBlocks ? { subBlocks } : {}),
    ...(resolved ? { content } : {}),
  };
}

async function resolveEntry(entry: Entry, ctx: ResolveContext): Promise<Entry> {
  const parentSegments = parseRouteSegments(entry.route);
  const blocks = await Promise.all(
    entry.blocks.map((blk) => resolveBlock(blk, ctx, parentSegments))
  );
  return { ...entry, blocks };
}

async function resolveCollection(
  collection: Collection,
  ctx: ResolveContext
): Promise<Collection> {
  const entries = await Promise.all(
    collection.entries.map((entry) => resolveEntry(entry, ctx))
  );

  return { ...collection, entries };
}

export async function resolveBlocks(
  site: Site,
  options: ResolveOptions
): Promise<Site> {
  // Asset caches deduplicate work within one pass; reset so a new pass
  // (e.g. a serve rebuild into a cleaned output dir) re-emits every file.
  clearImageAssetCache();
  clearVideoAssetCache();
  clearAudioAssetCache();

  const ctx = createContext(site, options);

  const collections = site.collections
    ? await Promise.all(site.collections.map((col) => resolveCollection(col, ctx)))
    : undefined;
  const rootEntries = site.rootEntries
    ? await Promise.all(site.rootEntries.map((entry) => resolveEntry(entry, ctx)))
    : undefined;
  const rootIndex = site.indexes?.root
    ? await resolveEntry(site.indexes.root, ctx)
    : undefined;
  const collectionIndexes = site.indexes?.collections
    ? Object.fromEntries(
      await Promise.all(
        Object.entries(site.indexes.collections).map(async ([key, entry]) => [
          key,
          await resolveEntry(entry, ctx),
        ])
      )
    )
    : undefined;

  return {
    ...site,
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
  };
}
