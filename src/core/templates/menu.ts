/**
 * Handlebars `menu` helper to build unified navigation items for templates.
 */

import type Handlebars from "handlebars";
import * as path from "node:path";
import type { Collection, Entry } from "../model";
import {
  buildExcludeSet,
  normalizeKey,
  parseBoolean,
  parseList,
  shouldIncludeCollection,
  shouldIncludeEntry,
  type CollectionLike,
  type EntryLike,
} from "../navigation/utils";

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
    title?: string;
    route?: string;
    link?: boolean;
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
      assets?: any[];
      createdAt?: string;
      updatedAt?: string;
    };
    children?: NavigationItem[];
  }
  | {
    kind: "entry";
    title?: string;
    route?: string;
    link?: boolean;
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
      assets?: any[];
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

type MenuOptions = {
  includeUnlisted?: boolean;
  includeDrafts?: boolean;
  excludeCollections?: string[] | string;
  excludeEntries?: string[] | string;
  hideCollections?: boolean;
  hideEntries?: boolean;
  collectionsLink?: boolean;
  entriesLink?: boolean;
};

function findCurrentCollectionItem(items: NavigationItem[]): NavigationItem | undefined {
  for (const item of items) {
    if (item.kind === "collection" && item.isCurrent) return item;
    if (item.children?.length) {
      const found = findCurrentCollectionItem(item.children);
      if (found) return found;
    }
  }
  return undefined;
}

const buildEntryItem = (collection: Collection, entry: Entry): NavigationItem => ({
  kind: "entry",
  route: entry.route,
  collection: {
    id: collection.id,
    name: collection.name,
    displayName: collection.displayName,
    slug: collection.slug,
    route: collection.route,
    description: collection.description,
    isUnlisted: collection.isUnlisted,
    assets: collection.assets,
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
});

const buildCollectionItem = (collection: Collection, children: NavigationItem[]): NavigationItem => ({
  kind: "collection",
  route: collection.route,
  collection: {
    id: collection.id,
    name: collection.name,
    displayName: collection.displayName,
    slug: collection.slug,
    route: collection.route,
    entriesCount: children.filter((child) => child.kind === "entry").length,
    description: collection.description,
    isUnlisted: collection.isUnlisted,
    assets: collection.assets,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
  },
  ...(children.length ? { children } : {}),
});

const ROOT_MENU_COLLECTION: Collection = {
  id: "__root__",
  rawName: "(root)",
  name: "Root",
  slug: "root",
  path: "",
  route: "/",
  entries: [],
};

const buildRootEntryItem = (entry: Entry): NavigationItem =>
  buildEntryItem(ROOT_MENU_COLLECTION, entry);

function normalizeCollectionPathKey(value: string | undefined): string {
  return (value ?? "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

function parentCollectionPathKey(collectionPath: string): string {
  const normalized = normalizeCollectionPathKey(collectionPath);
  if (!normalized) return "";
  const parent = path.posix.dirname(normalized);
  return parent === "." ? "" : parent;
}

export function registerMenuHelper(handlebars: typeof Handlebars) {
  if (handlebars.helpers.menu) return;

  // Expose a unified `items[]` contract so templates don't branch on shape.
  handlebars.registerHelper("menu", function (options: any) {
    if (!options || typeof options.fn !== "function") return "";

    const root = options?.data?.root ?? {};
    const model = (root as any).model ?? root;
    const collections: Collection[] = Array.isArray((model as any).collections)
      ? (model as any).collections
      : [];
    const rootEntries: Entry[] = Array.isArray((model as any).rootEntries)
      ? (model as any).rootEntries
      : [];
    const currentCollection = (root as any).collection;
    const currentEntry = (root as any).entry;

    const parsedOptions: MenuOptions = options?.hash ?? {};
    const includeUnlisted = parseBoolean(parsedOptions.includeUnlisted) === true;
    const includeDraftsRaw = parseBoolean(parsedOptions.includeDrafts);
    const hasDrafts =
      collections.some((collection) =>
        (collection.entries ?? []).some((entry) => entry.isDraft)
      ) || rootEntries.some((entry) => entry.isDraft);
    // If drafts exist in the model (serve mode), show them unless explicitly disabled.
    const includeDrafts =
      typeof includeDraftsRaw === "boolean" ? includeDraftsRaw : hasDrafts;
    const hideCollections = parseBoolean(parsedOptions.hideCollections) === true;
    const hideEntries = parseBoolean(parsedOptions.hideEntries) === true;
    const collectionsLink = parseBoolean(parsedOptions.collectionsLink);
    const entriesLink = parseBoolean(parsedOptions.entriesLink);

    const excludeCollections = buildExcludeSet(parseList(parsedOptions.excludeCollections));
    const excludeEntries = buildExcludeSet(parseList(parsedOptions.excludeEntries));

    const shouldIncludeCollectionItem = (collection: CollectionLike) =>
      shouldIncludeCollection(collection, includeUnlisted, excludeCollections);
    const shouldIncludeEntryItem = (entry: EntryLike, collection?: CollectionLike) =>
      shouldIncludeEntry(entry, collection, includeUnlisted, includeDrafts, excludeEntries);

    // Apply include/exclude + hide rules to a tree of items.
    const applyVisibility = (items: NavigationItem[]): NavigationItem[] => {
      const processItem = (item: NavigationItem): NavigationItem[] => {
        const children = item.children ? applyVisibility(item.children) : undefined;
        const withChildren = children && children.length ? { ...item, children } : { ...item };

        if (withChildren.kind === "collection") {
          if (!shouldIncludeCollectionItem(withChildren.collection)) return [];
          if (hideCollections) return children ?? [];
          const entriesCount = children?.filter((child) => child.kind === "entry").length ?? 0;
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
          if (!shouldIncludeEntryItem(withChildren.entry, withChildren.collection)) return [];
          if (hideEntries) return [];
          return [withChildren];
        }

        return [withChildren];
      };

      return items.flatMap(processItem);
    };

    // Respect link=false settings for collections/entries.
    const applyLinkFlags = (items: NavigationItem[]): NavigationItem[] =>
      items.map((item) => {
        const children = item.children ? applyLinkFlags(item.children) : undefined;
        const withChildren = children && children.length ? { ...item, children } : { ...item };

        if (withChildren.kind === "collection" && collectionsLink === false) {
          return { ...withChildren, link: false };
        }

        if (withChildren.kind === "entry" && entriesLink === false) {
          return { ...withChildren, link: false };
        }

        return withChildren;
      });

    const currentCollectionKey = normalizeKey(currentCollection?.slug || currentCollection?.id || "");
    const currentEntryId = currentEntry?.id;

    // Add depth + current/active flags.
    const applyState = (items: NavigationItem[], depth = 0): NavigationItem[] =>
      items.map((item) => {
        const children = item.children ? applyState(item.children, depth + 1) : undefined;
        const withChildren = children && children.length ? { ...item, children } : { ...item };

        if (withChildren.kind === "collection") {
          const key = normalizeKey(
            withChildren.collection.slug || withChildren.collection.id || ""
          );
          const isCurrent = key && currentCollectionKey ? key === currentCollectionKey : false;
          const childActive = children?.some((child) => child.isActive || child.isCurrent) ?? false;
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

    const buildCollectionForest = (allCollections: Collection[]): NavigationItem[] => {
      const byPath = new Map<string, Collection>();
      for (const collection of allCollections) {
        byPath.set(normalizeCollectionPathKey(collection.path), collection);
      }

      const childrenByParent = new Map<string, Collection[]>();
      for (const collection of allCollections) {
        const key = normalizeCollectionPathKey(collection.path);
        const parentKey = parentCollectionPathKey(key);
        const effectiveParentKey = parentKey && byPath.has(parentKey) ? parentKey : "";
        const siblings = childrenByParent.get(effectiveParentKey) ?? [];
        siblings.push(collection);
        childrenByParent.set(effectiveParentKey, siblings);
      }

      const buildNode = (collection: Collection): NavigationItem => {
        const collectionKey = normalizeCollectionPathKey(collection.path);
        const entryChildren = (collection.entries ?? []).map((entry) =>
          buildEntryItem(collection, entry)
        );
        const nestedCollectionChildren = (childrenByParent.get(collectionKey) ?? []).map(
          buildNode
        );
        return buildCollectionItem(collection, [...entryChildren, ...nestedCollectionChildren]);
      };

      return (childrenByParent.get("") ?? []).map(buildNode);
    };

    let items: NavigationItem[] = buildCollectionForest(collections);

    if (rootEntries.length) {
      const rootEntryItems = rootEntries
        .filter((entry) => shouldIncludeEntryItem(entry))
        .map((entry) => buildRootEntryItem(entry));
      items = [...rootEntryItems, ...items];
    }

    items = applyVisibility(items);

    if (collectionsLink === false || entriesLink === false) {
      items = applyLinkFlags(items);
    }

    items = applyState(items);

    const currentCollectionItem = findCurrentCollectionItem(items);

    // Provide current context so layouts can render collection indexes without extra lookups.
    return options.fn({
      items,
      ...(currentCollectionItem ? { currentCollectionItem } : {}),
      collection: currentCollection,
      entry: currentEntry,
      current: { collection: currentCollection, entry: currentEntry },
    });
  });
}
