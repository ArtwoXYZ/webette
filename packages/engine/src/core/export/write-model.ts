/**
 * Writes the exported JSON model to `<outputDir>/_model`.
 *
 * Emits `site.json` plus one JSON per entry: `entries/<collection>/` for
 * collection entries, `root-entries/` for root entries and `indexes/` for
 * index folders. The next build reads them back to keep timestamps stable.
 */

import { mkdir, rm } from "node:fs/promises";
import * as path from "node:path";
import type { Logger } from "../../logging/logger";
import type { Site } from "../model";
import { writeIfChanged } from "../../utils/fs";

const PREFERRED_KEYS = [
  "rootDir",
  "site",
  "config",
  "structure",
  "rootEntries",
  "kind",
  "children",
  "ignoredFolders",
  "reason",
  "collections",
  "id",
  "rawName",
  "path",
  "name",
  "displayName",
  "description",
  "tags",
  "type",
  "ext",
  "slug",
  "route",
  "isDraft",
  "isUnlisted",
  "createdAt",
  "updatedAt",
  "fingerprint",
  "entries",
  "blocks",
  "subBlocks",
] as const;

function orderKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(orderKeys);
  if (!value || typeof value !== "object") return value;

  const obj = value as Record<string, unknown>;
  const ordered: Record<string, unknown> = {};

  for (const key of PREFERRED_KEYS) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      ordered[key] = orderKeys(obj[key]);
    }
  }

  for (const key of Object.keys(obj)) {
    if ((PREFERRED_KEYS as readonly string[]).includes(key)) continue;
    ordered[key] = orderKeys(obj[key]);
  }

  return ordered;
}

export async function writeModelExport(options: {
  exportDir: string;
  site: Site;
  logger: Logger;
}): Promise<void> {
  const { exportDir, site, logger } = options;

  const { indexes, ...siteBase } = site;

  const siteSummary = {
    ...siteBase,
    plugins: site.plugins,
    rootEntries: site.rootEntries?.map((entry) => ({
      id: entry.id,
      rawName: entry.rawName,
      path: entry.path,
      name: entry.name,
      displayName: entry.displayName,
      description: entry.description,
      slug: entry.slug,
      route: entry.route,
      isDraft: entry.isDraft,
      isUnlisted: entry.isUnlisted,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      fingerprint: entry.fingerprint,
    })),
    collections: site.collections?.map((collection) => {
      const { entries, ...rest } = collection;
      const entrySummaries = entries.map((entry) => ({
        id: entry.id,
        rawName: entry.rawName,
        path: entry.path,
        name: entry.name,
        displayName: entry.displayName,
        description: entry.description,
        slug: entry.slug,
        route: entry.route,
        isDraft: entry.isDraft,
        isUnlisted: entry.isUnlisted,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        fingerprint: entry.fingerprint,
      }));
      return {
        ...rest,
        entries: entrySummaries,
      };
    }),
  };

  try {
    await rm(exportDir, { recursive: true, force: true });
    await mkdir(exportDir, { recursive: true });
    await writeIfChanged(
      path.join(exportDir, "site.json"),
      JSON.stringify(orderKeys(siteSummary), null, 2),
      logger
    );

    const entriesDir = path.join(exportDir, "entries");
    await mkdir(entriesDir, { recursive: true });

    for (const collection of site.collections ?? []) {
      const collectionDirName = collection.slug || collection.id;
      const collectionDir = path.join(entriesDir, collectionDirName);
      await mkdir(collectionDir, { recursive: true });

      for (const entry of collection.entries) {
        const entryFileName = `${entry.slug || entry.id}.json`;
        const entryPath = path.join(collectionDir, entryFileName);
        await writeIfChanged(entryPath, JSON.stringify(orderKeys(entry), null, 2), logger);
      }
    }

    if (site.rootEntries?.length) {
      const rootEntriesDir = path.join(exportDir, "root-entries");
      await mkdir(rootEntriesDir, { recursive: true });
      for (const entry of site.rootEntries) {
        const entryPath = path.join(rootEntriesDir, `${entry.slug || entry.id}.json`);
        await writeIfChanged(entryPath, JSON.stringify(orderKeys(entry), null, 2), logger);
      }
    }

    const collectionIndexes = Object.entries(indexes?.collections ?? {});
    if (indexes?.root || collectionIndexes.length) {
      const indexesDir = path.join(exportDir, "indexes");
      await mkdir(path.join(indexesDir, "collections"), { recursive: true });
      if (indexes?.root) {
        await writeIfChanged(
          path.join(indexesDir, "root.json"),
          JSON.stringify(orderKeys(indexes.root), null, 2),
          logger
        );
      }
      for (const [collectionKey, entry] of collectionIndexes) {
        await writeIfChanged(
          path.join(indexesDir, "collections", `${collectionKey}.json`),
          JSON.stringify(orderKeys(entry), null, 2),
          logger
        );
      }
    }

    logger.info("build.exportModel.success", { path: exportDir });
  } catch (err: any) {
    logger.error("build.exportModel.error", { path: exportDir, error: String(err) });
    throw err;
  }
}
