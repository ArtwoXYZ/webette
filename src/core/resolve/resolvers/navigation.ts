/**
 * Resolver for `navigation.webt` blocks (Navigation Plan).
 */

import { readFile } from "node:fs/promises";
import * as path from "node:path";
import type { Resolver } from "../registry";
import type { Block, Collection, Entry, Site } from "../../model";
import { slugify } from "../../../utils/naming";
import { matchCollection, matchEntry } from "../../targets";

function parseNavigationNameLine(rawLine: string): string | null {
  const trimmed = rawLine.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("#")) return null;

  const normalized = trimmed.startsWith("-") ? trimmed.slice(1).trim() : trimmed;
  const match = /^name\s*:\s*(.*)$/i.exec(normalized);
  if (!match) return null;

  const value = (match[1] ?? "").trim();
  return value ? value : null;
}

function parseHeaderOptionLine(rawLine: string): { key: string; value: string } | null {
  const trimmed = rawLine.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const normalized = trimmed.startsWith("-") ? trimmed.slice(1).trim() : trimmed;
  const match = /^([A-Za-z][A-Za-z0-9 _-]*)\s*:\s*(.*)$/.exec(normalized);
  if (!match) return null;

  const key = (match[1] ?? "").trim().toLowerCase();
  const value = (match[2] ?? "").trim();
  if (!key || !value) return null;

  return { key, value };
}

function countIndentSpaces(rawLine: string): {
  indentSpaces: number;
  hadTabs: boolean;
  content: string;
} {
  let indentSpaces = 0;
  let hadTabs = false;
  let i = 0;
  while (i < rawLine.length) {
    const ch = rawLine[i];
    if (ch === " ") {
      indentSpaces += 1;
      i += 1;
      continue;
    }
    if (ch === "\t") {
      // Tolerate tabs as 2 spaces, but log it to encourage consistent files.
      hadTabs = true;
      indentSpaces += 2;
      i += 1;
      continue;
    }
    break;
  }
  return { indentSpaces, hadTabs, content: rawLine.slice(i) };
}

function normalizeItemLine(rawLine: string): string {
  const trimmed = rawLine.trim();
  if (!trimmed) return "";
  const withoutDash = trimmed.startsWith("-") ? trimmed.slice(1).trim() : trimmed;
  return withoutDash;
}

type ParsedItemLine = {
  rawLine: string;
  level: number;
  title?: string;
  collection?: string;
  entry?: string;
};

function parseItemLine(rawLine: string): Omit<ParsedItemLine, "level"> | null {
  const normalized = normalizeItemLine(rawLine);
  if (!normalized) return null;
  if (normalized.startsWith("#")) return null;

  const splitSegments = (raw: string): string[] => {
    const keys = ["title", "collection", "coll", "entry"];
    const result: string[] = [];
    let start = 0;
    for (let i = 0; i < raw.length; i += 1) {
      if (raw[i] !== ",") continue;
      let j = i + 1;
      while (j < raw.length && /\s/.test(raw[j] ?? "")) j += 1;
      let matched = false;
      for (const key of keys) {
        const slice = raw.slice(j, j + key.length);
        const after = raw[j + key.length];
        if (slice.toLowerCase() === key && after === ":") {
          const segment = raw.slice(start, i).trim();
          if (segment) result.push(segment);
          start = j;
          matched = true;
          break;
        }
      }
      if (matched) {
        i = j - 1;
      }
    }
    const tail = raw.slice(start).trim();
    if (tail) result.push(tail);
    return result;
  };

  const parts = splitSegments(normalized);
  const parsed: Omit<ParsedItemLine, "level"> = { rawLine };

  for (const part of parts) {
    const [rawKey, ...rest] = part.split(":");
    if (!rawKey || rest.length === 0) continue;
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (!value) continue; // empty values are ignored (`title:` empty => noop)

    if (key === "collection" || key === "coll") {
      parsed.collection = value;
    } else if (key === "entry") {
      parsed.entry = value;
    } else if (key === "title") {
      parsed.title = value;
    }
  }

  if (!parsed.collection && !parsed.entry && !parsed.title) return null;
  return parsed;
}

type NavigationItem =
  | {
    kind: "title";
    title: string;
    children?: NavigationItem[];
  }
  | {
    kind: "collection";
    link?: boolean;
    title?: string;
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

type NavigationOptions = {
  mode?: "collection";
  collection?: string;
  hideCollections?: boolean;
  hideEntries?: boolean;
  collectionsLink?: boolean;
  entriesLink?: boolean;
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

function buildEntryNode(collection: Collection, entry: Entry): NavigationItem {
  return {
    kind: "entry",
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

function buildCollectionNode(
  collection: Collection,
  children: NavigationItem[]
): NavigationItem {
  return {
    kind: "collection",
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
    ...(children.length ? { children } : {}),
  };
}

export const resolveNavigation: Resolver = async (block, ctx) => {
  if (ctx.readContent === false) return undefined;

  const filePath = path.join(ctx.rootDir, block.path);
  const raw = await readFile(filePath, "utf8");
  const rawLines = raw.split(/\r?\n/);

  let navigationName: string | undefined;
  const parsedItems: ParsedItemLine[] = [];
  const options: NavigationOptions = {};
  let itemsStarted = false;

  for (const rawLine of rawLines) {
    if (!rawLine.trim()) continue;
    if (rawLine.trimStart().startsWith("#")) continue;

    if (!navigationName) {
      const parsedName = parseNavigationNameLine(rawLine);
      if (parsedName) {
        navigationName = parsedName; // first wins
        continue;
      }
    }

    const headerOption = parseHeaderOptionLine(rawLine);
    if (!itemsStarted && headerOption) {
      const key = headerOption.key;
      const value = headerOption.value;
      const normalizedValue = value.toLowerCase();

      const parseBoolean = (raw: string): boolean | undefined => {
        const trimmed = raw.trim().toLowerCase();
        if (["true", "yes", "1", "on"].includes(trimmed)) return true;
        if (["false", "no", "0", "off"].includes(trimmed)) return false;
        return undefined;
      };

      if (key === "name") {
        continue;
      }

      if (key === "mode") {
        if (normalizedValue === "collection") {
          options.mode = "collection";
        }
        continue;
      }

      if (key === "collection") {
        options.collection = value;
        continue;
      }

      const boolValue = parseBoolean(value);
      if (boolValue === undefined) {
        continue;
      }

      if (key === "hide collections" || key === "hide collection") {
        options.hideCollections = boolValue;
        continue;
      }

      if (key === "hide entries" || key === "hide entry") {
        options.hideEntries = boolValue;
        continue;
      }

      if (key === "collections link" || key === "collection link") {
        options.collectionsLink = boolValue;
        continue;
      }

      if (key === "entries link" || key === "entry link") {
        options.entriesLink = boolValue;
        continue;
      }
    }

    const { indentSpaces, hadTabs } = countIndentSpaces(rawLine);
    if (hadTabs) {
      ctx.logger?.warn("navigation.indentTabs", { path: block.path, line: rawLine });
    }

    let normalizedIndent = indentSpaces;
    if (normalizedIndent % 2 !== 0) {
      ctx.logger?.warn("navigation.indentOdd", { path: block.path, line: rawLine });
      normalizedIndent -= 1;
    }
    const level = Math.max(0, Math.floor(normalizedIndent / 2));

    const parsed = parseItemLine(rawLine);
    if (!parsed) continue;
    parsedItems.push({ ...parsed, level });
    itemsStarted = true;
  }

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

    if (targetCollection && !targetCollection.isUnlisted) {
      const children = targetCollection.entries
        .filter((entry) => !entry.isUnlisted)
        .map((entry) => buildEntryNode(targetCollection, entry));
      finalItems = [buildCollectionNode(targetCollection, children)];
    } else if (!targetCollection && rawCollection) {
      ctx.logger?.warn("navigation.collectionMissing", {
        path: block.path,
        collection: rawCollection,
      });
    }
  } else {
    finalItems = (ctx.site.collections ?? [])
      .filter((collection) => !collection.isUnlisted)
      .map((collection) => {
        const children: NavigationItem[] = collection.entries
          .filter((entry) => !entry.isUnlisted)
          .map((entry) => buildEntryNode(collection, entry));

        return buildCollectionNode(collection, children);
      });
  }

  const applyVisibility = (items: NavigationItem[]): NavigationItem[] => {
    const processItem = (item: NavigationItem): NavigationItem[] => {
      const children = item.children ? applyVisibility(item.children) : undefined;
      const withChildren = children && children.length ? { ...item, children } : { ...item };

      if (options.hideEntries && withChildren.kind === "entry") {
        return [];
      }

      if (options.hideCollections && withChildren.kind === "collection") {
        return children ?? [];
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

  if (options.hideEntries || options.hideCollections) {
    finalItems = applyVisibility(finalItems);
  }

  if (options.collectionsLink === false || options.entriesLink === false) {
    finalItems = applyLinkFlags(finalItems);
  }

  return {
    raw,
    data: {
      ...(navigationName ? { name: navigationName } : {}),
      items: finalItems,
    },
  };
};
