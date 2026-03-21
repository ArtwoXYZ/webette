/**
 * Resolver for `navigation.webt` blocks (Navigation Plan).
 *
 * Orchestrates parsing, tree building, filtering, and state application.
 * Implementation details live in sibling modules (parser, builder, filters).
 */

import { readFile } from "node:fs/promises";
import * as path from "node:path";
import type { Resolver } from "../../registry";
import { slugify } from "../../../../utils/naming";
import { matchCollection, matchEntry } from "../../../targets";
import {
  buildExcludeSet,
  normalizeKey,
  shouldIncludeCollection as shouldIncludeCollectionUtil,
  shouldIncludeEntry as shouldIncludeEntryUtil,
  type CollectionLike,
  type EntryLike,
} from "../../../../utils/navigation";
import { parseNavigationBlock } from "./parser";
import {
  type NavigationItem,
  buildEntryNode,
  buildRootEntryNode,
  buildCollectionForestNodes,
  buildCollectionSubtreeNode,
} from "./builder";
import {
  findCollectionForBlock,
  findCurrentForBlock,
  matchRootEntry,
  applyVisibility,
  applyLinkFlags,
  applyState,
} from "./filters";

export const resolveNavigation: Resolver = async (block, ctx) => {
  if (ctx.readContent === false) return undefined;

  const filePath = path.join(ctx.rootDir, block.path);
  const raw = await readFile(filePath, "utf8");
  const rawLines = raw.split(/\r?\n/);

  const { name: navigationName, options, parsedItems } = parseNavigationBlock(
    rawLines,
    block.path,
    ctx.logger
  );

  // ── Build tree from parsed items ───────────────────────────────────────────

  const roots: NavigationItem[] = [];
  type Frame = {
    level: number;
    node: NavigationItem;
    collectionContext?: ReturnType<typeof matchCollection>;
  };
  const stack: Frame[] = [];

  const findCollectionContext = (): ReturnType<typeof matchCollection> | undefined => {
    for (let i = stack.length - 1; i >= 0; i -= 1) {
      const found = stack[i]?.collectionContext;
      if (found) return found;
    }
    return undefined;
  };

  const appendChild = (parent: NavigationItem | null, child: NavigationItem) => {
    if (!parent) {
      roots.push(child);
      return;
    }
    parent.children = parent.children ?? [];
    parent.children.push(child);
  };

  for (const parsed of parsedItems) {
    const currentLevel = stack.length ? stack[stack.length - 1]!.level : -1;
    let level = parsed.level;
    if (level > currentLevel + 1) {
      ctx.logger?.warn("navigation.indentJump", { path: block.path, line: parsed.rawLine });
      level = currentLevel + 1;
    }

    while (stack.length && stack[stack.length - 1]!.level >= level) {
      stack.pop();
    }
    const parent = stack.length ? stack[stack.length - 1]!.node : null;

    const title = parsed.title?.trim() || undefined;
    const entryRaw = parsed.entry?.trim() || undefined;
    const collectionRaw = parsed.collection?.trim() || undefined;

    if (entryRaw) {
      const inherited = collectionRaw ? undefined : findCollectionContext();
      const collection = collectionRaw
        ? matchCollection(ctx.site, collectionRaw)
        : inherited;
      if (!collection) {
        const rootEntry = collectionRaw ? undefined : matchRootEntry(ctx.site, entryRaw);
        if (rootEntry) {
          const node: NavigationItem = {
            ...buildRootEntryNode(rootEntry),
            ...(title ? { title } : {}),
          };
          appendChild(parent, node);
          stack.push({ level, node });
          continue;
        }
        ctx.logger?.warn("navigation.entryMissingCollection", {
          path: block.path,
          line: parsed.rawLine,
        });
        continue;
      }

      const [entryValue, entryAnchor] = entryRaw.split("#");
      const entryName = (entryValue ?? "").trim();
      const anchorRaw = entryAnchor?.trim() || undefined;
      const anchor = anchorRaw ? slugify(anchorRaw) : undefined;
      const entry = matchEntry(collection, entryName);
      if (!entry) {
        ctx.logger?.warn("navigation.entryMissing", {
          path: block.path,
          collection: collectionRaw ?? (collection.slug || collection.id),
          entry: entryName || entryRaw,
        });
        continue;
      }

      const node = buildEntryNode(collection, entry, { title, anchor });

      appendChild(parent, node);
      stack.push({ level, node, collectionContext: collection });
      continue;
    }

    if (collectionRaw) {
      const collection = matchCollection(ctx.site, collectionRaw);
      if (!collection) {
        ctx.logger?.warn("navigation.collectionMissing", {
          path: block.path,
          collection: collectionRaw,
        });
        continue;
      }

      const node: NavigationItem = {
        kind: "collection",
        ...(title ? { title } : {}),
        route: collection.route,
        collection: {
          id: collection.id,
          name: collection.name,
          displayName: collection.displayName,
          slug: collection.slug,
          route: collection.route,
          entriesCount: collection.entries.length,
          description: collection.description,
          assets: collection.assets,
          isUnlisted: collection.isUnlisted,
          createdAt: collection.createdAt,
          updatedAt: collection.updatedAt,
        },
      };

      appendChild(parent, node);
      stack.push({ level, node, collectionContext: collection });
      continue;
    }

    if (title) {
      const node: NavigationItem = { kind: "title", title };
      appendChild(parent, node);
      stack.push({ level, node });
      continue;
    }

    ctx.logger?.warn("navigation.lineInvalid", { path: block.path, line: parsed.rawLine });
  }

  // ── Mode selection & initial items ─────────────────────────────────────────

  const normalizeCollectionValue = (value: string): string => value.trim().toLowerCase();
  const isCurrentCollectionToken = (value: string): boolean =>
    ["current", "here", "this", "self", "."].includes(normalizeCollectionValue(value));

  const includeUnlisted = options.includeUnlisted === true;
  const siteHasDrafts =
    (ctx.site.collections ?? []).some((collection) =>
      (collection.entries ?? []).some((entry) => entry.isDraft)
    ) || (ctx.site.rootEntries ?? []).some((entry) => entry.isDraft);
  const includeDrafts =
    typeof options.includeDrafts === "boolean" ? options.includeDrafts : siteHasDrafts;
  const excludeCollections = buildExcludeSet(options.excludeCollections);
  const excludeEntries = buildExcludeSet(options.excludeEntries);

  const shouldIncludeCollection = (collection: CollectionLike): boolean =>
    shouldIncludeCollectionUtil(collection, includeUnlisted, excludeCollections);

  const shouldIncludeEntry = (entry: EntryLike, collection?: CollectionLike): boolean =>
    shouldIncludeEntryUtil(entry, collection, includeUnlisted, includeDrafts, excludeEntries);

  let finalItems: NavigationItem[] = [];

  if (roots.length > 0) {
    finalItems = roots;
  } else if (options.mode === "collection") {
    const rawCollection = options.collection?.trim() ?? "current";
    let targetCollection: ReturnType<typeof matchCollection> | undefined;

    if (isCurrentCollectionToken(rawCollection)) {
      const found = findCollectionForBlock(ctx.site, block);
      targetCollection = found?.collection ?? undefined;
    } else {
      targetCollection = matchCollection(ctx.site, rawCollection);
    }

    if (targetCollection && shouldIncludeCollection(targetCollection)) {
      finalItems = [
        buildCollectionSubtreeNode(
          ctx.site.collections ?? [],
          targetCollection,
          (collection) =>
            (collection.entries ?? []).map((entry) => buildEntryNode(collection, entry))
        ),
      ];
    } else if (!targetCollection && rawCollection) {
      ctx.logger?.warn("navigation.collectionMissing", {
        path: block.path,
        collection: rawCollection,
      });
    }
  } else {
    const rootEntryItems = (ctx.site.rootEntries ?? [])
      .filter((entry) => shouldIncludeEntry(entry))
      .map((entry) => buildRootEntryNode(entry));
    finalItems = [
      ...rootEntryItems,
      ...buildCollectionForestNodes(
        ctx.site.collections ?? [],
        (collection) => (collection.entries ?? []).map((entry) => buildEntryNode(collection, entry))
      ),
    ];
  }

  // ── Apply filters and state ────────────────────────────────────────────────

  finalItems = applyVisibility(finalItems, {
    options,
    shouldIncludeCollection,
    shouldIncludeEntry,
  });

  if (options.collectionsLink === false || options.entriesLink === false) {
    finalItems = applyLinkFlags(finalItems, options);
  }

  const current = findCurrentForBlock(ctx.site, block);
  const currentCollectionKey = normalizeKey(current?.collection?.slug || current?.collection?.id || "");
  const currentEntryId = current?.entry?.id;

  finalItems = applyState(finalItems, { currentCollectionKey, currentEntryId });

  return {
    raw,
    data: {
      ...(navigationName ? { name: navigationName } : {}),
      items: finalItems,
    },
  };
};
