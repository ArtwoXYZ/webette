import { readdir } from "node:fs/promises";
import * as path from "node:path";
import { getEnv } from "../../config/env";
import { detectBlockType } from "./detect-block-type";
import { toPosix } from "../../utils/path";
import { cleanName, limitSlugWords, orderKey, slugify } from "../../utils/naming";
import { resolveRoutes } from "../routes";
import type { Block, Collection, Entry, Site } from "../model";

// Three-pass pipeline:
// 1) Raw scan: read filesystem shape with minimal data (rawName/path/type/ext).
// 2) Apply site config: override names/slugs when provided in webette.config.ts.
// 3) Enrich: compute names/slugs/ids where missing, then resolve routes.

type RawBlock = {
  rawName: string;
  path: string; // POSIX
  type: string;
  ext?: string;
  subBlocks?: RawBlock[];
};

type RawEntry = {
  rawName: string;
  path: string; // POSIX
  blocks: RawBlock[];
};

type RawCollection = {
  rawName: string;
  path: string; // POSIX
  entries: RawEntry[];
};

type CollectionConfig = {
  path?: string;
  name?: string;
  slug?: string;
  route?: string;
};

function normalizePath(value: string): string {
  return toPosix(value.replace(/\\/g, "/"));
}

// --- Pass 1: raw scan ---

async function listBlocksRaw(
  rootDir: string,
  entryRelPath: string,
  options: { treatTxtAsMarkdown: boolean }
): Promise<RawBlock[]> {
  const absoluteEntry = path.join(rootDir, entryRelPath);
  const dirEntries = await readdir(absoluteEntry, { withFileTypes: true });
  const blocks: RawBlock[] = [];

  for (const fsEntry of dirEntries) {
    const rawName = fsEntry.name;
    if (!rawName || rawName.startsWith(".") || rawName.startsWith("_")) continue;

    const relPath = toPosix(path.join(entryRelPath, rawName));
    const isDirectory = fsEntry.isDirectory();
    const ext = isDirectory ? undefined : path.extname(rawName) || undefined;
    const type = detectBlockType(ext, isDirectory, options);

    const subBlocks = isDirectory
      ? await listBlocksRaw(rootDir, relPath, options)
      : undefined;

    blocks.push({
      rawName,
      type,
      ext,
      path: relPath,
      ...(subBlocks && subBlocks.length > 0 ? { subBlocks } : {}),
    });
  }

  blocks.sort((a, b) => {
    const orderA = orderKey(a.rawName);
    const orderB = orderKey(b.rawName);
    if (orderA !== orderB) return orderA - orderB;
    return a.rawName.localeCompare(b.rawName, undefined, { sensitivity: "base" });
  });

  return blocks;
}

async function listEntriesRaw(
  rootDir: string,
  collectionPath: string,
  options: { treatTxtAsMarkdown: boolean }
): Promise<RawEntry[]> {
  const absolute = path.join(rootDir, collectionPath);
  const dirEntries = await readdir(absolute, { withFileTypes: true });
  const entries: RawEntry[] = [];

  for (const entry of dirEntries) {
    if (!entry.isDirectory()) continue;

    const rawName = entry.name;
    if (!rawName || rawName.startsWith(".") || rawName.startsWith("_")) continue;

    const relPath = toPosix(path.join(collectionPath, rawName));
    const blocks = await listBlocksRaw(rootDir, relPath, options);

    entries.push({
      rawName,
      path: relPath,
      blocks,
    });
  }

  entries.sort((a, b) => {
    const orderA = orderKey(a.rawName);
    const orderB = orderKey(b.rawName);
    if (orderA !== orderB) return orderA - orderB;
    return a.rawName.localeCompare(b.rawName, undefined, { sensitivity: "base" });
  });

  return entries;
}

async function listCollectionsRaw(
  rootDir: string,
  toolTemplatesRoot: string,
  outputDirName: string,
  loggingDirName: string
): Promise<RawCollection[]> {
  const dirEntries = await readdir(rootDir, { withFileTypes: true });
  const collections: RawCollection[] = [];

  const templateDirName = path.basename(toolTemplatesRoot);

  for (const entry of dirEntries) {
    if (!entry.isDirectory()) continue;

    const rawName = entry.name;
    if (!rawName || rawName.startsWith(".") || rawName.startsWith("_")) continue;
    if (rawName === outputDirName || rawName === loggingDirName) continue;
    if (rawName === templateDirName) continue;

    const relPath = toPosix(rawName);
    collections.push({
      rawName,
      path: relPath,
      entries: [],
    });
  }

  return collections;
}

// --- Pass 2: apply config, Pass 3: enrich ---

function buildConfigIndex(site: Site): Map<string, CollectionConfig> {
  const map = new Map<string, CollectionConfig>();
  const raw = site.config?.collections;
  if (!raw || typeof raw !== "object") return map;

  for (const [key, value] of Object.entries(raw)) {
    if (!value || typeof value !== "object") continue;
    const cfg = value as CollectionConfig;
    const normalizedKey = normalizePath(key);
    const normalizedPath =
      typeof cfg.path === "string" && cfg.path ? normalizePath(cfg.path) : undefined;
    map.set(normalizedPath ?? normalizedKey, cfg);
  }

  return map;
}

function enrichBlocks(rawBlocks: RawBlock[]): Block[] {
  const blockSlugCounts = new Map<string, number>();

  const walk = (blocks: RawBlock[]): Block[] =>
    blocks.map((blk) => {
      const baseName = blk.ext ? path.parse(blk.rawName).name : blk.rawName;
      const name = cleanName(baseName);
      const baseSlug = slugify(name);
      const count = blockSlugCounts.get(baseSlug) ?? 0;
      const slug = count === 0 ? baseSlug : `${baseSlug}-${count + 1}`;
      blockSlugCounts.set(baseSlug, count + 1);

      const idBase = `blk__${limitSlugWords(slug).replace(/-/g, "_")}`;
      const idCount = blockSlugCounts.get(idBase) ?? 0;
      const id = idCount === 0 ? idBase : `${idBase}_${idCount + 1}`;
      blockSlugCounts.set(idBase, idCount + 1);

      const subBlocks = blk.subBlocks ? walk(blk.subBlocks) : undefined;

      return {
        id,
        rawName: blk.rawName,
        name,
        slug,
        type: blk.type,
        ext: blk.ext,
        path: blk.path,
        ...(subBlocks ? { subBlocks } : {}),
      };
    });

  return walk(rawBlocks);
}

function enrichEntries(rawEntries: RawEntry[]): Entry[] {
  const entrySlugCounts = new Map<string, number>();

  return rawEntries.map((raw) => {
    const name = cleanName(raw.rawName);
    const baseSlug = slugify(name);
    const count = entrySlugCounts.get(baseSlug) ?? 0;
    const slug = count === 0 ? baseSlug : `${baseSlug}-${count + 1}`;
    entrySlugCounts.set(baseSlug, count + 1);

    const idBase = `ent__${limitSlugWords(slug).replace(/-/g, "_")}`;
    const idCount = entrySlugCounts.get(idBase) ?? 0;
    const id = idCount === 0 ? idBase : `${idBase}_${idCount + 1}`;
    entrySlugCounts.set(idBase, idCount + 1);

    const blocks = enrichBlocks(raw.blocks);

    return {
      id,
      rawName: raw.rawName,
      name,
      slug,
      path: raw.path,
      blocks,
    };
  });
}

function enrichCollections(
  rawCollections: RawCollection[],
  configIndex: Map<string, CollectionConfig>
): Collection[] {
  const collectionSlugCounts = new Map<string, number>();
  const collectionIdCounts = new Map<string, number>();

  return rawCollections.map((raw) => {
    const matchConfig =
      configIndex.get(raw.path) ?? configIndex.get(normalizePath(raw.rawName));

    const configuredName =
      matchConfig?.name && typeof matchConfig.name === "string"
        ? cleanName(matchConfig.name)
        : undefined;
    const name = configuredName ?? cleanName(raw.rawName);

    const configuredSlug =
      matchConfig?.slug && typeof matchConfig.slug === "string"
        ? slugify(matchConfig.slug)
        : undefined;
    const baseSlug = configuredSlug ?? slugify(name);
    const slugCount = collectionSlugCounts.get(baseSlug) ?? 0;
    const slug = slugCount === 0 ? baseSlug : `${baseSlug}-${slugCount + 1}`;
    collectionSlugCounts.set(baseSlug, slugCount + 1);

    const idBase = `col__${limitSlugWords(slug).replace(/-/g, "_")}`;
    const idCount = collectionIdCounts.get(idBase) ?? 0;
    const id = idCount === 0 ? idBase : `${idBase}_${idCount + 1}`;
    collectionIdCounts.set(idBase, idCount + 1);

    const entries = enrichEntries(raw.entries);

    return {
      id,
      rawName: raw.rawName,
      name,
      slug,
      path: raw.path,
      entries,
    };
  });
}

export async function scanSite(site: Site): Promise<Site> {
  const toolEnv = await getEnv();
  const siteMarkdownConfig =
    site?.site && typeof site.site === "object"
      ? (site.site as Record<string, unknown>).markdown
      : undefined;
  const siteTreatTxtAsMarkdown =
    siteMarkdownConfig && typeof siteMarkdownConfig === "object"
      ? (siteMarkdownConfig as Record<string, unknown>).treatTxtAsMarkdown
      : undefined;
  // Site can opt out of the default ".txt as markdown" behavior; tool env is the fallback.
  const treatTxtAsMarkdown =
    typeof siteTreatTxtAsMarkdown === "boolean"
      ? siteTreatTxtAsMarkdown
      : toolEnv.markdown.treatTxtAsMarkdown;

  // Pass 1: raw structure
  const rawCollections = await listCollectionsRaw(
    site.rootDir,
    toolEnv.templates.root,
    toolEnv.build.outputDirName,
    toolEnv.logging.dirName
  );

  const collectionsWithEntries = await Promise.all(
    rawCollections.map(async (collection) => {
      const entries = await listEntriesRaw(site.rootDir, collection.path, {
        treatTxtAsMarkdown,
      });
      return { ...collection, entries };
    })
  );

  // Pass 2+3: apply config then enrich
  const configIndex = buildConfigIndex(site);
  const collections = enrichCollections(collectionsWithEntries, configIndex);

  const scannedSite: Site = {
    ...site,
    collections,
  };

  return resolveRoutes(scannedSite);
}
