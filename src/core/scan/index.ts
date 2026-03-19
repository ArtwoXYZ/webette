/**
 * Filesystem scan orchestration.
 * The recursive structure (`site.structure`) is the source of truth; flat views are derived.
 */

import { getEnv } from "../../config/env";
import { resolveRoutes } from "../routes";
import type {
  Site,
} from "../model";
import { SiteModelTransformer } from "../transformations/site-model-transformer";
import type { Logger } from "../../logging/logger";

import { resolveTemplatesConfig } from "../templates/config";
import { buildStructureRoot, deriveFlatRawViewsFromStructure } from "./derived-views";
import { buildConfigIndex, enrichCollections, enrichEntries } from "./enrich";
import { listRootIndexRaw, listStructureRootRaw } from "./raw-scan";
import { isIndexFolderName, normalizeIndexFolderName } from "./utils";

export async function scanSite(site: Site, logger?: Logger): Promise<Site> {
  const { env: toolEnv } = await getEnv();
  const siteTreatTxtAsMarkdown = site?.config?.markdown?.treatTxtAsMarkdown;
  // Site can opt out of the default ".txt as markdown" behavior; default is true.
  const treatTxtAsMarkdown =
    typeof siteTreatTxtAsMarkdown === "boolean" ? siteTreatTxtAsMarkdown : true;

  const { siteTemplatesRoot } = resolveTemplatesConfig(
    toolEnv.templates,
    site.config?.templates
  );
  const resolvedSiteTemplatesRoot = siteTemplatesRoot ?? toolEnv.templates.root;
  const indexFolderName = normalizeIndexFolderName(
    (site.site as Record<string, unknown> | undefined)?.indexFolderName
  );

  const rootIndexRaw = await listRootIndexRaw(
    site.rootDir,
    resolvedSiteTemplatesRoot,
    toolEnv.build.outputDirName,
    toolEnv.logging.dirName,
    indexFolderName,
    { treatTxtAsMarkdown },
    logger
  );

  const structureRootRaw = await listStructureRootRaw({
    rootDir: site.rootDir,
    siteTemplatesRoot: resolvedSiteTemplatesRoot,
    outputDirName: toolEnv.build.outputDirName,
    loggingDirName: toolEnv.logging.dirName,
    indexFolderName,
    treatTxtAsMarkdown,
    logger,
  });
  const structure = buildStructureRoot({
    children: structureRootRaw.children,
    ignoredFolders: structureRootRaw.ignoredFolders,
  });

  // The recursive structure is the source of truth; `collections`/`rootEntries`
  // remain derived flat views for consumers that still expect them.
  const { collections: rawCollections, rootEntries: rawRootEntries } =
    await deriveFlatRawViewsFromStructure({
      rootDir: site.rootDir,
      rootNodes: structureRootRaw.children,
    });

  // Pass 2+3: apply config then enrich
  const configIndex = buildConfigIndex(site);
  const collections = enrichCollections(rawCollections, configIndex).map((collection) => {
    const entries = collection.entries.map((entry) => ({
      ...entry,
      ...(isIndexFolderName(entry.rawName, indexFolderName) ? { isIndex: true } : {}),
    }));
    return { ...collection, entries };
  });
  const rootEntries = enrichEntries(rawRootEntries).map((entry) => ({
    ...entry,
    ...(isIndexFolderName(entry.rawName, indexFolderName) ? { isIndex: true } : {}),
  }));

  const rootIndexEntry = (() => {
    if (!rootIndexRaw) return undefined;
    const [enriched] = enrichEntries([rootIndexRaw]);
    if (!enriched) return undefined;
    return { ...enriched, isIndex: true };
  })();

  // Build the scanned site using SiteModelTransformer for clean architecture
  const scannedSite = SiteModelTransformer.fromPartialUpdate(site, {
    structure,
    ...(rootEntries.length ? { rootEntries } : {}),
    collections,
    ...(rootIndexEntry ? { indexes: { root: rootIndexEntry } } : {}),
  }).build();

  return resolveRoutes(scannedSite);
}
