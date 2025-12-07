import { mkdir, rm, stat, writeFile, readdir } from "node:fs/promises";
import * as path from "node:path";
import { getEnv, resolveLocale } from "../config/env";
import { t } from "../logging/i18n";
import { createSite } from "./config";
import { scanSite } from "./scan";
import { resolveBlocks } from "./resolve";
import { createTemplateRenderer } from "./template";
import type { Block } from "./model";
import type { Logger } from "../logging/logger";
import { unified, type Plugin } from "unified";
import rehypeParse from "rehype-parse";
import rehypeFormat from "rehype-format";
import rehypeStringify from "rehype-stringify";
import type { Root } from "hast";

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
  prettyPrint?: boolean;
  generateIndex?: boolean;
  protectAssets?: boolean;
  writeHtaccess?: boolean;
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
  const layoutPartialName =
    path.parse(toolEnv.templates.defaultLayout).name || toolEnv.templates.defaultLayout;
  const buildTime = new Date();
  const prettyPrint =
    typeof options.prettyPrint === "boolean"
      ? options.prettyPrint
      : toolEnv.build.prettyPrint;
  const generateIndex =
    typeof options.generateIndex === "boolean"
      ? options.generateIndex
      : toolEnv.build.generateIndex;
  const accessForbiddenLayoutName =
    path.parse(toolEnv.templates.accessForbiddenLayout).name ||
    toolEnv.templates.accessForbiddenLayout;
  const protectAssets =
    typeof options.protectAssets === "boolean"
      ? options.protectAssets
      : toolEnv.build.protectAssets;
  const writeHtaccess =
    typeof options.writeHtaccess === "boolean"
      ? options.writeHtaccess
      : toolEnv.build.writeHtaccess;

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
    defaultWrapperName: toolEnv.templates.defaultWrapper,
    defaultLayoutName: toolEnv.templates.defaultLayout,
    templatesRoot: toolEnv.templates.root,
    logger: scoped.child("templates"),
  });

  const renderBaseContext = {
    model: resolvedSite,
    site: resolvedSite.site,
    collections: resolvedSite.collections ?? [],
    layoutName: layoutPartialName,
    buildTime,
    liveReloadScript,
  };

  const formatHtml = async (rawHtml: string, targetPath: string): Promise<string> => {
    if (!prettyPrint) return rawHtml;
    try {
      type ParseOptions = Parameters<typeof rehypeParse>[0];
      type FormatOptions = Parameters<typeof rehypeFormat>[0];
      type StringifyOptions = Parameters<typeof rehypeStringify>[0];

      const parsePlugin = rehypeParse as Plugin<[ParseOptions?], Root, Root>;
      const formatPlugin = rehypeFormat as Plugin<[FormatOptions?], Root, Root>;
      const stringifyPlugin = rehypeStringify as Plugin<[StringifyOptions?], Root, string>;

      const formatted = await unified()
        .data("settings", { fragment: false })
        .use(parsePlugin, { fragment: false })
        .use(formatPlugin, { indent: 2 })
        .use(stringifyPlugin)
        .process(rawHtml);
      return String(formatted);
    } catch (err) {
      scoped.warn("build.prettyPrintFailed", {
        path: targetPath,
        error: String(err),
      });
      return rawHtml;
    }
  };

  const protectAssetDirs = async () => {
    if (!protectAssets) return;

    const assetSegments = [
      toolEnv.images.outputDir,
      toolEnv.audio.outputDir,
      toolEnv.video.outputDir,
    ]
      .map((seg) => seg.replace(/^[/\\]+/, ""))
      .filter(Boolean);

    const seen = new Set<string>();

    const walkDirs = async (base: string): Promise<string[]> => {
      const dirs: string[] = [];
      const entries = await readdir(base, { withFileTypes: true }).catch(() => []);
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const child = path.join(base, entry.name);
        dirs.push(child);
        dirs.push(...(await walkDirs(child)));
      }
      return dirs;
    };

    for (const seg of assetSegments) {
      const baseDir = path.join(outputDir, seg);
      await mkdir(baseDir, { recursive: true });
      const dirs = [baseDir, ...(await walkDirs(baseDir))];

      for (const dirPath of dirs) {
        const rel = path.relative(outputDir, dirPath).replace(/\\+/g, "/");
        if (seen.has(rel)) continue;
        seen.add(rel);

        const route = `/${rel}`;
        const ctx = {
          ...renderBaseContext,
          layoutName: accessForbiddenLayoutName,
          entry: { name: "Access forbidden", route },
        };

        const html = templateRenderer.render(ctx);
        const targetPath = path.join(dirPath, "index.html");
        const finalHtml = await formatHtml(html, targetPath);
        await writeFile(targetPath, finalHtml, "utf8");
        scoped.debug("build.fileGenerated", { path: targetPath });

        if (writeHtaccess) {
          const htaccessPath = path.join(dirPath, ".htaccess");
          await writeFile(htaccessPath, "Options -Indexes\n", "utf8");
          scoped.debug("build.fileGenerated", { path: htaccessPath });
        }
      }
    }
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
        const finalHtml = await formatHtml(html, entryIndexPath);

        await writeFile(entryIndexPath, finalHtml, "utf8");
        scoped.debug("build.fileGenerated", { path: entryIndexPath });
        renderedPages += 1;
      }
    }
  }

  if (generateIndex) {
    // Root index (collections listing)
    const indexLayoutPartialName =
      path.parse(toolEnv.templates.defaultIndexLayout).name ||
      toolEnv.templates.defaultIndexLayout;

    const rootContext = {
      ...renderBaseContext,
      layoutName: indexLayoutPartialName,
      entry: { name: "Index", route: "/" },
    };
    const rootHtml = templateRenderer.render(rootContext);
    const rootIndexPath = path.join(outputDir, "index.html");
    await mkdir(path.dirname(rootIndexPath), { recursive: true });
    const finalRootHtml = await formatHtml(rootHtml, rootIndexPath);
    await writeFile(rootIndexPath, finalRootHtml, "utf8");
    scoped.debug("build.fileGenerated", { path: rootIndexPath });

    // Collection indexes
    for (const collection of resolvedSite.collections ?? []) {
      const routeRelative = collection.route
        ? collection.route.replace(/^\/+/, "").replace(/\/+$/, "")
        : collection.slug || collection.id;
      const collectionIndexDir = routeRelative
        ? path.join(outputDir, routeRelative)
        : outputDir;
      const collectionIndexPath = path.join(collectionIndexDir, "index.html");

      const ctx = {
        ...renderBaseContext,
        layoutName: indexLayoutPartialName,
        entry: { name: collection.name, route: collection.route },
        collection,
        entries: collection.entries,
      };
      const colHtml = templateRenderer.render(ctx);
      await mkdir(collectionIndexDir, { recursive: true });
      const finalColHtml = await formatHtml(colHtml, collectionIndexPath);
      await writeFile(collectionIndexPath, finalColHtml, "utf8");
      scoped.debug("build.fileGenerated", { path: collectionIndexPath });
    }
  }

  await protectAssetDirs();

  if (options.quiet) {
    scoped.debug("build.success", { path: outputDir, pages: renderedPages });
  } else {
    scoped.info("build.success", { path: outputDir, pages: renderedPages });
  }
}
