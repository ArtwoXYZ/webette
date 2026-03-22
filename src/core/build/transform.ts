/**
 * Build phase 5: content resolution and transformation.
 *
 * Copies template assets, resolves blocks, runs plugin transforms,
 * rewrites internal links/images, applies history and sorting,
 * resolves system slug collisions.
 */

import { stat } from 'node:fs/promises'
import * as path from 'node:path'
import { resolveBlocks } from '../resolve'
import { SiteModelTransformer } from '../site-model-transformer'
import { rewriteInternalLinks } from '../postprocess/markdown-links'
import { rewriteInternalImages } from '../postprocess/markdown-images'
import { applyHistory, loadPreviousState } from '../export/history'
import {
  runOnResolved,
  runTransformBlocks,
  runTransformEntry,
} from '../../plugins/runner'
import { copyDirectory, rmWithRetries } from '../../utils/fs'
import { resolveCollectionAssets } from './utils/collection-assets'
import { applySorting } from './utils/sorting'
import { resolveSystemSlugCollisions } from './utils/resolve-system-slugs'
import type { Collection, Entry } from '../model'
import type { BuildConfig, PluginResult, ScanResult, TransformResult } from './types'

export async function resolveAndTransform(
  config: BuildConfig,
  pluginResult: PluginResult,
  scanResult: ScanResult,
): Promise<TransformResult> {
  const {
    rootDir,
    scoped,
    options,
    toolEnv,
    readContent,
    remarkPlugins,
    siteTemplatesRoot,
    templatesAssets,
    assetsBaseRelative,
    outputDir,
    tagsConfig,
  } = config
  const { plugins, pluginContextBase, pluginReservedRoutes } = pluginResult

  const previousState = await loadPreviousState(config.exportModel.dir).catch(() => ({
    collections: {},
    entries: {},
    blocks: {},
  }))

  // Copy template assets
  if (templatesAssets && assetsBaseRelative) {
    const rootValue = siteTemplatesRoot ?? toolEnv.templates.root
    const templatesRoot = path.isAbsolute(rootValue) ? rootValue : path.join(rootDir, rootValue)
    const assetsSourceDir = path.isAbsolute(templatesAssets.dir)
      ? templatesAssets.dir
      : path.join(templatesRoot, templatesAssets.dir)
    const assetsTargetDir = path.join(outputDir, assetsBaseRelative)
    const assetsSourceExists = await stat(assetsSourceDir)
      .then((s) => s.isDirectory())
      .catch(() => false)
    if (assetsSourceExists) {
      try {
        await rmWithRetries(assetsTargetDir, { recursive: true, force: true })
      } catch (err) {
        scoped.warn('build.assetsCleanupFailed', {
          path: assetsTargetDir,
          error: String(err),
        })
        if (options.liveReload !== true) {
          throw err
        }
      }
      await copyDirectory(assetsSourceDir, assetsTargetDir)
    }
  }

  const siteWithAssets = await resolveCollectionAssets({
    rootDir,
    site: scanResult.scannedSite,
    toolEnv,
    readContent,
    logger: scoped.child('assets'),
  })

  const resolvedSite = await resolveBlocks(siteWithAssets, {
    rootDir,
    readContent,
    logger: scoped.child('resolve'),
    remarkPlugins,
    toolEnv,
  })

  let resolvedSiteWithPlugins = resolvedSite
  if (plugins.length) {
    resolvedSiteWithPlugins = await runOnResolved(plugins, resolvedSite, pluginContextBase)
    if (resolvedSiteWithPlugins.collections || resolvedSiteWithPlugins.rootEntries) {
      const updatedCollections = [] as NonNullable<typeof resolvedSiteWithPlugins.collections>
      const rootCollectionForTransforms: Collection = {
        id: '__root__',
        rawName: '(root)',
        name: 'Root',
        slug: 'root',
        path: '',
        route: '/',
        entries: [],
      }
      const transformEntryWithPlugins = async (
        collection: Collection,
        entry: Entry,
      ): Promise<Entry> => {
        const updatedBlocks = await runTransformBlocks(
          plugins,
          collection,
          entry,
          pluginContextBase,
        )
        const entryWithBlocks: Entry = { ...entry, blocks: updatedBlocks }
        return runTransformEntry(plugins, collection, entryWithBlocks, pluginContextBase)
      }
      for (const collection of resolvedSiteWithPlugins.collections ?? []) {
        const updatedEntries = [] as typeof collection.entries
        for (const entry of collection.entries) {
          const updatedEntry = await transformEntryWithPlugins(collection, entry)
          updatedEntries.push(updatedEntry)
        }
        updatedCollections.push({ ...collection, entries: updatedEntries })
      }

      const updatedRootEntries = resolvedSiteWithPlugins.rootEntries
        ? await Promise.all(
          resolvedSiteWithPlugins.rootEntries.map((entry) =>
            transformEntryWithPlugins(rootCollectionForTransforms, entry)
          )
        )
        : undefined

      let nextIndexes = resolvedSiteWithPlugins.indexes
      if (nextIndexes?.collections && updatedCollections.length) {
        const collectionByKey = new Map(
          updatedCollections.map((collection) => [collection.slug || collection.id, collection]),
        )
        const updatedCollectionIndexes = Object.fromEntries(
          await Promise.all(
            Object.entries(nextIndexes.collections).map(async ([key, entry]) => {
              const collection = collectionByKey.get(key)
              if (!collection) return [key, entry]
              const updatedEntry = await transformEntryWithPlugins(collection, entry)
              return [key, updatedEntry]
            }),
          ),
        )
        nextIndexes = { ...nextIndexes, collections: updatedCollectionIndexes }
      }

      resolvedSiteWithPlugins = SiteModelTransformer.fromPartialUpdate(resolvedSiteWithPlugins, {
        ...(resolvedSiteWithPlugins.collections ? { collections: updatedCollections } : {}),
        ...(updatedRootEntries ? { rootEntries: updatedRootEntries } : {}),
        ...(nextIndexes ? { indexes: nextIndexes } : {}),
      }).build()
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
    : ''

  const siteWithInternalLinks = await rewriteInternalLinks({
    site: resolvedSiteWithPlugins,
    remarkPlugins,
    logger: scoped,
  })
  const siteWithInternalImages = await rewriteInternalImages({
    site: siteWithInternalLinks,
    remarkPlugins,
    logger: scoped,
  })

  const resolvedSiteWithHistory = await applyHistory(siteWithInternalImages, {
    previous: previousState,
    rootDir,
    readContent,
  })
  const sortedSite = applySorting(resolvedSiteWithHistory, scoped.child('sorting'))

  const finalSite = tagsConfig.anyPageEnabled || pluginReservedRoutes.length > 0
    ? resolveSystemSlugCollisions(sortedSite, scoped, pluginReservedRoutes)
    : sortedSite

  return { finalSite, liveReloadScript }
}
