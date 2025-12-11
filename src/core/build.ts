import { mkdir, rm, stat, writeFile, readdir } from "node:fs/promises";
import * as path from "node:path";
import { getEnv, resolveLocale } from "../config/env";
import { t } from "../logging/i18n";
import { createSite } from "./config";
import { scanSite } from "./scan";
import { resolveBlocks } from "./resolve";
import { createTemplateRenderer } from "./template";
import type { Block, Entry, Collection } from "./model";
import type { Logger } from "../logging/logger";
import { applyHistory, loadPreviousState } from "./export/history";
import { unified, type Plugin } from "unified";
import rehypeParse from "rehype-parse";
import rehypeFormat from "rehype-format";
import rehypeStringify from "rehype-stringify";
import type { Root } from "hast";
import { loadPlugins } from "../plugins/loader";
import {
  runExtendTemplates,
  runOnInit,
  runOnResolved,
  runOnScan,
  runTransformBlocks,
  runTransformEntry,
} from "../plugins/runner";
import type { PluginContext } from "../plugins/types";
import { rewriteInternalLinks } from "./postprocess/internal-links";

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
  writeNginxSample?: boolean;
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
  const notFoundLayoutName =
    path.parse(toolEnv.templates.notFoundLayout).name || toolEnv.templates.notFoundLayout;
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
  const shouldWriteNginxSample =
    typeof options.writeNginxSample === "boolean"
      ? options.writeNginxSample
      : toolEnv.build.writeNginxSample;

  scoped.debug("build.start", { rootDir });

  const site = await createSite(rootDir);
  scoped.debug("build.siteLoaded", { title: site.site.title });

  const scanLogger = scoped.child("scan");
  const scannedSite = await scanSite(site, scanLogger);
  const plugins = await loadPlugins({
    rootDir,
    pluginPaths: Array.isArray(site.config?.plugins)
      ? (site.config?.plugins as string[])
      : [],
  });
  scoped.debug("build.pluginsLoaded", { count: plugins.length, ids: plugins.map((p) => p.pluginId) });
  const readContent =
    typeof options.readContent === "boolean"
      ? options.readContent
      : toolEnv.build.readContent;

  const outputDir = path.join(rootDir, toolEnv.build.outputDirName);
  const overwrite = toolEnv.build.overwrite;

  const exportModel = {
    enabled: true,
    dir: path.join(outputDir, "_model"),
    only: options.exportModel?.only ?? toolEnv.build.exportModel.only,
  };
  const exportDir = exportModel.dir;

  // Pull the previous exported model to carry over timestamps when hashes match
  const previousState = await loadPreviousState(exportDir).catch(() => ({
    collections: {},
    entries: {},
    blocks: {},
  }));

  const pluginContextBase: PluginContext = {
    rootDir,
    env: toolEnv,
    logger: scoped,
    readContent,
    exportDir,
    pluginId: "",
  };
  await runOnInit(
    plugins.map((p, idx) => ({ ...p, pluginId: p.pluginId ?? `plugin_${idx + 1}` })),
    pluginContextBase
  );

  let scannedSiteWithPlugins = scannedSite;
  if (plugins.length) {
    scannedSiteWithPlugins = await runOnScan(
      plugins,
      scannedSite,
      pluginContextBase
    );
  }

  const collectionsList = scannedSiteWithPlugins.collections ?? [];
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
  // Handle existing output directory according to policy
  if (overwrite === "replace-all") {
    try {
      await rm(outputDir, { recursive: true, force: true });
      const stillThere = await stat(outputDir).then(() => true).catch(() => false);
      if (stillThere) {
        scoped.error("build.cleanOutputDirFailed", {
          outputDir,
          error: "Directory still exists after removal attempt",
        });
        throw new Error(`Could not remove output directory ${outputDir}`);
      }
      scoped.info("build.cleanOutputDir", { outputDir });
    } catch (err: any) {
      scoped.error("build.cleanOutputDirFailed", {
        outputDir,
        error: String(err),
      });
      throw err;
    }
  }

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

  const resolvedSite = await resolveBlocks(scannedSiteWithPlugins, {
    rootDir,
    readContent,
    logger: scoped.child("resolve"),
    remarkPlugins: toolEnv.markdown.remarkPlugins,
    toolEnv,
  });

  let resolvedSiteWithPlugins = resolvedSite;
  if (plugins.length) {
    // Run post-resolution site hooks
    resolvedSiteWithPlugins = await runOnResolved(
      plugins,
      resolvedSite,
      pluginContextBase
    );
    // Transform blocks then entries so hooks can mutate before timestamps
    if (resolvedSiteWithPlugins.collections) {
      const updatedCollections = [] as typeof resolvedSiteWithPlugins.collections;
      for (const collection of resolvedSiteWithPlugins.collections) {
        const updatedEntries = [] as typeof collection.entries;
        for (const entry of collection.entries) {
          const updatedBlocks = await runTransformBlocks(
            plugins,
            collection,
            entry,
            pluginContextBase
          );
          const entryWithBlocks: Entry = { ...entry, blocks: updatedBlocks };
          const updatedEntry = await runTransformEntry(
            plugins,
            collection,
            entryWithBlocks,
            pluginContextBase
          );
          updatedEntries.push(updatedEntry);
        }
        updatedCollections.push({ ...collection, entries: updatedEntries });
      }
      resolvedSiteWithPlugins = { ...resolvedSiteWithPlugins, collections: updatedCollections };
    }
  }

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

  const siteWithInternalLinks = await rewriteInternalLinks({
    site: resolvedSiteWithPlugins,
    remarkPlugins: toolEnv.markdown.remarkPlugins,
    logger: scoped,
  });

  const resolvedSiteWithHistory = await applyHistory(siteWithInternalLinks, {
    previous: previousState,
    rootDir,
    readContent,
  });

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
      "createdAt",
      "updatedAt",
      "fingerprint",
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
    ...resolvedSiteWithHistory,
    collections: resolvedSiteWithHistory.collections?.map((collection) => {
      const { entries, ...rest } = collection;
      const entrySummaries = entries.map((entry) => ({
        id: entry.id,
        rawName: entry.rawName,
        path: entry.path,
        name: entry.name,
        slug: entry.slug,
        route: entry.route,
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
    await writeFile(
      path.join(exportDir, "site.json"),
      JSON.stringify(orderKeys(siteSummary), null, 2),
      "utf8"
    );

    const entriesDir = path.join(exportDir, "entries");
    await mkdir(entriesDir, { recursive: true });

    if (resolvedSiteWithHistory.collections) {
      for (const collection of resolvedSiteWithHistory.collections) {
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

  // Prepare Handlebars template (site overrides take precedence over tool fallback).
  const templateRenderer = await createTemplateRenderer({
    rootDir,
    defaultWrapperName: toolEnv.templates.defaultWrapper,
    defaultLayoutName: toolEnv.templates.defaultLayout,
    templatesRoot: toolEnv.templates.root,
    logger: scoped.child("templates"),
    plugins,
    pluginContext: pluginContextBase,
  });

  const renderBaseContext = {
    model: resolvedSiteWithHistory,
    // Expose site timestamps/fingerprint directly on `site` for templates
    site: {
      ...resolvedSiteWithHistory.site,
      createdAt: resolvedSiteWithHistory.createdAt,
      updatedAt: resolvedSiteWithHistory.updatedAt,
      fingerprint: resolvedSiteWithHistory.fingerprint,
    },
    collections: resolvedSiteWithHistory.collections ?? [],
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

    const exportSegment = path
      .relative(outputDir, exportDir)
      .replace(/^[/\\]+/, "");

    const assetSegments = [
      toolEnv.images.outputDir,
      toolEnv.audio.outputDir,
      toolEnv.video.outputDir,
      exportSegment,
    ]
      .map((seg) => seg.replace(/^[/\\]+/, ""))
      .filter(Boolean);

    const dirsToCover = new Set<string>();
    const addDir = (dirPath: string) => dirsToCover.add(path.normalize(dirPath));

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
      addDir(baseDir);

      // add ancestors between outputDir and baseDir (e.g., assets/)
      const normalizedOutput = path.normalize(outputDir);
      let parent = path.dirname(baseDir);
      while (parent && path.normalize(parent) !== normalizedOutput) {
        addDir(parent);
        const nextParent = path.dirname(parent);
        if (nextParent === parent) break;
        parent = nextParent;
      }

      for (const dirPath of await walkDirs(baseDir)) {
        addDir(dirPath);
      }
    }

    for (const dirPath of Array.from(dirsToCover)) {
      const rel = path.relative(outputDir, dirPath).replace(/\\+/g, "/");
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
    }
  };

  const writeRootHtaccessFile = async () => {
    if (!writeHtaccess) return;
    const htaccessPath = path.join(outputDir, ".htaccess");
    const lines = [
      "# Generated by Webette. Adjust as needed for your hosting.",
      "ErrorDocument 404 /404.html",
      "Options -Indexes",
      "# Block access to the exported model directory",
      "RedirectMatch 403 ^/_model(/|$)",
      "",
    ].join("\n");
    await writeFile(htaccessPath, lines, "utf8");
    scoped.debug("build.fileGenerated", { path: htaccessPath });
  };

  const writeNginxSampleFile = async () => {
    if (!shouldWriteNginxSample) return;
    const nginxPath = path.join(outputDir, "nginx.conf");
    const serverBlock = [
      "# Sample Nginx config generated by Webette.",
      "# Replace `root`/`server_name` to match your setup.",
      "server {",
      "  listen 80;",
      "  server_name _;",
      `  root ${outputDir.replace(/\\/g, "/")};`,
      "  index index.html;",
      "  error_page 404 /404.html;",
      "",
      "  location / {",
      "    try_files $uri $uri/ /404.html;",
      "  }",
      "",
      "  location /assets/ {",
      "    autoindex off;",
      "  }",
      "",
      "  location /_model/ {",
      "    return 403;",
      "  }",
      "}",
      "",
    ].join("\n");
    await writeFile(nginxPath, serverBlock, "utf8");
    scoped.debug("build.fileGenerated", { path: nginxPath });
  };

  // Prune orphaned outputs when not wiping everything (overwrite !== replace-all)
  const pruneOrphans = async () => {
    if (overwrite === "replace-all") return;

    scoped.info("build.outputPruneStarted");

    const expectedOutputs = new Set<string>();
    const addOutput = (relPath: string | undefined) => {
      if (!relPath) return;
      const normalized = relPath.replace(/^[/\\]+/, "");
      if (normalized) expectedOutputs.add(path.normalize(normalized));
    };

    // Export model files
    const exportRel = path.relative(outputDir, exportDir);
    addOutput(path.join(exportRel, "site.json"));
    for (const collection of resolvedSiteWithHistory.collections ?? []) {
      const colDir = path.join(exportRel, "entries", collection.slug || collection.id);
      for (const entry of collection.entries) {
        addOutput(path.join(colDir, `${entry.slug || entry.id}.json`));
      }
    }

    // Entry pages
    const addEntryPage = (entry: Entry, collection: Collection) => {
      const routeRelative = entry.route
        ? entry.route.replace(/^\/+/, "")
        : path.join(collection.slug || collection.id, entry.slug || entry.id);
      addOutput(path.join(routeRelative, "index.html"));
    };

    // Collection indexes + root + 404
    if (generateIndex) {
      addOutput("index.html");
      for (const collection of resolvedSiteWithHistory.collections ?? []) {
        const routeRelative = collection.route
          ? collection.route.replace(/^\/+/, "").replace(/\/+$/, "")
          : collection.slug || collection.id;
        const collectionIndex = routeRelative ? path.join(routeRelative, "index.html") : "index.html";
        addOutput(collectionIndex);
      }
    }
    addOutput("404.html");
    if (writeHtaccess) addOutput(".htaccess");
    if (shouldWriteNginxSample) addOutput("nginx.conf");

    // Assets from blocks (routes + variants)
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

    for (const collection of resolvedSiteWithHistory.collections ?? []) {
      for (const entry of collection.entries) {
        collectBlocks(entry.blocks);
        addEntryPage(entry, collection);
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
    const toDelete = existingFiles.filter(
      (file) => !expectedOutputs.has(file.replace(/^[/\\]+/, ""))
    );

    for (const rel of toDelete) {
      const abs = path.join(outputDir, rel);
      try {
        await rm(abs, { force: true });
        scoped.info("build.outputPruned", { path: abs });
      } catch {
        // ignore failures silently
      }
    }
  };

  await pruneOrphans();

  let renderedPages = 0;

  if (resolvedSiteWithHistory.collections) {
    for (const collection of resolvedSiteWithHistory.collections) {
      for (const entry of collection.entries) {
    const entryRouteRelative = entry.route
      ? entry.route.replace(/^\/+/, "")
      : path.join(collection.slug || collection.id, entry.slug || entry.id);

    // Filter out blocks marked skipRender (e.g., listed in ignore.webt) for the automatic rendering path.
    const filterRenderableBlocks = (blocks: Block[]): Block[] =>
      blocks
        .filter((b) => !b.skipRender)
        .map((b) => ({
          ...b,
          ...(b.subBlocks ? { subBlocks: filterRenderableBlocks(b.subBlocks) } : {}),
        }));

    const entryForRender: Entry = {
      ...entry,
      blocks: filterRenderableBlocks(entry.blocks),
    };

    const context = {
      ...renderBaseContext,
      collection,
      entry: entryForRender,
      blocks: entryForRender.blocks,
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
    for (const collection of resolvedSiteWithHistory.collections ?? []) {
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

  // Static 404 page (always generated)
  {
    const notFoundContext = {
      ...renderBaseContext,
      layoutName: notFoundLayoutName,
      entry: { name: "Not found", route: "/404" },
    };
    const notFoundHtml = templateRenderer.render(notFoundContext);
    const notFoundPath = path.join(outputDir, "404.html");
    await mkdir(path.dirname(notFoundPath), { recursive: true });
    const finalNotFoundHtml = await formatHtml(notFoundHtml, notFoundPath);
    await writeFile(notFoundPath, finalNotFoundHtml, "utf8");
    scoped.debug("build.fileGenerated", { path: notFoundPath });
  }

  await writeRootHtaccessFile();
  await writeNginxSampleFile();
  await protectAssetDirs();

  if (options.quiet) {
    scoped.debug("build.success", { path: outputDir, pages: renderedPages });
  } else {
    scoped.info("build.success", { path: outputDir, pages: renderedPages });
  }
}
