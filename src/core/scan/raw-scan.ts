/**
 * Recursive filesystem scan and classification (root/collection/entry/folder-block).
 */

import { readdir, readFile, stat } from "node:fs/promises";
import * as path from "node:path";
import { detectBlockType } from "./detect-block-type";
import { toPosix } from "../../utils/path";
import { cleanName, orderKey } from "../../utils/naming";
import type { Logger } from "../../logging/logger";
import type {
  RawBlock,
  RawEntry,
  RawStructureIgnoredFolder,
  RawStructureNode,
} from "./internal-types";
import {
  isBlockCandidateFileOutsideEntry,
  isIgnoredMetaFileOutsideEntry,
  isIndexFolderName,
  isReferenceBlockFile,
  isVisibleContentName,
  sortByName,
} from "./utils";

export async function readIgnoreFile(dir: string): Promise<Set<string>> {
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

export async function isDraftEntry(dir: string): Promise<boolean> {
  const draftPath = path.join(dir, "draft.webt");
  try {
    const fileStat = await stat(draftPath);
    return fileStat.isFile();
  } catch {
    return false;
  }
}

export async function isUnlistedEntry(dir: string): Promise<boolean> {
  const unlistedPath = path.join(dir, "unlisted.webt");
  try {
    const fileStat = await stat(unlistedPath);
    return fileStat.isFile();
  } catch {
    return false;
  }
}

export async function isUnlistedCollection(dir: string): Promise<boolean> {
  return isUnlistedEntry(dir);
}

export async function readDescriptionFile(dir: string): Promise<string | undefined> {
  const descriptionPath = path.join(dir, "description.webt");
  try {
    const content = await readFile(descriptionPath, "utf8");
    const trimmed = content.trimEnd();
    return trimmed.length ? trimmed : undefined;
  } catch {
    return undefined;
  }
}

export async function readNameFile(dir: string): Promise<string | undefined> {
  const namePath = path.join(dir, "name.webt");
  try {
    const content = await readFile(namePath, "utf8");
    const trimmed = content.trim();
    return trimmed.length ? trimmed : undefined;
  } catch {
    return undefined;
  }
}

export async function listCollectionAssetsRaw(
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
    const type = detectBlockType(rawName, ext, false, { treatTxtAsMarkdown: false });
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

export async function listBlocksRaw(
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
    const isNavigation =
      !isDirectory &&
      cleanName(rawName).toLowerCase() === "navigation.webt";
    const isReference =
      !isDirectory &&
      ext?.toLowerCase() === ".webt" &&
      rawName.toLowerCase().includes("reference");
    if (!isDirectory && ext?.toLowerCase() === ".webt" && !isNavigation && !isReference) continue;
    const type = isNavigation ? "navigation" : detectBlockType(rawName, ext, isDirectory, options);

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
      ...(shouldSkipRender ? { skipRender: true } : {}),
      ...(subBlocks && subBlocks.length > 0 ? { subBlocks } : {}),
    });
  }

  sortByName(blocks);

  return blocks;
}

export async function classifyFolderOutsideEntry(options: {
  rootDir: string;
  relPath: string;
}): Promise<
  | { kind: "entry" }
  | { kind: "collection" }
  | { kind: "ignored"; reason: RawStructureIgnoredFolder["reason"] }
> {
  const absolute = path.join(options.rootDir, options.relPath);
  const dirEntries = await readdir(absolute, { withFileTypes: true });

  let hasBlockFile = false;
  let hasContentChildDir = false;
  let hasCollectionAssetsDir = false;
  let hasMetaFile = false;

  for (const fsEntry of dirEntries) {
    const rawName = fsEntry.name;
    if (!rawName || rawName.startsWith(".")) continue;

    if (fsEntry.isDirectory()) {
      if (rawName === "_assets") {
        hasCollectionAssetsDir = true;
        continue;
      }
      if (!isVisibleContentName(rawName)) continue;
      hasContentChildDir = true;
      continue;
    }

    if (!fsEntry.isFile()) continue;
    if (!isVisibleContentName(rawName)) continue;

    if (isBlockCandidateFileOutsideEntry(fsEntry)) {
      hasBlockFile = true;
      break;
    }

    if (isIgnoredMetaFileOutsideEntry(fsEntry)) {
      hasMetaFile = true;
    }
  }

  if (hasBlockFile) return { kind: "entry" };
  if (hasContentChildDir || hasCollectionAssetsDir) return { kind: "collection" };
  if (hasMetaFile) return { kind: "ignored", reason: "meta-only-folder" };
  return { kind: "ignored", reason: "empty-folder" };
}

export async function scanStructureFolderRaw(options: {
  rootDir: string;
  relPath: string;
  rawName: string;
  treatTxtAsMarkdown: boolean;
  ignoredFolders: RawStructureIgnoredFolder[];
  logger?: Logger;
}): Promise<RawStructureNode | undefined> {
  const {
    rootDir,
    relPath,
    rawName,
    treatTxtAsMarkdown,
    ignoredFolders,
    logger,
  } = options;

  const classification = await classifyFolderOutsideEntry({ rootDir, relPath });
  const absolute = path.join(rootDir, relPath);

  if (classification.kind === "ignored") {
    ignoredFolders.push({ path: relPath, reason: classification.reason });
    logger?.warn("scan.folderIgnored", { path: relPath, reason: classification.reason });
    return undefined;
  }

  const isUnlisted = await isUnlistedCollection(absolute);
  const description = await readDescriptionFile(absolute);
  const displayName = await readNameFile(absolute);

  if (classification.kind === "entry") {
    const blocks = await listBlocksRaw(
      rootDir,
      relPath,
      { treatTxtAsMarkdown },
      logger
    );
    const isDraft = await isDraftEntry(absolute);

    return {
      kind: "entry",
      rawName,
      path: relPath,
      blocks,
      ...(isDraft ? { isDraft: true } : {}),
      ...(isUnlisted ? { isUnlisted: true } : {}),
      ...(description ? { description } : {}),
      ...(displayName ? { displayName } : {}),
    };
  }

  const dirEntries = await readdir(absolute, { withFileTypes: true });
  const childCandidates: Array<{ rawName: string; path: string }> = [];

  for (const child of dirEntries) {
    if (!child.isDirectory()) continue;
    const childName = child.name;
    if (!isVisibleContentName(childName)) continue;
    childCandidates.push({
      rawName: childName,
      path: toPosix(path.join(relPath, childName)),
    });
  }

  sortByName(childCandidates);

  const children: RawStructureNode[] = [];
  for (const child of childCandidates) {
    const scannedChild = await scanStructureFolderRaw({
      rootDir,
      relPath: child.path,
      rawName: child.rawName,
      treatTxtAsMarkdown,
      ignoredFolders,
      logger,
    });
    if (scannedChild) children.push(scannedChild);
  }

  return {
    kind: "collection",
    rawName,
    path: relPath,
    children,
    ...(isUnlisted ? { isUnlisted: true } : {}),
    ...(description ? { description } : {}),
    ...(displayName ? { displayName } : {}),
  };
}

export async function listStructureRootRaw(options: {
  rootDir: string;
  toolTemplatesRoot: string;
  outputDirName: string;
  loggingDirName: string;
  indexFolderName: string;
  treatTxtAsMarkdown: boolean;
  logger?: Logger;
}): Promise<{ children: RawStructureNode[]; ignoredFolders: RawStructureIgnoredFolder[] }> {
  const {
    rootDir,
    toolTemplatesRoot,
    outputDirName,
    loggingDirName,
    indexFolderName,
    treatTxtAsMarkdown,
    logger,
  } = options;

  const dirEntries = await readdir(rootDir, { withFileTypes: true });
  const templateDirName = path.basename(toolTemplatesRoot);
  const rootCandidates: Array<{ rawName: string; path: string }> = [];
  const ignoredFolders: RawStructureIgnoredFolder[] = [];

  for (const entry of dirEntries) {
    if (!entry.isDirectory()) continue;
    const rawName = entry.name;
    if (!isVisibleContentName(rawName)) continue;
    if (rawName === outputDirName || rawName === loggingDirName) continue;
    if (rawName === templateDirName) continue;
    if (isIndexFolderName(rawName, indexFolderName)) continue;
    // Root-level files are intentionally ignored here; this pass classifies folders only.

    rootCandidates.push({ rawName, path: toPosix(rawName) });
  }

  sortByName(rootCandidates);

  const children: RawStructureNode[] = [];
  for (const candidate of rootCandidates) {
    const scanned = await scanStructureFolderRaw({
      rootDir,
      relPath: candidate.path,
      rawName: candidate.rawName,
      treatTxtAsMarkdown,
      ignoredFolders,
      logger,
    });
    if (scanned) children.push(scanned);
  }

  return { children, ignoredFolders };
}

export async function listRootIndexRaw(
  rootDir: string,
  toolTemplatesRoot: string,
  outputDirName: string,
  loggingDirName: string,
  indexFolderName: string,
  options: { treatTxtAsMarkdown: boolean },
  logger?: Logger
): Promise<RawEntry | undefined> {
  const dirEntries = await readdir(rootDir, { withFileTypes: true });
  const templateDirName = path.basename(toolTemplatesRoot);
  const candidates: Array<{ rawName: string; path: string }> = [];

  for (const entry of dirEntries) {
    if (!entry.isDirectory()) continue;
    const rawName = entry.name;
    if (!rawName || rawName.startsWith(".") || rawName.startsWith("_")) continue;
    if (rawName === outputDirName || rawName === loggingDirName) continue;
    if (rawName === templateDirName) continue;
    if (!isIndexFolderName(rawName, indexFolderName)) continue;

    const relPath = toPosix(rawName);
    candidates.push({ rawName, path: relPath });
  }

  if (!candidates.length) return undefined;
  sortByName(candidates);
  const [target] = candidates;
  if (!target) return undefined;
  if (candidates.length > 1) {
    logger?.warn("index.folder.multipleRoot", {
      count: candidates.length,
      chosen: target.rawName,
      candidates: candidates.map((item) => item.rawName).join(", "),
    });
  }

  const blocks = await listBlocksRaw(rootDir, target.path, options, logger);
  const absoluteEntry = path.join(rootDir, target.path);
  const isDraft = await isDraftEntry(absoluteEntry);
  const isUnlisted = await isUnlistedEntry(absoluteEntry);
  const description = await readDescriptionFile(absoluteEntry);
  const displayName = await readNameFile(absoluteEntry);

  return {
    rawName: target.rawName,
    path: target.path,
    blocks,
    ...(isDraft ? { isDraft: true } : {}),
    ...(isUnlisted ? { isUnlisted: true } : {}),
    ...(description ? { description } : {}),
    ...(displayName ? { displayName } : {}),
  };
}
