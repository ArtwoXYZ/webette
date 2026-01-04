import { readdir, readFile, stat } from "node:fs/promises";
import * as path from "node:path";
import { getEnv } from "../../config/env";
import { detectBlockType } from "./detect-block-type";
import { toPosix } from "../../utils/path";
import { cleanName, limitSlugWords, orderKey, slugify } from "../../utils/naming";
import { resolveRoutes } from "../routes";
import type { Block, Collection, Entry, Site } from "../model";
import type { Logger } from "../../logging/logger";
import { resolveTemplatesConfig } from "../templates/config";

// Three-pass pipeline:
// 1) Raw scan: read filesystem shape with minimal data (rawName/path/type/ext).
// 2) Apply site config: override names/slugs when provided in webette.config.ts.
// 3) Enrich: compute names/slugs/ids where missing, then resolve routes.

type RawBlock = {
  rawName: string;
  path: string; // POSIX
  type: string;
  ext?: string;
  skipRender?: boolean;
  subBlocks?: RawBlock[];
};

type RawEntry = {
  rawName: string;
  path: string; // POSIX
  blocks: RawBlock[];
  isDraft?: boolean;
  isUnlisted?: boolean;
};

type RawCollection = {
  rawName: string;
  path: string; // POSIX
  entries: RawEntry[];
  isUnlisted?: boolean;
  description?: string;
  assets?: RawBlock[];
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
  options: { treatTxtAsMarkdown: boolean },
  logger?: Logger
): Promise<RawBlock[]> {
  const absoluteEntry = path.join(rootDir, entryRelPath);
  const ignoreSet = await readIgnoreFile(absoluteEntry);
  const dirEntries = await readdir(absoluteEntry, { withFileTypes: true });
  const blocks: RawBlock[] = [];

  for (const fsEntry of dirEntries) {
    const rawName = fsEntry.name;
    if (!rawName || rawName.startsWith(".") || rawName.startsWith("_")) continue;

    const relPath = toPosix(path.join(entryRelPath, rawName));
    const isDirectory = fsEntry.isDirectory();
    const ext = isDirectory ? undefined : path.extname(rawName) || undefined;
    const isIndexList =
      !isDirectory &&
      cleanName(rawName).toLowerCase() === "index-list.webt";
    if (!isDirectory && ext?.toLowerCase() === ".webt" && !isIndexList) continue; // skip webette meta files
    const type = isIndexList ? "index-list" : detectBlockType(ext, isDirectory, options);

    // Files listed in ignore.webt: keep them in the model but mark for skip-render.
    const shouldSkipRender = ignoreSet.has(rawName);
    if (shouldSkipRender) {
      logger?.info("scan.blockIgnored", { block: rawName, entry: entryRelPath });
    }

    const subBlocks = isDirectory
      ? await listBlocksRaw(rootDir, relPath, options, logger)
      : undefined;

    blocks.push({
      rawName,
      type,
      ext,
      path: relPath,
      ...(isIndexList ? { skipRender: true } : {}),
      ...(shouldSkipRender ? { skipRender: true } : {}),
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
  options: { treatTxtAsMarkdown: boolean },
  logger?: Logger
): Promise<RawEntry[]> {
  const absolute = path.join(rootDir, collectionPath);
  const dirEntries = await readdir(absolute, { withFileTypes: true });
  const entries: RawEntry[] = [];

  for (const entry of dirEntries) {
    if (!entry.isDirectory()) continue;

    const rawName = entry.name;
    if (!rawName || rawName.startsWith(".") || rawName.startsWith("_")) continue;

    const relPath = toPosix(path.join(collectionPath, rawName));
    const blocks = await listBlocksRaw(rootDir, relPath, options, logger);
    const absoluteEntry = path.join(rootDir, relPath);
    const isDraft = await isDraftEntry(absoluteEntry);
    const isUnlisted = await isUnlistedEntry(absoluteEntry);

    entries.push({
      rawName,
      path: relPath,
      blocks,
      ...(isDraft ? { isDraft: true } : {}),
      ...(isUnlisted ? { isUnlisted: true } : {}),
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
    const absoluteCollection = path.join(rootDir, rawName);
    const isUnlisted = await isUnlistedCollection(absoluteCollection);
    const description = await readCollectionDescription(absoluteCollection);
    const assets = await listCollectionAssetsRaw(rootDir, relPath);
    collections.push({
      rawName,
      path: relPath,
      entries: [],
      ...(isUnlisted ? { isUnlisted: true } : {}),
      ...(description ? { description } : {}),
      ...(assets.length ? { assets } : {}),
    });
  }

  collections.sort((a, b) => {
    const orderA = orderKey(a.rawName);
    const orderB = orderKey(b.rawName);
    if (orderA !== orderB) return orderA - orderB;
    return a.rawName.localeCompare(b.rawName, undefined, { sensitivity: "base" });
  });

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
        ...(blk.skipRender ? { skipRender: true } : {}),
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
      ...(raw.isDraft ? { isDraft: true } : {}),
      ...(raw.isUnlisted ? { isUnlisted: true } : {}),
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
    const isUnlisted = !!raw.isUnlisted;
    const entriesWithUnlisted = isUnlisted
      ? entries.map((entry) => ({ ...entry, isUnlisted: true }))
      : entries;
    const assets = raw.assets ? enrichBlocks(raw.assets) : undefined;

    return {
      id,
      rawName: raw.rawName,
      name,
      slug,
      path: raw.path,
      entries: entriesWithUnlisted,
      ...(assets ? { assets } : {}),
      ...(raw.description ? { description: raw.description } : {}),
      ...(isUnlisted ? { isUnlisted: true } : {}),
    };
  });
}

async function readIgnoreFile(dir: string): Promise<Set<string>> {
  const ignorePath = path.join(dir, "ignore.webt");
  try {
    const content = await readFile(ignorePath, "utf8");
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
    return new Set(lines);
  } catch {
    return new Set();
  }
}

async function isDraftEntry(dir: string): Promise<boolean> {
  const draftPath = path.join(dir, "draft.webt");
  try {
    const fileStat = await stat(draftPath);
    return fileStat.isFile();
  } catch {
    return false;
  }
}

async function isUnlistedEntry(dir: string): Promise<boolean> {
  const unlistedPath = path.join(dir, "unlisted.webt");
  try {
    const fileStat = await stat(unlistedPath);
    return fileStat.isFile();
  } catch {
    return false;
  }
}

async function isUnlistedCollection(dir: string): Promise<boolean> {
  return isUnlistedEntry(dir);
}

async function readCollectionDescription(dir: string): Promise<string | undefined> {
  const descriptionPath = path.join(dir, "collection-description.webt");
  try {
    const content = await readFile(descriptionPath, "utf8");
    const trimmed = content.trimEnd();
    return trimmed.length ? trimmed : undefined;
  } catch {
    return undefined;
  }
}

async function listCollectionAssetsRaw(
  rootDir: string,
  collectionPath: string
): Promise<RawBlock[]> {
  const assetsDir = path.join(rootDir, collectionPath, "_assets");
  const entries = await readdir(assetsDir, { withFileTypes: true }).catch(() => []);
  const assets: RawBlock[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const rawName = entry.name;
    if (!rawName || rawName.startsWith(".") || rawName.startsWith("_")) continue;
    const relPath = toPosix(path.join(collectionPath, "_assets", rawName));
    const ext = path.extname(rawName) || undefined;
    const type = detectBlockType(ext, false, { treatTxtAsMarkdown: false });
    if (type !== "image" && type !== "audio" && type !== "video") continue;
    assets.push({
      rawName,
      type,
      ext,
      path: relPath,
    });
  }

  assets.sort((a, b) => {
    const orderA = orderKey(a.rawName);
    const orderB = orderKey(b.rawName);
    if (orderA !== orderB) return orderA - orderB;
    return a.rawName.localeCompare(b.rawName, undefined, { sensitivity: "base" });
  });

  return assets;
}

export async function scanSite(site: Site, logger?: Logger): Promise<Site> {
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

  const { siteTemplatesRoot } = resolveTemplatesConfig(
    toolEnv.templates,
    site.config?.templates
  );
  const templatesRoot = siteTemplatesRoot ?? toolEnv.templates.root;

  // Pass 1: raw structure
  const rawCollections = await listCollectionsRaw(
    site.rootDir,
    templatesRoot,
    toolEnv.build.outputDirName,
    toolEnv.logging.dirName
  );

  const collectionsWithEntries = await Promise.all(
    rawCollections.map(async (collection) => {
      const entries = await listEntriesRaw(site.rootDir, collection.path, {
        treatTxtAsMarkdown,
      }, logger);
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
