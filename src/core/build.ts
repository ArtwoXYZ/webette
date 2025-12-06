import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { getEnv, resolveLocale } from "../config/env";
import { t } from "../logging/i18n";
import { createSite } from "./config";
import { scanSite } from "./scan";
import { resolveBlocks } from "./resolve";
import { createTemplateRenderer } from "./template";
import type { Block } from "./model";
import type { Logger } from "../logging/logger";

export interface BuildOptions {
  verbose: boolean;
  liveReload?: boolean; // enabled only in "serve" mode
  quiet?: boolean;      // new: fewer logs when true
  exportModel?: {
    enabled?: boolean;
    dir?: string;
    only?: boolean;
  };
  readContent?: boolean; // allow skipping content resolution when requested
}

function countBlocks(blocks: Block[] = []): number {
  return blocks.reduce(
    (total, block) => total + 1 + (block.subBlocks ? countBlocks(block.subBlocks) : 0),
    0
  );
}

export async function build(
  rootDir: string,
  options: BuildOptions,
  logger: Logger
): Promise<void> {
  const scoped = logger.child("build");
  const toolEnv = await getEnv();
  const locale = resolveLocale(toolEnv);

  scoped.debug("build.start", { rootDir });

  const site = await createSite(rootDir);
  scoped.debug("build.siteLoaded", { title: site.site.title });

  const scannedSite = await scanSite(site);
  const readContent =
    typeof options.readContent === "boolean"
      ? options.readContent
      : toolEnv.build.readContent;
  const collectionsList = scannedSite.collections ?? [];
  const entriesCount = collectionsList.reduce(
    (acc, collection) => acc + collection.entries.length,
    0
  );

  if (readContent === false) {
    scoped.info("build.skipContent", {});
  }
  const blocksCount = collectionsList.reduce(
    (acc, collection) =>
      acc +
      collection.entries.reduce((entryAcc, entry) => entryAcc + countBlocks(entry.blocks), 0),
    0
  );

  for (const collection of collectionsList) {
    if (!collection.entries.length) {
      scoped.warn("scan.collectionEmpty", {
        collection: collection.slug || collection.id,
        path: collection.path,
      });
    }
    for (const entry of collection.entries) {
      if (!entry.blocks.length) {
        scoped.warn("scan.entryEmpty", {
          collection: collection.slug || collection.id,
          entry: entry.slug || entry.id,
          path: entry.path,
        });
      }
    }
  }
  if (options.quiet) {
    scoped.debug("scan.summary", {
      collections: collectionsList.length,
      entries: entriesCount,
      blocks: blocksCount,
    });
  } else {
    scoped.info("scan.summary", {
      collections: collectionsList.length,
      entries: entriesCount,
      blocks: blocksCount,
    });
  }
  const outputDir = path.join(rootDir, toolEnv.build.outputDirName);
  const overwrite = toolEnv.build.overwrite;
  const envExport = toolEnv.build.exportModel;

  const exportModel = {
    enabled: options.exportModel?.enabled ?? envExport.enabled,
    dir: options.exportModel?.dir ?? envExport.dir,
    only: options.exportModel?.only ?? envExport.only,
  };

  // Handle existing output directory according to policy
  let outputDirExists = false;
  try {
    const dirStat = await stat(outputDir);
    if (!dirStat.isDirectory()) {
      const message = t(locale, "build.outputNotDirectory", { outputDir });
      scoped.error("build.outputNotDirectory", { outputDir });
      throw new Error(message);
    }
    outputDirExists = true;
  } catch (err: any) {
    if (err?.code !== "ENOENT") {
      scoped.error("build.mkdirFailed", {
        outputDir,
        error: String(err),
      });
      throw err;
    }
  }

  if (outputDirExists) {
    scoped.debug("build.outputDirExists", { outputDir });
    switch (overwrite) {
      case "none":
        scoped.error("build.overwriteDenied", { outputDir });
        throw new Error(t(locale, "build.overwriteDenied", { outputDir }));
      case "replace-all":
        await rm(outputDir, { recursive: true, force: true });
        break;
      case "replace-files":
        // keep directory, individual files handled below
        break;
      default:
        break;
    }
  }

  try {
    await mkdir(outputDir, { recursive: true });
  } catch (err: any) {
    if (err?.code !== "EEXIST") {
      scoped.error("build.mkdirFailed", {
        outputDir,
        error: String(err),
      });
      throw err;
    }
    // Directory already exists: not fatal when recursive, continue
    scoped.debug("build.outputDirExists", { outputDir });
  }

  const resolvedSite = await resolveBlocks(scannedSite, {
    rootDir,
    readContent,
    logger: scoped.child("resolve"),
    remarkPlugins: toolEnv.markdown.remarkPlugins,
    toolEnv,
  });

  const liveReloadScript = options.liveReload
    ? `
  <script>
    (function () {
      let lastVersion = null;
      async function check() {
        try {
          const res = await fetch("/__webette-version", { cache: "no-store" });
          if (!res.ok) return;
          const text = await res.text();
          if (lastVersion === null) {
            lastVersion = text;
          } else if (lastVersion !== text) {
            location.reload();
          }
        } catch (e) {
          // Non-fatal: we will retry later
        }
      }
      setInterval(check, ${toolEnv.serve.liveReloadIntervalMs});
      check();
    })();
  </script>`
    : "";

  // Optional model export (debug)
  if (exportModel.enabled) {
    const exportDir = path.isAbsolute(exportModel.dir)
      ? exportModel.dir
      : path.join(rootDir, exportModel.dir);

    scoped.debug("build.exportModel.start", { path: exportDir });

    const orderKeys = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(orderKeys);
      if (!value || typeof value !== "object") return value;

      const obj = value as Record<string, unknown>;
      const ordered: Record<string, unknown> = {};
      const preferred = [
        "rootDir",
        "site",
        "config",
        "collections",
        "id",
        "rawName",
        "path",
        "name",
        "type",
        "ext",
        "slug",
        "route",
        "entries",
        "blocks",
        "subBlocks",
      ];

      for (const key of preferred) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          ordered[key] = orderKeys(obj[key]);
        }
      }

      for (const key of Object.keys(obj)) {
        if (preferred.includes(key)) continue;
        ordered[key] = orderKeys(obj[key]);
      }

      return ordered;
    };

    const siteSummary = {
      ...resolvedSite,
      collections: resolvedSite.collections?.map((collection) => {
        const { entries, ...rest } = collection;
        const entrySummaries = entries.map((entry) => ({
          id: entry.id,
          rawName: entry.rawName,
          path: entry.path,
          name: entry.name,
          slug: entry.slug,
          route: entry.route,
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
      await writeFile(
        path.join(exportDir, "site.json"),
        JSON.stringify(orderKeys(siteSummary), null, 2),
        "utf8"
      );

      const entriesDir = path.join(exportDir, "entries");
      await mkdir(entriesDir, { recursive: true });

      if (resolvedSite.collections) {
        for (const collection of resolvedSite.collections) {
          const collectionDirName = collection.slug || collection.id;
          const collectionDir = path.join(entriesDir, collectionDirName);
          await mkdir(collectionDir, { recursive: true });

          for (const entry of collection.entries) {
            const entryFileName = `${entry.slug || entry.id}.json`;
            const entryPath = path.join(collectionDir, entryFileName);
            await writeFile(
              entryPath,
              JSON.stringify(orderKeys(entry), null, 2),
              "utf8"
            );
          }
        }
      }

      scoped.info("build.exportModel.success", { path: exportDir });
    } catch (err: any) {
      scoped.error("build.exportModel.error", {
        path: exportDir,
        error: String(err),
      });
      throw err;
    }

    if (exportModel.only) {
      if (options.quiet) {
        scoped.debug("build.exportOnly.success", { path: exportDir });
      } else {
        scoped.info("build.exportOnly.success", { path: exportDir });
      }
      return;
    }
  }

  // Prepare Handlebars template (site overrides take precedence over tool fallback).
  const templateRenderer = await createTemplateRenderer({
    rootDir,
    defaultTemplateName: toolEnv.templates.default,
    templatesRoot: toolEnv.templates.root,
    logger: scoped.child("templates"),
  });

  const renderBaseContext = {
    model: resolvedSite,
    site: resolvedSite.site,
    collections: resolvedSite.collections ?? [],
    liveReloadScript,
  };

  let renderedPages = 0;

  if (resolvedSite.collections) {
    for (const collection of resolvedSite.collections) {
      for (const entry of collection.entries) {
        const entryRouteRelative = entry.route
          ? entry.route.replace(/^\/+/, "")
          : path.join(collection.slug || collection.id, entry.slug || entry.id);

        const context = {
          ...renderBaseContext,
          collection,
          entry,
          blocks: entry.blocks,
        };

        const html = templateRenderer.render(context);
        const entryOutputDir = path.join(outputDir, entryRouteRelative);

        await mkdir(entryOutputDir, { recursive: true });
        const entryIndexPath = path.join(entryOutputDir, "index.html");
        await writeFile(entryIndexPath, html, "utf8");
        scoped.debug("build.fileGenerated", { path: entryIndexPath });
        renderedPages += 1;
      }
    }
  }

  if (options.quiet) {
    scoped.debug("build.success", { path: outputDir, pages: renderedPages });
  } else {
    scoped.info("build.success", { path: outputDir, pages: renderedPages });
  }
}
