/**
 * Navigation node construction — builds NavigationItem nodes from site model data.
 */

import type { Block, Collection, Entry } from "../../../model";
import { normalizeCollectionPathKey, resolveParentPathKey } from "../../../../utils/path";

export type NavigationItem =
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

// ── Node builders ──────────────────────────────────────────────────────────────

export function buildEntryNode(
  collection: Collection,
  entry: Entry,
  overrides?: { title?: string; anchor?: string }
): NavigationItem {
  const anchorSuffix = overrides?.anchor ? `#${overrides.anchor}` : "";
  const route = anchorSuffix ? `${entry.route ?? ""}${anchorSuffix}` : entry.route;
  return {
    kind: "entry",
    ...(overrides?.title ? { title: overrides.title } : {}),
    route,
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
      route,
      isDraft: entry.isDraft,
      isUnlisted: entry.isUnlisted,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    },
  };
}

export function buildRootEntryNode(entry: Entry): NavigationItem {
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

// ── Collection forest ─────────────────────────────────────────────────────────

export function buildCollectionForestNodes(
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
    const parentKey = resolveParentPathKey(key);
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

export function buildCollectionSubtreeNode(
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
