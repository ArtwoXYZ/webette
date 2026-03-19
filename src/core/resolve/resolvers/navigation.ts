/**
 * Resolver for `navigation.webt` blocks (Navigation Plan).
 */

import { readFile } from "node:fs/promises";
import * as path from "node:path";
import type { Resolver } from "../registry";
import type { Block, Collection, Entry, Site } from "../../model";
import { slugify } from "../../../utils/naming";
import { matchCollection, matchEntry } from "../../targets";
import {
  buildExcludeSet,
  normalizeKey,
  shouldIncludeCollection as shouldIncludeCollectionUtil,
  shouldIncludeEntry as shouldIncludeEntryUtil,
  type CollectionLike,
  type EntryLike,
} from "../../navigation/utils";
import { parseNavigationBlock, type NavigationOptions, type ParsedItemLine } from "./navigation-parser";

type NavigationItem =
  | {
    kind: "title";
    title: string;
    route?: string;
    link?: boolean;
    isCurrent?: boolean;
    isActive?: boolean;
    depth?: number;
    children?: NavigationItem[];
  }
  | {
    kind: "collection";
    link?: boolean;
    title?: string;
    route?: string;
    isCurrent?: boolean;
    isActive?: boolean;
    depth?: number;
    collection: {
      id: string;
      name: string;
      displayName?: string;
      slug: string;
      route?: string;
      entriesCount: number;
      description?: string;
      isUnlisted?: boolean;
      assets?: Block[];
      createdAt?: string;
      updatedAt?: string;
    };
    children?: NavigationItem[];
  }
  | {
    kind: "entry";
    link?: boolean;
    title?: string;
    route?: string;
    isCurrent?: boolean;
    isActive?: boolean;
    depth?: number;
    collection: {
      id: string;
      name: string;
      displayName?: string;
      slug: string;
      route?: string;
      description?: string;
      isUnlisted?: boolean;
      assets?: Block[];
    };
    entry: {
      id: string;
      name: string;
      displayName?: string;
      description?: string;
      slug: string;
      route?: string;
      isDraft?: boolean;
      isUnlisted?: boolean;
      createdAt?: string;
      updatedAt?: string;
    };
    children?: NavigationItem[];
  };

function findCollectionForBlock(
  site: Site,
  block: Block
): { collection: Collection; entry: Entry } | undefined {
  const blockPath = block.path.replace(/\\/g, "/");
  for (const collection of site.collections ?? []) {
    for (const entry of collection.entries ?? []) {
      const entryPath = (entry.path ?? "").replace(/\\/g, "/");
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
  const blockPath = block.path.replace(/\\/g, "/");
  for (const entry of site.rootEntries ?? []) {
    const entryPath = (entry.path ?? "").replace(/\\/g, "/");
    if (!entryPath) continue;
    if (blockPath.startsWith(`${entryPath}/`)) {
      return { entry };
    }
  }
  return undefined;
}

function matchRootEntry(site: Site, rawName: string): Entry | undefined {
  const target = rawName.trim().toLowerCase();
  if (!target) return undefined;
  return (site.rootEntries ?? []).find((entry) => {
    const names = [entry.slug, entry.id, entry.name, entry.rawName]
      .filter(Boolean)
      .map((v) => String(v).trim().toLowerCase());
    return names.includes(target);
  });
}

function findCurrentForBlock(
  site: Site,
  block: Block
): { collection?: Collection; entry?: Entry } | undefined {
  const direct = findCollectionForBlock(site, block);
  if (direct) return direct;
  const rootDirect = findRootEntryForBlock(site, block);
  if (rootDirect) return rootDirect;

  const blockPath = block.path.replace(/\\/g, "/");
  const rootIndex = site.indexes?.root;
  if (rootIndex?.path) {
    const indexPath = rootIndex.path.replace(/\\/g, "/");
    if (blockPath === indexPath || blockPath.startsWith(`${indexPath}/`)) {
      return { entry: rootIndex };
    }
  }

  const collections = site.collections ?? [];
  for (const [key, entry] of Object.entries(site.indexes?.collections ?? {})) {
    if (!entry?.path) continue;
    const indexPath = entry.path.replace(/\\/g, "/");
    if (blockPath === indexPath || blockPath.startsWith(`${indexPath}/`)) {
      const collection = collections.find(
        (col) => (col.slug || col.id) === key || col.id === key
      );
      return { collection, entry };
    }
  }

  return undefined;
}

function buildEntryNode(collection: Collection, entry: Entry): NavigationItem {
  return {
    kind: "entry",
    route: entry.route,
    collection: {
      id: collection.id,
      name: collection.name,
      displayName: collection.displayName,
      slug: collection.slug,
      route: collection.route,
      description: collection.description,
      assets: collection.assets,
      isUnlisted: collection.isUnlisted,
    },
    entry: {
      id: entry.id,
      name: entry.name,
      displayName: entry.displayName,
      description: entry.description,
      slug: entry.slug,
      route: entry.route,
      isDraft: entry.isDraft,
      isUnlisted: entry.isUnlisted,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    },
  };
}

function buildRootEntryNode(entry: Entry): NavigationItem {
  return {
    kind: "entry",
    route: entry.route,
    collection: {
      id: "__root__",
      name: "Root",
      slug: "root",
      route: "/",
    },
    entry: {
      id: entry.id,
      name: entry.name,
      displayName: entry.displayName,
      description: entry.description,
      slug: entry.slug,
      route: entry.route,
      isDraft: entry.isDraft,
      isUnlisted: entry.isUnlisted,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    },
  };
}

function buildCollectionNode(
  collection: Collection,
  children: NavigationItem[]
): NavigationItem {
  const entriesCount = children.filter((child) => child.kind === "entry").length;
  return {
    kind: "collection",
    route: collection.route,
    collection: {
      id: collection.id,
      name: collection.name,
      displayName: collection.displayName,
      slug: collection.slug,
      route: collection.route,
      entriesCount,
      description: collection.description,
      assets: collection.assets,
      isUnlisted: collection.isUnlisted,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
    },
    ...(children.length ? { children } : {}),
  };
}

function normalizeCollectionPathKey(value: string | undefined): string {
  return (value ?? "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

function parentCollectionPathKey(collectionPath: string): string {
  const normalized = normalizeCollectionPathKey(collectionPath);
  if (!normalized) return "";
  const parent = path.posix.dirname(normalized);
  return parent === "." ? "" : parent;
}

function buildCollectionForestNodes(
  collections: Collection[],
  buildChildrenForCollection: (collection: Collection) => NavigationItem[]
): NavigationItem[] {
  const byPath = new Map<string, Collection>();
  for (const collection of collections) {
    byPath.set(normalizeCollectionPathKey(collection.path), collection);
  }

  const childrenByParent = new Map<string, Collection[]>();
  for (const collection of collections) {
    const key = normalizeCollectionPathKey(collection.path);
    const parentKey = parentCollectionPathKey(key);
    const effectiveParentKey = parentKey && byPath.has(parentKey) ? parentKey : "";
    const siblings = childrenByParent.get(effectiveParentKey) ?? [];
    siblings.push(collection);
    childrenByParent.set(effectiveParentKey, siblings);
  }

  const buildNode = (collection: Collection): NavigationItem => {
    const collectionKey = normalizeCollectionPathKey(collection.path);
    const entryChildren = buildChildrenForCollection(collection);
    const nestedCollectionChildren = (childrenByParent.get(collectionKey) ?? []).map(buildNode);
    return buildCollectionNode(collection, [...entryChildren, ...nestedCollectionChildren]);
  };

  return (childrenByParent.get("") ?? []).map(buildNode);
}

function buildCollectionSubtreeNode(
  allCollections: Collection[],
  targetCollection: Collection,
  buildChildrenForCollection: (collection: Collection) => NavigationItem[]
): NavigationItem {
  const targetKey = normalizeCollectionPathKey(targetCollection.path);
  const subtreeCollections = allCollections.filter((collection) => {
    const key = normalizeCollectionPathKey(collection.path);
    return key === targetKey || key.startsWith(`${targetKey}/`);
  });

  const [root] = buildCollectionForestNodes(subtreeCollections, buildChildrenForCollection);
  return root ?? buildCollectionNode(targetCollection, buildChildrenForCollection(targetCollection));
}

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

      const node: NavigationItem = {
        kind: "entry",
        ...(title ? { title } : {}),
        route: anchor ? `${entry.route ?? ""}#${anchor}` : entry.route,
        collection: {
          id: collection.id,
          name: collection.name,
          displayName: collection.displayName,
          slug: collection.slug,
          route: collection.route,
          description: collection.description,
          assets: collection.assets,
          isUnlisted: collection.isUnlisted,
        },
        entry: {
          id: entry.id,
          name: entry.name,
          displayName: entry.displayName,
          description: entry.description,
          slug: entry.slug,
          route: anchor ? `${entry.route ?? ""}#${anchor}` : entry.route,
          isDraft: entry.isDraft,
          isUnlisted: entry.isUnlisted,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        },
      };

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

  const normalizeCollectionValue = (value: string): string => value.trim().toLowerCase();
  const isCurrentCollectionToken = (value: string): boolean =>
    ["current", "here", "this", "self", "."].includes(normalizeCollectionValue(value));

  const includeUnlisted = options.includeUnlisted === true;
  const siteHasDrafts =
    (ctx.site.collections ?? []).some((collection) =>
      (collection.entries ?? []).some((entry) => entry.isDraft)
    ) || (ctx.site.rootEntries ?? []).some((entry) => entry.isDraft);
  // Default to showing drafts when the site model includes them (serve mode).
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

  const applyVisibility = (items: NavigationItem[]): NavigationItem[] => {
    const processItem = (item: NavigationItem): NavigationItem[] => {
      const children = item.children ? applyVisibility(item.children) : undefined;
      const withChildren = children && children.length ? { ...item, children } : { ...item };

      if (withChildren.kind === "collection") {
        if (!shouldIncludeCollection(withChildren.collection)) return [];
        if (options.hideCollections) return children ?? [];
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
        if (!shouldIncludeEntry(withChildren.entry, withChildren.collection)) return [];
        if (options.hideEntries) return [];
        return [withChildren];
      }

      return [withChildren];
    };

    return items.flatMap(processItem);
  };

  const applyLinkFlags = (items: NavigationItem[]): NavigationItem[] => {
    return items.map((item) => {
      const children = item.children ? applyLinkFlags(item.children) : undefined;
      const withChildren = children && children.length ? { ...item, children } : { ...item };

      if (withChildren.kind === "collection" && options.collectionsLink === false) {
        return { ...withChildren, link: false };
      }

      if (withChildren.kind === "entry" && options.entriesLink === false) {
        return { ...withChildren, link: false };
      }

      return withChildren;
    });
  };

  const current = findCurrentForBlock(ctx.site, block);
  const currentCollectionKey = normalizeKey(current?.collection?.slug || current?.collection?.id || "");
  const currentEntryId = current?.entry?.id;

  const applyState = (items: NavigationItem[], depth = 0): NavigationItem[] => {
    return items.map((item) => {
      const children = item.children ? applyState(item.children, depth + 1) : undefined;
      const withChildren = children && children.length ? { ...item, children } : { ...item };

      if (withChildren.kind === "collection") {
        const key = normalizeKey(
          withChildren.collection.slug || withChildren.collection.id || ""
        );
        const isCurrent = key && currentCollectionKey ? key === currentCollectionKey : false;
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
        const isActive = currentEntryId ? withChildren.entry.id === currentEntryId : false;
        return {
          ...withChildren,
          depth,
          ...(isActive ? { isActive: true } : {}),
        };
      }

      return { ...withChildren, depth };
    });
  };

  finalItems = applyVisibility(finalItems);

  if (options.collectionsLink === false || options.entriesLink === false) {
    finalItems = applyLinkFlags(finalItems);
  }

  finalItems = applyState(finalItems);

  return {
    raw,
    data: {
      ...(navigationName ? { name: navigationName } : {}),
      items: finalItems,
    },
  };
};
