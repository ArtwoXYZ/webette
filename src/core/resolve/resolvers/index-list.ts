import { readFile } from "node:fs/promises";
import * as path from "node:path";
import type { Resolver } from "../registry";
import type { Block } from "../../model";
import {
  matchCollection,
  matchEntry,
} from "../../postprocess/internal-targets";

type IndexListItem =
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

type ParsedLine = {
  collection?: string;
  entry?: string;
};

function parseLine(rawLine: string): ParsedLine | null {
  let line = rawLine.trim();
  if (!line) return null;
  if (line.startsWith("-")) {
    line = line.slice(1).trim();
  }
  if (!line) return null;

  const parts = line.split(",").map((part) => part.trim()).filter(Boolean);
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

export const resolveIndexList: Resolver = async (block, ctx) => {
  if (ctx.readContent === false) return undefined;

  const filePath = path.join(ctx.rootDir, block.path);
  const raw = await readFile(filePath, "utf8");
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  const items: IndexListItem[] = [];
  const parsedLines: ParsedLine[] = [];
  const parsedRawLines: string[] = [];

  for (const line of lines) {
    const parsed = parseLine(line);
    if (!parsed) {
      ctx.logger?.warn("indexList.lineInvalid", { path: block.path, line });
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
        ctx.logger?.warn("indexList.entryMissingCollection", {
          path: block.path,
          line: rawLine,
        });
        continue;
      }

    const collection = matchCollection(ctx.site, parsed.collection);
    if (!collection) {
      ctx.logger?.warn("indexList.collectionMissing", {
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

      const entry = matchEntry(collection, parsed.entry);
      if (!entry) {
        ctx.logger?.warn("indexList.entryMissing", {
          path: block.path,
          collection: parsed.collection,
          entry: parsed.entry,
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
          route: entry.route,
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
