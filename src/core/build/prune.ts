/**
 * Output pruning for `overwrite=replace-files`.
 *
 * Deletes files in the output directory that aren't expected for the current build.
 */

import { readdir } from "node:fs/promises";
import * as path from "node:path";
import type { Logger } from "../../logging/logger";
import type { WebetteEnv } from "../../config/env";
import type { Block, Collection, Entry, Site } from "../model";
import { removeEmptyDirectories, rmWithRetries } from "../../utils/fs";

export type ExpectedOutputsRegistry = {
  addExpectedOutput: (relativePath: string) => void;
  addExpectedDir: (relativeDir: string) => void;
  expectedOutputs: Set<string>;
  expectedPrefixes: Set<string>;
};

export function createExpectedOutputsRegistry(): ExpectedOutputsRegistry {
  const expectedOutputs = new Set<string>();
  const expectedPrefixes = new Set<string>();

  const addExpectedOutput = (relativePath: string) => {
    if (typeof relativePath !== "string") return;
    const normalized = path.normalize(relativePath).replace(/^[/\\]+/, "").trim();
    if (!normalized) return;
    expectedOutputs.add(normalized);
  };

  const addExpectedDir = (relativeDir: string) => {
    if (typeof relativeDir !== "string") return;
    const normalized = path
      .normalize(relativeDir)
      .replace(/^[/\\]+/, "")
      .replace(/[/\\]+$/, "")
      .trim();
    if (!normalized) return;
    expectedPrefixes.add(normalized + path.sep);
  };

  return { addExpectedOutput, addExpectedDir, expectedOutputs, expectedPrefixes };
}

export function collectProtectedDirs(options: {
  outputDir: string;
  exportDir: string;
  env: WebetteEnv;
  site: Site;
  includeDrafts: boolean;
}): Set<string> {
  const { outputDir, exportDir, env, site, includeDrafts } = options;
  const exportSegment = path.relative(outputDir, exportDir).replace(/^[/\\]+/, "");
  const assetSegments = [
    env.images.outputDir,
    env.audio.outputDir,
    env.video.outputDir,
    exportSegment,
  ]
    .map((seg) => seg.replace(/^[/\\]+/, ""))
    .filter(Boolean);

  const dirsToCover = new Set<string>();
  const addDir = (dirPath: string) => dirsToCover.add(path.normalize(dirPath));

  for (const seg of assetSegments) {
    const baseDir = path.join(outputDir, seg);
    addDir(baseDir);
    const normalizedOutput = path.normalize(outputDir);
    let parent = path.dirname(baseDir);
    while (parent && path.normalize(parent) !== normalizedOutput) {
      addDir(parent);
      const nextParent = path.dirname(parent);
      if (nextParent === parent) break;
      parent = nextParent;
    }
  }

  const collectDirForRoute = (route?: string) => {
    if (!route) return;
    const rel = route.replace(/^[/\\]+/, "");
    if (!rel) return;
    const abs = path.join(outputDir, rel);
    let dir = path.dirname(abs);
    const normalizedOutput = path.normalize(outputDir);
    while (dir && path.normalize(dir).startsWith(normalizedOutput)) {
      addDir(dir);
      const next = path.dirname(dir);
      if (next === dir || path.normalize(next) === normalizedOutput) break;
      dir = next;
    }
  };

  for (const collection of site.collections ?? []) {
    for (const entry of collection.entries) {
      if (!includeDrafts && entry.isDraft) continue;
      const visitBlocks = (blocks: Block[]) => {
        for (const blk of blocks) {
          collectDirForRoute(blk.route);
          if (blk.content?.variants) {
            for (const variant of blk.content.variants) {
              collectDirForRoute(variant.route);
            }
          }
          if (blk.subBlocks) visitBlocks(blk.subBlocks);
        }
      };
      visitBlocks(entry.blocks);
    }
  }

  return dirsToCover;
}

export async function pruneOrphans(options: {
  outputDir: string;
  exportDir: string;
  site: Site;
  includeDrafts: boolean;
  overwrite: WebetteEnv["build"]["overwrite"];
  generateIndex: boolean;
  writeHtaccess: boolean;
  writeNginxSample: boolean;
  protectedDirs?: Set<string>;
  pluginExpected: ExpectedOutputsRegistry;
  logger: Logger;
}): Promise<void> {
  const {
    outputDir,
    exportDir,
    site,
    includeDrafts,
    overwrite,
    generateIndex,
    writeHtaccess,
    writeNginxSample,
    protectedDirs,
    pluginExpected,
    logger,
  } = options;

  if (overwrite === "replace-all") {
    await removeEmptyDirectories(outputDir, outputDir);
    return;
  }

  logger.info("build.outputPruneStarted");

  const expectedOutputs = new Set<string>();
  const expectedPrefixes = new Set<string>(pluginExpected.expectedPrefixes);

  const addOutput = (relPath: string | undefined) => {
    if (!relPath) return;
    const normalized = relPath.replace(/^[/\\]+/, "");
    if (normalized) expectedOutputs.add(path.normalize(normalized));
  };

  for (const extra of pluginExpected.expectedOutputs) {
    addOutput(extra);
  }

  if (protectedDirs && protectedDirs.size) {
    for (const dirPath of protectedDirs) {
      const rel = path.relative(outputDir, dirPath).replace(/\\+/g, "/");
      addOutput(path.join(rel, "index.html"));
    }
  }

  const exportRel = path.relative(outputDir, exportDir);
  addOutput(path.join(exportRel, "site.json"));
  for (const collection of site.collections ?? []) {
    const colDir = path.join(exportRel, "entries", collection.slug || collection.id);
    for (const entry of collection.entries) {
      if (!includeDrafts && entry.isDraft) continue;
      addOutput(path.join(colDir, `${entry.slug || entry.id}.json`));
    }
  }

  const addEntryPage = (entry: Entry, collection: Collection) => {
    const routeRelative = entry.route
      ? entry.route.replace(/^\/+/, "")
      : path.join(collection.slug || collection.id, entry.slug || entry.id);
    addOutput(path.join(routeRelative, "index.html"));
  };

  if (generateIndex) {
    addOutput("index.html");
    for (const collection of site.collections ?? []) {
      const routeRelative = collection.route
        ? collection.route.replace(/^\/+/, "").replace(/\/+$/, "")
        : collection.slug || collection.id;
      const collectionIndex = routeRelative
        ? path.join(routeRelative, "index.html")
        : "index.html";
      addOutput(collectionIndex);
    }
  }

  addOutput("404.html");
  addOutput("sitemap.xml");
  if (writeHtaccess) addOutput(".htaccess");
  if (writeNginxSample) addOutput("nginx.conf");

  const collectBlocks = (blocks: Block[]) => {
    for (const blk of blocks) {
      if (blk.route) addOutput(blk.route);
      if (blk.content?.variants) {
        for (const variant of blk.content.variants) {
          if (variant.route) addOutput(variant.route);
        }
      }
      if (blk.subBlocks) collectBlocks(blk.subBlocks);
    }
  };

  for (const collection of site.collections ?? []) {
    for (const entry of collection.entries) {
      if (!includeDrafts && entry.isDraft) continue;
      collectBlocks(entry.blocks);
      addEntryPage(entry, collection);
    }
  }

  for (const collection of site.collections ?? []) {
    if (collection.assets) {
      collectBlocks(collection.assets);
    }
  }

  const listFilesRecursive = async (dir: string): Promise<string[]> => {
    const results: string[] = [];
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const item of entries) {
      const rel = path.join(path.relative(outputDir, dir), item.name);
      if (item.isDirectory()) {
        results.push(...(await listFilesRecursive(path.join(dir, item.name))));
      } else {
        results.push(path.normalize(rel));
      }
    }
    return results;
  };

  const existingFiles = await listFilesRecursive(outputDir);
  const toDelete = existingFiles.filter((file) => {
    const normalizedFile = file.replace(/^[/\\]+/, "");
    const keepByFile = expectedOutputs.has(normalizedFile);
    const keepByPrefix = Array.from(expectedPrefixes).some((prefix) =>
      normalizedFile.startsWith(prefix)
    );
    return !(keepByFile || keepByPrefix);
  });

  for (const rel of toDelete) {
    const abs = path.join(outputDir, rel);
    try {
      await rmWithRetries(abs, { force: true });
      logger.info("build.outputPruned", { path: abs });
    } catch (err) {
      logger.warn("build.outputPruneFailed", { path: abs, error: String(err) });
    }
  }

  await removeEmptyDirectories(outputDir, outputDir);
}
