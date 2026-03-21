/**
 * Navigation filtering — finders for current context, visibility, link flags, and state application.
 */

import type { Block, Collection, Entry, Site } from "../../../model";
import {
  normalizeKey,
  type CollectionLike,
  type EntryLike,
} from "../../../../utils/navigation";
import { toPosix } from "../../../../utils/path";
import type { NavigationItem } from "./builder";
import type { NavigationOptions } from "./parser";

// ── Finders ────────────────────────────────────────────────────────────────────

export function findCollectionForBlock(
  site: Site,
  block: Block
): { collection: Collection; entry: Entry } | undefined {
  const blockPath = toPosix(block.path);
  for (const collection of site.collections ?? []) {
    for (const entry of collection.entries ?? []) {
      const entryPath = toPosix(entry.path ?? "");
      if (!entryPath) continue;
      if (blockPath.startsWith(`${entryPath}/`)) {
        return { collection, entry };
      }
    }
  }
  return undefined;
}

function findRootEntryForBlock(
  site: Site,
  block: Block
): { entry: Entry } | undefined {
  const blockPath = toPosix(block.path);
  for (const entry of site.rootEntries ?? []) {
    const entryPath = toPosix(entry.path ?? "");
    if (!entryPath) continue;
    if (blockPath.startsWith(`${entryPath}/`)) {
      return { entry };
    }
  }
  return undefined;
}

export function matchRootEntry(site: Site, rawName: string): Entry | undefined {
  const target = rawName.trim().toLowerCase();
  if (!target) return undefined;
  return (site.rootEntries ?? []).find((entry) => {
    const names = [entry.slug, entry.id, entry.name, entry.rawName]
      .filter(Boolean)
      .map((v) => String(v).trim().toLowerCase());
    return names.includes(target);
  });
}

export function findCurrentForBlock(
  site: Site,
  block: Block
): { collection?: Collection; entry?: Entry } | undefined {
  const direct = findCollectionForBlock(site, block);
  if (direct) return direct;
  const rootDirect = findRootEntryForBlock(site, block);
  if (rootDirect) return rootDirect;

  const blockPath = toPosix(block.path);
  const rootIndex = site.indexes?.root;
  if (rootIndex?.path) {
    const indexPath = toPosix(rootIndex.path);
    if (blockPath === indexPath || blockPath.startsWith(`${indexPath}/`)) {
      return { entry: rootIndex };
    }
  }

  const collections = site.collections ?? [];
  for (const [key, entry] of Object.entries(site.indexes?.collections ?? {})) {
    if (!entry?.path) continue;
    const indexPath = toPosix(entry.path);
    if (blockPath === indexPath || blockPath.startsWith(`${indexPath}/`)) {
      const collection = collections.find(
        (col) => (col.slug || col.id) === key || col.id === key
      );
      return { collection, entry };
    }
  }

  return undefined;
}

// ── Tree transformations ───────────────────────────────────────────────────────

export type VisibilityContext = {
  options: NavigationOptions;
  shouldIncludeCollection: (collection: CollectionLike) => boolean;
  shouldIncludeEntry: (entry: EntryLike, collection?: CollectionLike) => boolean;
};

export function applyVisibility(
  items: NavigationItem[],
  ctx: VisibilityContext
): NavigationItem[] {
  const processItem = (item: NavigationItem): NavigationItem[] => {
    const children = item.children ? applyVisibility(item.children, ctx) : undefined;
    const withChildren = children && children.length ? { ...item, children } : { ...item };

    if (withChildren.kind === "collection") {
      if (!ctx.shouldIncludeCollection(withChildren.collection)) return [];
      if (ctx.options.hideCollections) return children ?? [];
      const entriesCount =
        children?.filter((child) => child.kind === "entry").length ?? 0;
      return [
        {
          ...withChildren,
          collection: {
            ...withChildren.collection,
            entriesCount,
          },
        },
      ];
    }

    if (withChildren.kind === "entry") {
      if (!ctx.shouldIncludeEntry(withChildren.entry, withChildren.collection)) return [];
      if (ctx.options.hideEntries) return [];
      return [withChildren];
    }

    return [withChildren];
  };

  return items.flatMap(processItem);
}

export function applyLinkFlags(
  items: NavigationItem[],
  options: NavigationOptions
): NavigationItem[] {
  return items.map((item) => {
    const children = item.children ? applyLinkFlags(item.children, options) : undefined;
    const withChildren = children && children.length ? { ...item, children } : { ...item };

    if (withChildren.kind === "collection" && options.collectionsLink === false) {
      return { ...withChildren, link: false };
    }

    if (withChildren.kind === "entry" && options.entriesLink === false) {
      return { ...withChildren, link: false };
    }

    return withChildren;
  });
}

export type StateContext = {
  currentCollectionKey: string;
  currentEntryId: string | undefined;
};

export function applyState(
  items: NavigationItem[],
  ctx: StateContext,
  depth = 0
): NavigationItem[] {
  return items.map((item) => {
    const children = item.children ? applyState(item.children, ctx, depth + 1) : undefined;
    const withChildren = children && children.length ? { ...item, children } : { ...item };

    if (withChildren.kind === "collection") {
      const key = normalizeKey(
        withChildren.collection.slug || withChildren.collection.id || ""
      );
      const isCurrent = key && ctx.currentCollectionKey ? key === ctx.currentCollectionKey : false;
      const childActive = children?.some(
        (child) => child.isActive || child.isCurrent
      ) ?? false;
      const isActive = isCurrent || childActive;
      return {
        ...withChildren,
        depth,
        ...(isCurrent ? { isCurrent: true } : {}),
        ...(isActive ? { isActive: true } : {}),
      };
    }

    if (withChildren.kind === "entry") {
      const isActive = ctx.currentEntryId ? withChildren.entry.id === ctx.currentEntryId : false;
      return {
        ...withChildren,
        depth,
        ...(isActive ? { isActive: true } : {}),
      };
    }

    return { ...withChildren, depth };
  });
}
