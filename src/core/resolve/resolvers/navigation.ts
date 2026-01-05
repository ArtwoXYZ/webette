import { readFile } from "node:fs/promises";
import * as path from "node:path";
import type { Resolver } from "../registry";
import type { Block } from "../../model";
import { slugify } from "../../../utils/naming";
import {
  matchCollection,
  matchEntry,
} from "../../postprocess/internal-targets";

type ParsedLine = {
  collection?: string;
  entry?: string;
};

type NavigationItem =
  | {
      kind: "collection";
      collection: {
        id: string;
        name: string;
        slug: string;
        route?: string;
        entriesCount: number;
        description?: string;
        isUnlisted?: boolean;
        assets?: Block[];
        createdAt?: string;
        updatedAt?: string;
      };
    }
  | {
      kind: "entry";
      collection: {
        id: string;
        name: string;
        slug: string;
        route?: string;
        description?: string;
        isUnlisted?: boolean;
        assets?: Block[];
      };
      entry: {
        id: string;
        name: string;
        slug: string;
        route?: string;
        isDraft?: boolean;
        isUnlisted?: boolean;
        createdAt?: string;
        updatedAt?: string;
      };
    };

function parseLine(rawLine: string): ParsedLine | null {
  let line = rawLine.trim();
  if (!line) return null;
  if (line.startsWith("-")) {
    line = line.slice(1).trim();
  }
  if (!line) return null;

  const splitSegments = (raw: string): string[] => {
    const keys = ["collection", "entry"];
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

  const parts = splitSegments(line);
  const result: ParsedLine = {};

  for (const part of parts) {
    const [rawKey, ...rest] = part.split(":");
    if (!rawKey || rest.length === 0) continue;
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (!value) continue;

    if (key === "collection") {
      result.collection = value;
    } else if (key === "entry") {
      result.entry = value;
    }
  }

  if (!result.collection && !result.entry) return null;
  return result;
}

export const resolveNavigation: Resolver = async (block, ctx) => {
  if (ctx.readContent === false) return undefined;

  const filePath = path.join(ctx.rootDir, block.path);
  const raw = await readFile(filePath, "utf8");
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  const items: NavigationItem[] = [];
  const parsedLines: ParsedLine[] = [];
  const parsedRawLines: string[] = [];

  for (const line of lines) {
    const parsed = parseLine(line);
    if (!parsed) {
      ctx.logger?.warn("navigation.lineInvalid", { path: block.path, line });
      continue;
    }
    parsedLines.push(parsed);
    parsedRawLines.push(line);
  }

  if (parsedLines.length === 0) {
    for (const collection of ctx.site.collections ?? []) {
      if (collection.isUnlisted) continue;
      items.push({
        kind: "collection",
        collection: {
          id: collection.id,
          name: collection.name,
          slug: collection.slug,
          route: collection.route,
          entriesCount: collection.entries.length,
          description: collection.description,
          assets: collection.assets,
          isUnlisted: collection.isUnlisted,
          createdAt: collection.createdAt,
          updatedAt: collection.updatedAt,
        },
      });

      for (const entry of collection.entries) {
        if (entry.isUnlisted) continue;
        items.push({
          kind: "entry",
          collection: {
            id: collection.id,
            name: collection.name,
            slug: collection.slug,
            route: collection.route,
            description: collection.description,
            assets: collection.assets,
            isUnlisted: collection.isUnlisted,
          },
          entry: {
            id: entry.id,
            name: entry.name,
            slug: entry.slug,
            route: entry.route,
            isDraft: entry.isDraft,
            isUnlisted: entry.isUnlisted,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt,
          },
        });
      }
    }
  } else {
    for (let i = 0; i < parsedLines.length; i += 1) {
      const parsed = parsedLines[i];
      if (!parsed) continue;
      const rawLine = parsedRawLines[i] ?? "";

      if (!parsed.collection) {
        ctx.logger?.warn("navigation.entryMissingCollection", {
          path: block.path,
          line: rawLine,
        });
        continue;
      }

      const collection = matchCollection(ctx.site, parsed.collection);
      if (!collection) {
        ctx.logger?.warn("navigation.collectionMissing", {
          path: block.path,
          collection: parsed.collection,
        });
        continue;
      }

      if (!parsed.entry) {
        items.push({
          kind: "collection",
          collection: {
            id: collection.id,
            name: collection.name,
            slug: collection.slug,
            route: collection.route,
            entriesCount: collection.entries.length,
            description: collection.description,
            assets: collection.assets,
            isUnlisted: collection.isUnlisted,
            createdAt: collection.createdAt,
            updatedAt: collection.updatedAt,
          },
        });
        continue;
      }

      const [entryValue, entryAnchor] = parsed.entry.split("#");
      const entryName = (entryValue ?? "").trim();
      const anchorRaw = entryAnchor?.trim() || undefined;
      const anchor = anchorRaw ? slugify(anchorRaw) : undefined;
      const entry = matchEntry(collection, entryName);
      if (!entry) {
        ctx.logger?.warn("navigation.entryMissing", {
          path: block.path,
          collection: parsed.collection,
          entry: entryName || parsed.entry,
        });
        continue;
      }

      items.push({
        kind: "entry",
        collection: {
          id: collection.id,
          name: collection.name,
          slug: collection.slug,
          route: collection.route,
          description: collection.description,
          assets: collection.assets,
          isUnlisted: collection.isUnlisted,
        },
        entry: {
          id: entry.id,
          name: entry.name,
          slug: entry.slug,
          route: anchor ? `${entry.route ?? ""}#${anchor}` : entry.route,
          isDraft: entry.isDraft,
          isUnlisted: entry.isUnlisted,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        },
      });
    }
  }

  return { raw, data: { items } };
};
