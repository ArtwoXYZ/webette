import { createHash } from "node:crypto";
import { stat, readdir, readFile } from "node:fs/promises";
import * as path from "node:path";
import type { Block, Collection, Entry, Site } from "../model";

export interface HistoryRecord {
  fingerprint?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PreviousState {
  site?: HistoryRecord;
  collections: Record<string, HistoryRecord>;
  entries: Record<string, HistoryRecord>;
  blocks: Record<string, HistoryRecord>;
}

const emptyState: PreviousState = {
  site: undefined,
  collections: {},
  entries: {},
  blocks: {},
};

function collectionKey(collection: { slug?: string; id?: string }): string {
  return collection.slug || collection.id || "";
}

function entryKey(collectionId: string, entry: { slug?: string; id?: string }): string {
  return `${collectionId}::${entry.slug || entry.id || ""}`;
}

function blockKey(entryFullKey: string, blockId?: string): string {
  return `${entryFullKey}::${blockId ?? ""}`;
}

function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>();

  // Deterministic stringifier (sorted keys, guards cycles) so hashes stay stable
  const walk = (val: unknown): string => {
    if (val === null || typeof val === "number" || typeof val === "boolean") {
      return JSON.stringify(val);
    }
    if (typeof val === "string") return JSON.stringify(val);
    if (val instanceof Date) return JSON.stringify(val.toISOString());
    if (Array.isArray(val)) {
      return `[${val.map((item) => walk(item)).join(";")}]`;
    }
    if (typeof val === "object") {
      if (seen.has(val as object)) return '"[circular]"';
      seen.add(val as object);
      const entries = Object.keys(val as Record<string, unknown>)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${walk((val as Record<string, unknown>)[key])}`);
      return `{${entries.join(";")}}`;
    }
    return JSON.stringify(String(val));
  };

  return walk(value);
}

function hashObject(value: unknown): string {
  const serialized = stableStringify(value);
  return createHash("sha1").update(serialized).digest("hex");
}

function nextTimestamps(prev: HistoryRecord | undefined, fingerprint: string, nowIso: string) {
  if (prev?.fingerprint === fingerprint) {
    return {
      createdAt: prev.createdAt ?? nowIso,
      updatedAt: prev.updatedAt ?? prev.createdAt ?? nowIso,
    };
  }

  return {
    createdAt: prev?.createdAt ?? nowIso,
    updatedAt: nowIso,
  };
}

async function collectBlockState(
  blocks: Block[] | undefined,
  collectionId: string,
  entryId: string,
  target: PreviousState
) {
  // Build a flat index of block history keyed by collection/entry/id
  if (!blocks) return;
  const entryFullKey = entryKey(collectionId, { id: entryId });

  const walk = (list: Block[]) => {
    for (const blk of list) {
      const key = blockKey(entryFullKey, blk.id);
      target.blocks[key] = {
        fingerprint: blk.fingerprint,
        createdAt: blk.createdAt,
        updatedAt: blk.updatedAt,
      };
      if (blk.subBlocks) {
        walk(blk.subBlocks);
      }
    }
  };

  walk(blocks);
}

export async function loadPreviousState(exportDir: string): Promise<PreviousState> {
  const state: PreviousState = {
    collections: {},
    entries: {},
    blocks: {},
  };

  try {
    const sitePath = path.join(exportDir, "site.json");
    const siteRaw = await readFile(sitePath, "utf8");
    const siteData = JSON.parse(siteRaw) as Partial<Site>;
    state.site = {
      fingerprint: (siteData as any).fingerprint,
      createdAt: (siteData as any).createdAt,
      updatedAt: (siteData as any).updatedAt,
    };
    for (const col of siteData.collections ?? []) {
      const key = collectionKey(col);
      if (!key) continue;
      state.collections[key] = {
        fingerprint: (col as any).fingerprint,
        createdAt: (col as any).createdAt,
        updatedAt: (col as any).updatedAt,
      };
    }
  } catch {
    // no prior site.json
  }

  const entriesRoot = path.join(exportDir, "entries");
  let collections: (string | undefined)[] = [];
  try {
    const dirs = await readdir(entriesRoot, { withFileTypes: true });
    collections = dirs.filter((d) => d.isDirectory()).map((d) => d.name);
  } catch {
    return state;
  }

  for (const colDirName of collections) {
    if (!colDirName) continue;
    const colKey = colDirName;
    const colDir = path.join(entriesRoot, colDirName);
    let entryFiles: string[] = [];
    try {
      const files = await readdir(colDir, { withFileTypes: true });
      entryFiles = files.filter((f) => f.isFile() && f.name.endsWith(".json")).map((f) => f.name);
    } catch {
      continue;
    }

    for (const file of entryFiles) {
      try {
        const raw = await readFile(path.join(colDir, file), "utf8");
        const entry = JSON.parse(raw) as Entry;
        const entrySlug = path.parse(file).name;
        const entryFullKey = entryKey(colKey, { slug: entrySlug });

        state.entries[entryFullKey] = {
          fingerprint: (entry as any).fingerprint,
          createdAt: (entry as any).createdAt,
          updatedAt: (entry as any).updatedAt,
        };

        await collectBlockState(entry.blocks, colKey, entrySlug, state);
      } catch {
        continue;
      }
    }
  }

  return state;
}

async function fallbackBlockMeta(rootDir: string, block: Block) {
  // Used when readContent=false to avoid marking everything as changed
  const result: Record<string, unknown> = {};
  const fullPath = path.join(rootDir, block.path);
  try {
    const fileStat = await stat(fullPath);
    result.size = fileStat.size;
    result.mtimeMs = fileStat.mtimeMs;
  } catch {
    // ignore
  }
  return result;
}

async function computeBlockHistory(
  block: Block,
  ctx: {
    collectionKey: string;
    entryKey: string;
    previous: PreviousState;
    nowIso: string;
    rootDir: string;
    readContent: boolean;
  }
): Promise<Block> {
  const subBlocks = block.subBlocks
    ? await Promise.all(block.subBlocks.map((sub) => computeBlockHistory(sub, ctx)))
    : undefined;

  const contentForHash = block.content
    ? {
        raw: block.content.raw,
        html: block.content.html,
        ast: block.content.ast,
        meta: block.content.meta,
        variants: block.content.variants,
      }
    : ctx.readContent === false
    ? await fallbackBlockMeta(ctx.rootDir, block)
    : undefined;

  const fingerprint = hashObject({
    type: block.type,
    slug: block.slug,
    route: block.route,
    path: block.path,
    ext: block.ext,
    content: contentForHash,
    subBlocks: subBlocks?.map((b) => b.fingerprint),
  });

  const previousKey = blockKey(entryKey(ctx.collectionKey, { slug: ctx.entryKey }), block.id);
  const prev = ctx.previous.blocks[previousKey];
  const { createdAt, updatedAt } = nextTimestamps(prev, fingerprint, ctx.nowIso);

  return {
    ...block,
    ...(subBlocks ? { subBlocks } : {}),
    fingerprint,
    createdAt,
    updatedAt,
  };
}

async function computeEntryHistory(
  collectionKeyValue: string,
  entry: Entry,
  ctx: { previous: PreviousState; nowIso: string; rootDir: string; readContent: boolean }
): Promise<Entry> {
  const blocks = await Promise.all(
    entry.blocks.map((blk) =>
      computeBlockHistory(blk, {
        collectionKey: collectionKeyValue,
        entryKey: entry.slug || entry.id,
        previous: ctx.previous,
        nowIso: ctx.nowIso,
        rootDir: ctx.rootDir,
        readContent: ctx.readContent,
      })
    )
  );

  const fingerprint = hashObject({
    slug: entry.slug,
    route: entry.route,
    path: entry.path,
    isDraft: entry.isDraft,
    isUnlisted: entry.isUnlisted,
    blocks: blocks.map((b) => b.fingerprint),
  });

  const entryFullKey = entryKey(collectionKeyValue, entry);
  const prev = ctx.previous.entries[entryFullKey];
  const { createdAt, updatedAt } = nextTimestamps(prev, fingerprint, ctx.nowIso);

  return {
    ...entry,
    blocks,
    fingerprint,
    createdAt,
    updatedAt,
  };
}

async function computeCollectionHistory(
  collection: Collection,
  ctx: { previous: PreviousState; nowIso: string; rootDir: string; readContent: boolean }
): Promise<Collection> {
  const collectionKeyValue = collectionKey(collection);

  const entries = await Promise.all(
    collection.entries.map((entry) =>
      computeEntryHistory(collectionKeyValue, entry, ctx)
    )
  );

  const fingerprint = hashObject({
    slug: collection.slug,
    route: collection.route,
    path: collection.path,
    isUnlisted: collection.isUnlisted,
    entries: entries.map((ent) => ent.fingerprint),
  });

  const prev = ctx.previous.collections[collectionKeyValue];
  const { createdAt, updatedAt } = nextTimestamps(prev, fingerprint, ctx.nowIso);

  return {
    ...collection,
    entries,
    fingerprint,
    createdAt,
    updatedAt,
  };
}

export async function applyHistory(
  site: Site,
  options: { previous: PreviousState; rootDir: string; readContent: boolean; now?: Date }
): Promise<Site> {
  const nowIso = (options.now ?? new Date()).toISOString();
  const collections = site.collections
    ? await Promise.all(
        site.collections.map((collection) =>
          computeCollectionHistory(collection, {
            previous: options.previous,
            nowIso,
            rootDir: options.rootDir,
            readContent: options.readContent,
          })
        )
      )
    : undefined;

  const siteFingerprint = hashObject({
    site: site.site,
    route: site.route,
    collections: collections?.map((col) => col.fingerprint),
  });
  const siteTimestamps = nextTimestamps(options.previous.site, siteFingerprint, nowIso);

  return {
    ...site,
    ...(collections ? { collections } : {}),
    fingerprint: siteFingerprint,
    createdAt: siteTimestamps.createdAt,
    updatedAt: siteTimestamps.updatedAt,
  };
}

export const initialState: PreviousState = emptyState;
