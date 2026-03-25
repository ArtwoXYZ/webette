/**
 * Reference block resolver: resolves cross-entry block references from reference*.webt files.
 */

import * as path from "node:path";
import { readFile } from "node:fs/promises";
import type { Block, Collection, Entry, Site } from "../../model";
import type { ResolveContext, ResolvedContent } from "../registry";
import { parseInternalReference, type ParsedTarget } from "../../../core/targets";
import {
  isRootCollectionName,
  matchCollection,
  matchEntry,
  matchBlock,
  matchRootEntry,
} from "../../../core/targets";
import { findResolver } from "../registry";
import { parseRouteSegments, buildBlockRouteHint } from "../route-hints";

type BlockLocation = {
  collection?: Collection;
  entry: Entry;
};

type ResolvedTarget = {
  collection?: Collection;
  entry: Entry;
  block: Block;
};

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

  for (const entry of site.rootEntries ?? []) {
    if (hasBlockPath(entry.blocks, blockPath)) {
      return { entry };
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
    if (isRootCollectionName(target.collectionName)) return undefined;
    return matchCollection(site, target.collectionName);
  }
  return currentLocation?.collection;
}

function resolveEntryForTarget(
  target: Extract<ParsedTarget, { kind: "entry" | "block" }>,
  site: Site,
  collection: Collection | undefined,
  currentLocation?: BlockLocation
): Entry | undefined {
  if (target.entryName) {
    if (target.collectionName) {
      if (isRootCollectionName(target.collectionName)) {
        return matchRootEntry(site, target.entryName);
      }
      if (!collection) return undefined;
      return matchEntry(collection, target.entryName);
    }

    if (!collection) return matchRootEntry(site, target.entryName);
    return matchEntry(collection, target.entryName);
  }

  if (target.collectionName && isRootCollectionName(target.collectionName)) {
    if (!currentLocation) return undefined;
    // Only allow implicit "current entry" when the current block itself is in a root entry.
    if (currentLocation.collection) return undefined;
    return currentLocation.entry;
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
  const entry = resolveEntryForTarget(target, site, collection, currentLocation);
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
      const tarfindResolver = findResolver(target.block);
      if (!tarfindResolver) {
        ctx.logger?.error("reference.tarfindResolverMissing", {
          block: block.path,
          targetBlock: target.block.path,
          targetType: target.block.type,
        });
        return undefined;
      }

      const parentSegments = parseRouteSegments(target.entry.route);
      const { routeHint, routeSegments } = buildBlockRouteHint(
        target.block,
        parentSegments
      );
      const targetCtx: ResolveContext = { ...ctx, routeHint, routeSegments };
      targetContent = await tarfindResolver(target.block, targetCtx);
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
