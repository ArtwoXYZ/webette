/**
 * Reference block resolver: resolves cross-entry block references from reference*.webt files.
 */

import * as path from "node:path";
import { readFile } from "node:fs/promises";
import type { Block, Collection, Entry, Site } from "../../model";
import type { ResolveContext, ResolvedContent } from "../registry";
import { parseInternalReference, type ParsedTarget } from "../../../core/targets";
import { matchCollection, matchEntry, matchBlock } from "../../../core/targets";
import { getResolver } from "../registry";

type BlockLocation = {
  collection?: Collection;
  entry: Entry;
};

type ResolvedTarget = {
  collection?: Collection;
  entry: Entry;
  block: Block;
};

function splitRouteSegments(route?: string): string[] {
  if (!route) return [];
  return route.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
}

function buildBlockRouteHint(block: Block, parentSegments: string[]): {
  routeHint: string;
  routeSegments: string[];
} {
  const routeSegments = [...parentSegments, block.slug];
  const routeBase = routeSegments.join("/");
  const routeHint = block.ext ? `${routeBase}${block.ext}` : `${routeBase}/`;
  return { routeHint, routeSegments };
}

function hasBlockPath(blocks: Block[], blockPath: string): boolean {
  for (const current of blocks) {
    if (current.path === blockPath) return true;
    if (current.subBlocks && hasBlockPath(current.subBlocks, blockPath)) {
      return true;
    }
  }
  return false;
}

function findCurrentLocation(site: Site, blockPath: string): BlockLocation | undefined {
  for (const collection of site.collections ?? []) {
    for (const entry of collection.entries) {
      if (hasBlockPath(entry.blocks, blockPath)) {
        return { collection, entry };
      }
    }
  }

  const rootIndex = site.indexes?.root;
  if (rootIndex && hasBlockPath(rootIndex.blocks, blockPath)) {
    return { entry: rootIndex };
  }

  for (const [key, entry] of Object.entries(site.indexes?.collections ?? {})) {
    if (!hasBlockPath(entry.blocks, blockPath)) continue;
    const collection = site.collections?.find((candidate) => {
      const id = candidate.slug || candidate.id;
      return id === key;
    });
    return { collection, entry };
  }

  return undefined;
}

function resolveCollectionForTarget(
  target: Extract<ParsedTarget, { kind: "entry" | "block" }>,
  site: Site,
  currentLocation?: BlockLocation
): Collection | undefined {
  if (target.collectionName) {
    return matchCollection(site, target.collectionName);
  }
  return currentLocation?.collection;
}

function resolveEntryForTarget(
  target: Extract<ParsedTarget, { kind: "entry" | "block" }>,
  collection: Collection | undefined,
  currentLocation?: BlockLocation
): Entry | undefined {
  if (target.entryName) {
    if (!collection) return undefined;
    return matchEntry(collection, target.entryName);
  }

  if (!currentLocation) return undefined;
  if (!collection) return currentLocation.entry;
  if (currentLocation.collection?.id === collection.id) {
    return currentLocation.entry;
  }

  return undefined;
}

function resolveTarget(
  target: ParsedTarget,
  site: Site,
  currentLocation?: BlockLocation
): ResolvedTarget | undefined {
  if (target.kind === "url" || target.kind === "collection") {
    return undefined;
  }

  const collection = resolveCollectionForTarget(target, site, currentLocation);
  const entry = resolveEntryForTarget(target, collection, currentLocation);
  if (!entry) return undefined;

  if (target.kind === "entry") {
    const [firstBlock] = entry.blocks;
    if (!firstBlock) return undefined;
    return { collection, entry, block: firstBlock };
  }

  const block = matchBlock(entry, target.blockName);
  if (!block) return undefined;
  return { collection, entry, block };
}

function toResolvedContent(content: Block["content"]): ResolvedContent | undefined {
  if (!content) return undefined;
  return {
    raw: content.raw,
    data: content.data,
    meta: content.meta,
    ast: content.ast,
    html: content.html,
    variants: content.variants,
  };
}

export async function resolveReference(
  block: Block,
  ctx: ResolveContext
): Promise<ResolvedContent | undefined> {
  try {
    const refFilePath = path.join(ctx.rootDir, block.path);
    const rawContent = await readFile(refFilePath, "utf-8");

    const parsed = parseInternalReference(rawContent.trim());
    if (!parsed?.target) {
      ctx.logger?.error("reference.invalidFormat", {
        block: block.path,
        content: rawContent,
      });
      return undefined;
    }

    const currentLocation = findCurrentLocation(ctx.site, block.path);
    const target = resolveTarget(parsed.target, ctx.site, currentLocation);
    if (!target) {
      ctx.logger?.error("reference.targetNotFound", {
        block: block.path,
        target: parsed.target,
      });
      return undefined;
    }

    let targetContent = toResolvedContent(target.block.content);
    let targetRoute = target.block.route;

    if (!targetContent) {
      const targetResolver = getResolver(target.block);
      if (!targetResolver) {
        ctx.logger?.error("reference.targetResolverMissing", {
          block: block.path,
          targetBlock: target.block.path,
          targetType: target.block.type,
        });
        return undefined;
      }

      const parentSegments = splitRouteSegments(target.entry.route);
      const { routeHint, routeSegments } = buildBlockRouteHint(
        target.block,
        parentSegments
      );
      const targetCtx: ResolveContext = { ...ctx, routeHint, routeSegments };
      targetContent = await targetResolver(target.block, targetCtx);
      targetRoute = targetRoute ?? targetContent?.blockRoute;
    }

    if (!targetContent) {
      ctx.logger?.error("reference.targetResolveFailed", {
        block: block.path,
        targetBlock: target.block.path,
      });
      return undefined;
    }

    const { blockRoute: _targetBlockRoute, changedType: _targetChangedType, ...content } =
      targetContent;

    return {
      ...content,
      ...(targetRoute ? { blockRoute: targetRoute } : {}),
      changedType: target.block.type,
      changedName: target.block.name,
    };
  } catch (error) {
    ctx.logger?.error("reference.resolveError", {
      block: block.path,
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}
