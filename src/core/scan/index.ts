import { readdir } from "node:fs/promises";
import * as path from "node:path";
import { getEnv } from "../../config/env";
import { detectBlockType } from "./detect-block-type";
import { toPosix } from "../../utils/path";
import { cleanName, limitSlugWords, orderKey, slugify } from "../../utils/naming";
import type { Block, Collection, Entry, Site } from "../model";

async function listBlocks(
  rootDir: string,
  entryRelPath: string,
  entryId: string,
  blockSlugCounts: Map<string, number> = new Map()
): Promise<Block[]> {
  // Walk one entry folder and collect files/subfolders as blocks
  const absoluteEntry = path.join(rootDir, entryRelPath);
  const dirEntries = await readdir(absoluteEntry, { withFileTypes: true });
  const blocks: Block[] = [];

  for (const fsEntry of dirEntries) {
    const rawName = fsEntry.name;
    if (!rawName || rawName.startsWith(".") || rawName.startsWith("_")) continue;

    const baseName = fsEntry.isDirectory()
      ? rawName
      : path.parse(rawName).name; // drop extension for display/slug
    const name = cleanName(baseName);
    const baseSlug = slugify(name);
    const slugCount = blockSlugCounts.get(baseSlug) ?? 0;
    const slug = slugCount === 0 ? baseSlug : `${baseSlug}-${slugCount + 1}`;
    blockSlugCounts.set(baseSlug, slugCount + 1);
    const relPath = toPosix(path.join(entryRelPath, rawName));
    const isDirectory = fsEntry.isDirectory();
    const ext = isDirectory ? undefined : path.extname(rawName) || undefined;
    const type = detectBlockType(ext, isDirectory);

    const baseId = `blk__${limitSlugWords(slug).replace(/-/g, "_")}`;
    const existingCount = blockSlugCounts.get(baseId) ?? 0;
    const id = existingCount === 0 ? baseId : `${baseId}_${existingCount + 1}`;
    blockSlugCounts.set(baseId, existingCount + 1);

    let subBlocks: Block[] | undefined;
    if (isDirectory) {
      subBlocks = await listBlocks(rootDir, relPath, entryId, blockSlugCounts);
    }

    blocks.push({
      id,
      rawName,
      name,
      slug,
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
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

  return blocks;
}

async function listCollections(
  rootDir: string,
  toolTemplatesRoot: string,
  outputDirName: string,
  loggingDirName: string
): Promise<Collection[]> {
  // Top-level scan: each admissible folder becomes a collection
  const dirEntries = await readdir(rootDir, { withFileTypes: true });
  const collections: Collection[] = [];
  const collectionIdCounts = new Map<string, number>();

  const templateDirName = path.basename(toolTemplatesRoot);

  for (const entry of dirEntries) {
    if (!entry.isDirectory()) continue;

    const rawName = entry.name;
    if (!rawName || rawName.startsWith(".") || rawName.startsWith("_")) continue;
    if (rawName === outputDirName || rawName === loggingDirName) continue;
    if (rawName === templateDirName) continue;

    const name = cleanName(rawName);
    const slug = slugify(name);
    const relPath = toPosix(rawName); // root-level relative path, normalized
    const idBase = `col__${limitSlugWords(slug).replace(/-/g, "_")}`;
    const existing = collectionIdCounts.get(idBase) ?? 0;
    const id = existing === 0 ? idBase : `${idBase}_${existing + 1}`;
    collectionIdCounts.set(idBase, existing + 1);

    collections.push({
      id,
      rawName,
      name,
      slug,
      path: relPath,
      entries: [],
    });
  }

  return collections;
}

async function listEntries(
  rootDir: string,
  collectionPath: string,
  collectionId: string,
  entrySlugCounts: Map<string, number>
): Promise<Entry[]> {
  // Second-level scan: subfolders of a collection become entries
  const absolute = path.join(rootDir, collectionPath);
  const dirEntries = await readdir(absolute, { withFileTypes: true });
  const entries: Entry[] = [];

  for (const entry of dirEntries) {
    if (!entry.isDirectory()) continue;

    const rawName = entry.name;
    if (!rawName || rawName.startsWith(".") || rawName.startsWith("_")) continue;

    const name = cleanName(rawName);
    const baseSlug = slugify(name);
    const slugCount = entrySlugCounts.get(baseSlug) ?? 0;
    const slug = slugCount === 0 ? baseSlug : `${baseSlug}-${slugCount + 1}`;
    entrySlugCounts.set(baseSlug, slugCount + 1);
    const relPath = toPosix(path.join(collectionPath, rawName));
    const idBase = `ent__${limitSlugWords(slug).replace(/-/g, "_")}`;
    const existing = entrySlugCounts.get(idBase) ?? 0;
    const id = existing === 0 ? idBase : `${idBase}_${existing + 1}`;
    entrySlugCounts.set(idBase, existing + 1);

    const blocks = await listBlocks(rootDir, relPath, id, new Map());

    entries.push({
      id,
      rawName,
      name,
      slug,
      path: relPath,
      blocks,
    });
  }

  entries.sort((a, b) => {
    const orderA = orderKey(a.rawName);
    const orderB = orderKey(b.rawName);
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

  return entries;
}

export async function scanSite(site: Site): Promise<Site> {
  const toolEnv = await getEnv();

  // 1) Discover collections at the root (skip output/logs/templates/hidden)
  const collections = await listCollections(
    site.rootDir,
    toolEnv.templates.root,
    toolEnv.build.outputDirName,
    toolEnv.logging.dirName
  );

  // 2) For each collection, discover entries + blocks
  const collectionsWithEntries = await Promise.all(
    collections.map(async (collection) => {
      const entries = await listEntries(
        site.rootDir,
        collection.path,
        collection.id,
        new Map()
      );
      return { ...collection, entries };
    })
  );

  return {
    ...site,
    collections: collectionsWithEntries,
  };
}
