/**
 * HTML rendering stage.
 *
 * Renders entry pages, optional indexes, and a static `404.html`.
 */

import { mkdir } from "node:fs/promises";
import * as path from "node:path";
import type { Logger } from "../../logging/logger";
import type { WebetteEnv } from "../../config/env";
import type { Collection, Entry, Site, Block } from "../model";
import { resolveTemplatesRoots } from "../template";
import { createTemplateFileResolver } from "../templates/resolve-file";
import { getPrevNextEntry } from "./prev-next";

type TemplateRenderer = {
  render: (context: Record<string, unknown>) => string;
};

export async function renderSite(options: {
  rootDir: string;
  outputDir: string;
  env: WebetteEnv;
  site: Site;
  templatesDefault: WebetteEnv["templates"]["default"];
  templatesCustom?: {
    index?: {
      root?: string;
      collections?: string;
      collection?: Record<string, string>;
    };
    entry?: Record<string, string>;
  };
  siteTemplatesRoot?: string;
  includeDrafts: boolean;
  generateIndex: boolean;
  layoutPartialName: string;
  accessForbiddenLayoutName: string;
  notFoundLayoutName: string;
  writeIfChanged: (targetPath: string, content: string) => Promise<boolean>;
  formatHtml: (rawHtml: string, targetPath: string) => Promise<string>;
  templateRenderer: TemplateRenderer;
  renderBaseContext: Record<string, unknown>;
  logger: Logger;
}): Promise<{ renderedPages: number }> {
  const {
    rootDir,
    outputDir,
    env,
    site,
    templatesDefault,
    templatesCustom,
    siteTemplatesRoot,
    includeDrafts,
    generateIndex,
    layoutPartialName,
    accessForbiddenLayoutName,
    notFoundLayoutName,
    writeIfChanged,
    formatHtml,
    templateRenderer,
    renderBaseContext,
    logger,
  } = options;

  let renderedPages = 0;

  const layoutNameFor = (value: string): string => path.parse(value).name || value;

  const filterRenderableBlocks = (blocks: Block[]): Block[] =>
    blocks
      .filter((b) => !b.skipRender)
      .map((b) => ({
        ...b,
        ...(b.subBlocks ? { subBlocks: filterRenderableBlocks(b.subBlocks) } : {}),
      }));

  const entryLayoutOverrides =
    templatesCustom?.entry && Object.keys(templatesCustom.entry).length
      ? templatesCustom.entry
      : undefined;

  const entryCollectionById = new Map<string, Collection>();
  for (const collection of site.collections ?? []) {
    for (const entry of collection.entries) {
      entryCollectionById.set(entry.id, collection);
    }
  }

  const templatesRootsForLayouts = await resolveTemplatesRoots({
    rootDir,
    templatesRoot: env.templates.root,
    siteTemplatesRoot,
    logger,
  });
  const fileResolver = createTemplateFileResolver({
    rootDir,
    templatesRoots: templatesRootsForLayouts,
    logger,
  });

  const loggedEntryLayouts = new Set<string>();
  const warnedEntryLayouts = new Set<string>();

  const pickEntryLayoutName = async (
    entry: Entry,
    renderCollection: Collection | undefined
  ): Promise<string> => {
    if (!entryLayoutOverrides) return layoutPartialName;
    const sourceCollection = entryCollectionById.get(entry.id) ?? renderCollection;
    if (!sourceCollection) return layoutPartialName;

    const key = `${sourceCollection.slug || sourceCollection.id}/${entry.slug || entry.id}`;
    const overridePath = entryLayoutOverrides[key];
    if (!overridePath) return layoutPartialName;

    const resolved = await fileResolver.resolve(overridePath);
    if (resolved) {
      if (!loggedEntryLayouts.has(overridePath)) {
        loggedEntryLayouts.add(overridePath);
        await fileResolver.logResolved({
          kind: "entry.layout",
          relPath: overridePath,
          extra: { key },
        });
      }
      return layoutNameFor(overridePath);
    }

    if (!warnedEntryLayouts.has(overridePath)) {
      warnedEntryLayouts.add(overridePath);
      logger.warn("template.notFound", { paths: fileResolver.triedPaths(overridePath).join(", ") });
    }

    return layoutPartialName;
  };

  const renderEntryTo = async (
    entry: Entry,
    collection: Collection | undefined,
    targetDir: string
  ): Promise<boolean> => {
    const renderableBlocks = filterRenderableBlocks(entry.blocks);
    const layoutName = await pickEntryLayoutName(entry, collection);
    const { prevEntry, nextEntry } = getPrevNextEntry({
      site,
      entry,
      renderCollection: collection,
      includeDrafts,
    });
    const context = {
      ...renderBaseContext,
      layoutName,
      ...(collection ? { collection } : {}),
      entry,
      blocks: renderableBlocks,
      ...(prevEntry ? { prevEntry } : {}),
      ...(nextEntry ? { nextEntry } : {}),
    };

    const html = templateRenderer.render(context);
    await mkdir(targetDir, { recursive: true });
    const entryIndexPath = path.join(targetDir, "index.html");
    const finalHtml = await formatHtml(html, entryIndexPath);
    return writeIfChanged(entryIndexPath, finalHtml);
  };

  // Entry pages
  for (const entry of site.rootEntries ?? []) {
    if (!includeDrafts && entry.isDraft) continue;
    if (entry.isIndex) continue;

    const entryRouteRelative = entry.route
      ? entry.route.replace(/^\/+/, "")
      : (entry.slug || entry.id);
    const entryOutputDir = path.join(outputDir, entryRouteRelative);

    const wrote = await renderEntryTo(entry, undefined, entryOutputDir);
    if (wrote) renderedPages += 1;
  }

  for (const collection of site.collections ?? []) {
    for (const entry of collection.entries) {
      if (!includeDrafts && entry.isDraft) continue;
      if (entry.isIndex) continue;

      const entryRouteRelative = entry.route
        ? entry.route.replace(/^\/+/, "")
        : path.join(collection.slug || collection.id, entry.slug || entry.id);
      const entryOutputDir = path.join(outputDir, entryRouteRelative);

      const wrote = await renderEntryTo(entry, collection, entryOutputDir);
      if (wrote) renderedPages += 1;
    }
  }

  // Indexes
  if (generateIndex) {
    const pickIndexLayout = async (kind: string, candidates: string[]): Promise<string> => {
      const triedPaths: string[] = [];
      for (const candidate of candidates) {
        if (!candidate) continue;
        triedPaths.push(...fileResolver.triedPaths(candidate));
        const resolved = await fileResolver.logResolved({ kind, relPath: candidate });
        if (resolved) return layoutNameFor(candidate);
      }
      if (triedPaths.length) {
        logger.warn("template.notFound", { paths: triedPaths.join(", ") });
      }
      return layoutNameFor(templatesDefault.index);
    };

    const customIndex = templatesCustom?.index;

    // Root index
    const rootIndexLayoutName = await pickIndexLayout("index.root", [
      customIndex?.root ?? "",
      templatesDefault.index,
    ]);

    const visibleCollections = (site.collections ?? [])
      .filter((collection) => !collection.isUnlisted)
      .map((collection) => ({
        ...collection,
        entries: collection.entries.filter((entry) => !entry.isUnlisted),
      }));

    const rootIndexEntry = site.indexes?.root;
    const rootContext = {
      ...renderBaseContext,
      layoutName: rootIndexLayoutName,
      entry: rootIndexEntry ? { ...rootIndexEntry, route: "/" } : { name: "Index", route: "/" },
      ...(rootIndexEntry ? { blocks: filterRenderableBlocks(rootIndexEntry.blocks) } : {}),
      ...(site.rootEntries
        ? {
            rootEntries: site.rootEntries.filter(
              (entry) => !entry.isUnlisted && (includeDrafts || !entry.isDraft)
            ),
          }
        : {}),
      collections: visibleCollections,
    };
    const rootHtml = templateRenderer.render(rootContext);
    const rootIndexPath = path.join(outputDir, "index.html");
    await mkdir(path.dirname(rootIndexPath), { recursive: true });
    const finalRootHtml = await formatHtml(rootHtml, rootIndexPath);
    await writeIfChanged(rootIndexPath, finalRootHtml);

    // Collection indexes
    for (const collection of site.collections ?? []) {
      if (collection.isUnlisted) {
        const routeRelative = collection.route
          ? collection.route.replace(/^\/+/, "").replace(/\/+$/, "")
          : collection.slug || collection.id;
        const collectionIndexDir = routeRelative ? path.join(outputDir, routeRelative) : outputDir;
        const collectionIndexPath = path.join(collectionIndexDir, "index.html");

        const forbiddenContext = {
          ...renderBaseContext,
          layoutName: accessForbiddenLayoutName,
          entry: {
            name: "Access forbidden",
            route: collection.route ?? `/${collection.slug || collection.id}`,
          },
          collection,
        };
        const forbiddenHtml = templateRenderer.render(forbiddenContext);
        await mkdir(collectionIndexDir, { recursive: true });
        const finalForbidden = await formatHtml(forbiddenHtml, collectionIndexPath);
        await writeIfChanged(collectionIndexPath, finalForbidden);
        continue;
      }

      const visibleEntries = collection.entries.filter((entry) => !entry.isUnlisted);
      const collectionForIndex = { ...collection, entries: visibleEntries };

      const indexEntries = site.indexes?.collections ?? {};
      const indexEntry = indexEntries[collection.slug || collection.id];

      const collectionIndexLayoutName = await pickIndexLayout(
        `index.collection.${collection.slug || collection.id}`,
        [
          customIndex?.collection?.[collection.slug || collection.id] ?? "",
          customIndex?.collections ?? "",
          templatesDefault.index,
        ]
      );
      const routeRelative = collection.route
        ? collection.route.replace(/^\/+/, "").replace(/\/+$/, "")
        : collection.slug || collection.id;
      const collectionIndexDir = routeRelative ? path.join(outputDir, routeRelative) : outputDir;
      const collectionIndexPath = path.join(collectionIndexDir, "index.html");

      const ctx = {
        ...renderBaseContext,
        layoutName: collectionIndexLayoutName,
        entry: indexEntry
          ? { ...indexEntry, route: collection.route ?? `/${collection.slug || collection.id}/` }
          : { name: collection.name, route: collection.route },
        collection: collectionForIndex,
        entries: visibleEntries,
        ...(indexEntry ? { blocks: filterRenderableBlocks(indexEntry.blocks) } : {}),
      };
      const colHtml = templateRenderer.render(ctx);
      await mkdir(collectionIndexDir, { recursive: true });
      const finalColHtml = await formatHtml(colHtml, collectionIndexPath);
      await writeIfChanged(collectionIndexPath, finalColHtml);
    }
  }

  // Static 404 (always)
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
    await writeIfChanged(notFoundPath, finalNotFoundHtml);
  }

  return { renderedPages };
}
