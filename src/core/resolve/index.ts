import type { Collection, Entry, Site, Block } from "../model";
import {
  getResolver,
  type ResolveContext,
} from "./registry";

// Entry point: walk the scanned model and enrich blocks with resolved content.
export interface ResolveOptions {
  rootDir?: string;
  readContent?: boolean;
  logger?: ResolveContext["logger"];
  remarkPlugins?: ResolveContext["remarkPlugins"];
  beforeBlock?: ResolveContext["beforeBlock"];
  afterBlock?: ResolveContext["afterBlock"];
}

function createContext(site: Site, options: ResolveOptions): ResolveContext {
  const rootDir = options.rootDir ?? site.rootDir;

  return {
    rootDir,
    readContent: options.readContent,
    logger: options.logger,
    remarkPlugins: options.remarkPlugins,
    beforeBlock: options.beforeBlock,
    afterBlock: options.afterBlock,
  };
}

async function resolveBlock(
  block: Block,
  ctx: ResolveContext
): Promise<Block> {
  ctx.beforeBlock?.(block);

  // Resolve children first so folder/meta resolvers see already enriched subBlocks
  const subBlocks = block.subBlocks
    ? await Promise.all(block.subBlocks.map((child) => resolveBlock(child, ctx)))
    : undefined;

  const resolver = getResolver(block);
  const resolved = resolver ? await resolver(block, ctx) : undefined;

  ctx.afterBlock?.(block, resolved);

  return {
    ...block,
    ...(subBlocks ? { subBlocks } : {}),
    ...(resolved ? { content: resolved } : {}),
  };
}

async function resolveEntry(entry: Entry, ctx: ResolveContext): Promise<Entry> {
  const blocks = await Promise.all(entry.blocks.map((blk) => resolveBlock(blk, ctx)));
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
  const ctx = createContext(site, options);

  const collections = site.collections
    ? await Promise.all(site.collections.map((col) => resolveCollection(col, ctx)))
    : undefined;

  // Keep the same shape as the scanned site, only adding resolved content
  return {
    ...site,
    ...(collections ? { collections } : {}),
  };
}
