/**
 * Webette build pipeline entrypoint.
 *
 * Orchestrates the main steps (scan -> resolve -> render -> write output).
 */

import { mkdir, stat } from 'node:fs/promises'
import * as path from 'node:path'
import { getEnv, resolveLocale } from '../config/env'
import { t } from '../logging/i18n'
import { createSite } from './config'
import { scanSite } from './scan'
import { resolveBlocks } from './resolve'
import { createTemplateRenderer } from './template'
import type { Block, Entry, Collection, Site } from './model'
import type { Logger } from '../logging/logger'
import { applyHistory, loadPreviousState } from './export/history'
import { loadPlugins } from '../plugins/loader'
import {
  runOnInit,
  runOnResolved,
  runOnScan,
  runTransformBlocks,
  runTransformEntry,
} from '../plugins/runner'
import type { PluginContext } from '../plugins/types'
import { SiteModelTransformer } from './transformations/site-model-transformer'
import { rewriteInternalLinks } from './postprocess/markdown-links'
import { rewriteInternalImages } from './postprocess/markdown-images'
import { writeSitemap } from './sitemap'
import { resolveTemplatesConfig } from './templates/config'
import { copyDirectory, rmWithRetries, writeIfChanged as writeIfChangedFs } from '../utils/fs'
import { resolveCollectionAssets } from './build/collection-assets'
import { countDraftEntries, filterDraftEntries, listDraftEntries } from './build/drafts'
import { formatHtml as formatHtmlFs } from './build/html'
import { extractIndexFolders } from './build/index-folders'
import { protectAssetDirs } from './build/protect-assets'
import { applySorting } from './build/sorting'
import { writeModelExport } from './export/write-model'
import { collectProtectedDirs, createExpectedOutputsRegistry, pruneOrphans } from './build/prune'
import { renderSite } from './build/render'
import { buildIcons } from './build/icons'
import { writeNginxSampleFile, writeRootHtaccessFile } from './build/server-files'

export interface BuildOptions {
  verbose: boolean
  liveReload?: boolean // enabled only in "serve" mode
  quiet?: boolean // new: fewer logs when true
  includeDrafts?: boolean // keep draft entries (serve); ignored in build
  exportModel?: {
    only?: boolean
  }
  readContent?: boolean // allow skipping content resolution when requested
  prettyPrint?: boolean
  generateIndex?: boolean
  protectAssets?: boolean
  writeHtaccess?: boolean
  writeNginxSample?: boolean
}

function countBlocks(blocks: Block[] = []): number {
  return blocks.reduce(
    (total, block) => total + 1 + (block.subBlocks ? countBlocks(block.subBlocks) : 0),
    0,
  )
}

function normalizeAssetsBase(raw: string): string {
  const trimmed = raw.trim()
  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return withLeading.replace(/\/+$/, '')
}

export async function build(rootDir: string, options: BuildOptions, logger: Logger): Promise<void> {
  const scoped = logger.child('build')

  const writeIfChanged = async (targetPath: string, content: string): Promise<boolean> =>
    writeIfChangedFs(targetPath, content, scoped)

  const pluginExpected = createExpectedOutputsRegistry()
  const registerExpectedOutput = pluginExpected.addExpectedOutput
  const registerExpectedDir = pluginExpected.addExpectedDir

  const toolEnv = await getEnv()
  const locale = resolveLocale(toolEnv)
  const buildTime = new Date()
  const prettyPrint =
    typeof options.prettyPrint === 'boolean' ? options.prettyPrint : toolEnv.build.prettyPrint
  // Serve shows drafts by default; build always strips them.
  const includeDrafts = options.liveReload
    ? (options.includeDrafts ?? toolEnv.build.includeDrafts)
    : false
  const generateIndex =
    typeof options.generateIndex === 'boolean' ? options.generateIndex : toolEnv.build.generateIndex
  const protectAssets =
    typeof options.protectAssets === 'boolean' ? options.protectAssets : toolEnv.build.protectAssets
  const writeHtaccess =
    typeof options.writeHtaccess === 'boolean' ? options.writeHtaccess : toolEnv.build.writeHtaccess
  const shouldWriteNginxSample =
    typeof options.writeNginxSample === 'boolean'
      ? options.writeNginxSample
      : toolEnv.build.writeNginxSample

  scoped.debug('build.start', { rootDir })

  const site = await createSite(rootDir)
  const {
    templates,
    siteTemplatesRoot,
    assets: templatesAssets,
    custom: templatesCustom,
  } = resolveTemplatesConfig(toolEnv.templates, site.config?.templates)
  const rawTemplates =
    site.config?.templates && typeof site.config.templates === 'object'
      ? (site.config.templates as Record<string, unknown>)
      : undefined
  const configuredRoot =
    typeof rawTemplates?.root === 'string' && rawTemplates.root.trim()
      ? rawTemplates.root.trim()
      : undefined
  let siteTemplatesDir: string | undefined
  let siteRootExists = false
  if (configuredRoot) {
    siteTemplatesDir = path.isAbsolute(configuredRoot)
      ? configuredRoot
      : path.join(rootDir, configuredRoot)
    try {
      const rootStat = await stat(siteTemplatesDir)
      siteRootExists = rootStat.isDirectory()
      if (!siteRootExists) {
        scoped.warn('template.siteRootMissing', { path: siteTemplatesDir })
      }
    } catch {
      scoped.warn('template.siteRootMissing', { path: siteTemplatesDir })
    }
  } else {
    scoped.warn('template.siteRootNotConfigured', {})
  }

  const defaultConfig =
    rawTemplates?.default && typeof rawTemplates.default === 'object'
      ? (rawTemplates.default as Record<string, unknown>)
      : undefined
  const defaultKeys = Object.keys(templates.default) as Array<keyof typeof templates.default>
  const missingDefaults: string[] = []
  const missingFiles: string[] = []
  for (const key of defaultKeys) {
    const configuredValue = defaultConfig?.[key]
    if (typeof configuredValue !== 'string' || !configuredValue.trim()) {
      missingDefaults.push(key)
      continue
    }
    if (siteRootExists && siteTemplatesDir) {
      const filePath = path.join(siteTemplatesDir, configuredValue)
      try {
        const fileStat = await stat(filePath)
        if (!fileStat.isFile()) {
          missingFiles.push(`${key}:${filePath}`)
        }
      } catch {
        missingFiles.push(`${key}:${filePath}`)
      }
    }
  }
  if (missingDefaults.length) {
    scoped.warn('template.siteDefaultsMissing', {
      missing: missingDefaults.join(', '),
    })
  }
  if (missingFiles.length) {
    scoped.warn('template.siteDefaultsNotFound', {
      missing: missingFiles.join(', '),
    })
  }
  const layoutPartialName = path.parse(templates.default.layout).name || templates.default.layout
  const notFoundLayoutName =
    path.parse(templates.default.notFound).name || templates.default.notFound
  const accessForbiddenLayoutName =
    path.parse(templates.default.accessForbidden).name || templates.default.accessForbidden
  scoped.debug('build.siteLoaded', { title: site.site.title })

  const assetsBase = templatesAssets ? normalizeAssetsBase(templatesAssets.publicBase) : undefined
  const assetsBaseRelative = assetsBase ? assetsBase.replace(/^\/+/, '') : undefined
  if (assetsBaseRelative) {
    registerExpectedDir(assetsBaseRelative)
  }

  // Load plugins before scanning so they can be used during scan
  const plugins = await loadPlugins({
    rootDir,
    pluginPaths: Array.isArray(site.config?.plugins) ? (site.config?.plugins as string[]) : undefined,
    pluginsDir: typeof site.config?.plugins === 'object' && site.config.plugins !== null && typeof (site.config.plugins as { dir?: string }).dir === 'string' 
      ? (site.config.plugins as { dir: string }).dir 
      : undefined,
  })
  
  // Store plugin metadata in the site model before scanning
  if (plugins.length > 0) {
    site.plugins = plugins.map(plugin => ({
      id: plugin.pluginId,
      name: plugin.metadata?.name ?? plugin.pluginId,
      author: plugin.metadata?.author,
      license: plugin.metadata?.license,
      version: plugin.metadata?.version,
      folder: plugin.metadata?.folder ?? plugin.pluginId
    }));
    scoped.debug('build.pluginsStoredInSite', { count: site.plugins.length });
  }

  const scanLogger = scoped.child('scan')
  const scannedSiteRaw = await scanSite(site, scanLogger)
  const draftCount = countDraftEntries(scannedSiteRaw)
  if (draftCount > 0) {
    const logKey = includeDrafts ? 'build.drafts.included' : 'build.drafts.excluded'
    const logFn = includeDrafts ? scoped.info.bind(scoped) : scoped.warn.bind(scoped)
    logFn(logKey, { count: draftCount })
    if (!includeDrafts) {
      for (const draft of listDraftEntries(scannedSiteRaw)) {
        scoped.warn('build.draft.entrySkipped', draft)
      }
    }
  }
  const scannedSite = filterDraftEntries(scannedSiteRaw, includeDrafts)
  scoped.debug('build.pluginsLoaded', {
    count: plugins.length,
    ids: plugins.map((p) => p.pluginId),
  })
  const readContent =
    typeof options.readContent === 'boolean' ? options.readContent : toolEnv.build.readContent

  const outputDir = path.join(rootDir, toolEnv.build.outputDirName)
  // In liveReload (serve) mode, avoid full directory deletions to reduce EBUSY on Windows.
  const overwrite =
    options.liveReload === true
      ? ('replace-files' as typeof toolEnv.build.overwrite)
      : toolEnv.build.overwrite

  const exportModel = {
    dir: path.join(outputDir, '_model'),
    only: options.exportModel?.only ?? toolEnv.build.exportModel.only,
  }
  const exportDir = exportModel.dir

  // Pull the previous exported model to carry over timestamps when hashes match
  const previousState = await loadPreviousState(exportDir).catch(() => ({
    collections: {},
    entries: {},
    blocks: {},
  }))

  const pluginContextBase: PluginContext = {
    rootDir,
    env: toolEnv,
    logger: scoped,
    readContent,
    exportDir,
    pluginId: '',
    addExpectedOutput: registerExpectedOutput,
    addExpectedDir: registerExpectedDir,
    siteConfig: site.site, // Pass full site configuration
    pluginConfig: (site.config?.pluginConfig as Record<string, unknown> | undefined) ?? undefined, // Pass plugin-specific config
  }
  await runOnInit(
    plugins.map((p, idx) => ({ ...p, pluginId: p.pluginId ?? `plugin_${idx + 1}` })),
    pluginContextBase,
  )

  let scannedSiteWithPlugins = scannedSite
  if (plugins.length) {
    scannedSiteWithPlugins = await runOnScan(plugins, scannedSite, pluginContextBase)
  }

  const siteWithIndexFolders = extractIndexFolders(scannedSiteWithPlugins, {
    includeDrafts,
    logger: scoped.child('index'),
  })

  const collectionsList = siteWithIndexFolders.collections ?? []
  const rootEntriesList = siteWithIndexFolders.rootEntries ?? []
  const entriesCount = collectionsList.reduce(
    (acc, collection) => acc + collection.entries.length,
    0,
  ) + rootEntriesList.length

  if (readContent === false) {
    scoped.info('build.skipContent', {})
  }
  const blocksCount = collectionsList.reduce(
    (acc, collection) =>
      acc + collection.entries.reduce((entryAcc, entry) => entryAcc + countBlocks(entry.blocks), 0),
    0,
  ) + rootEntriesList.reduce((acc, entry) => acc + countBlocks(entry.blocks), 0)

  for (const collection of collectionsList) {
    if (!collection.entries.length) {
      scoped.warn('scan.collectionEmpty', {
        collection: collection.slug || collection.id,
        path: collection.path,
      })
    }
    for (const entry of collection.entries) {
      if (!entry.blocks.length) {
        scoped.warn('scan.entryEmpty', {
          collection: collection.slug || collection.id,
          entry: entry.slug || entry.id,
          path: entry.path,
        })
      }
    }
  }
  for (const entry of rootEntriesList) {
    if (!entry.blocks.length) {
      scoped.warn('scan.entryEmpty', {
        collection: '(root)',
        entry: entry.slug || entry.id,
        path: entry.path,
      })
    }
  }
  if (options.quiet) {
    scoped.debug('scan.summary', {
      collections: collectionsList.length,
      entries: entriesCount,
      blocks: blocksCount,
    })
  } else {
    scoped.info('scan.summary', {
      collections: collectionsList.length,
      entries: entriesCount,
      blocks: blocksCount,
    })
  }
  // Handle existing output directory according to policy
  if (overwrite === 'replace-all') {
    try {
      await rmWithRetries(outputDir, { recursive: true, force: true })
      const stillThere = await stat(outputDir)
        .then(() => true)
        .catch(() => false)
      if (stillThere) {
        scoped.error('build.cleanOutputDirFailed', {
          outputDir,
          error: 'Directory still exists after removal attempt',
        })
        throw new Error(`Could not remove output directory ${outputDir}`)
      }
      scoped.info('build.cleanOutputDir', { outputDir })
    } catch (err: any) {
      scoped.error('build.cleanOutputDirFailed', {
        outputDir,
        error: String(err),
      })
      throw err
    }
  }

  let outputDirExists = false
  try {
    const dirStat = await stat(outputDir)
    if (!dirStat.isDirectory()) {
      const message = t(locale, 'build.outputNotDirectory', { outputDir })
      scoped.error('build.outputNotDirectory', { outputDir })
      throw new Error(message)
    }
    outputDirExists = true
  } catch (err: any) {
    if (err?.code !== 'ENOENT') {
      scoped.error('build.mkdirFailed', {
        outputDir,
        error: String(err),
      })
      throw err
    }
  }

  if (outputDirExists) {
    scoped.debug('build.outputDirExists', { outputDir })
    switch (overwrite) {
      case 'none':
        scoped.error('build.overwriteDenied', { outputDir })
        throw new Error(t(locale, 'build.overwriteDenied', { outputDir }))
      case 'replace-all':
        await rmWithRetries(outputDir, { recursive: true, force: true })
        break
      case 'replace-files':
        // keep directory, individual files handled below
        break
      default:
        break
    }
  }

  try {
    await mkdir(outputDir, { recursive: true })
  } catch (err: any) {
    if (err?.code !== 'EEXIST') {
      scoped.error('build.mkdirFailed', {
        outputDir,
        error: String(err),
      })
      throw err
    }
    // Directory already exists: not fatal when recursive, continue
    scoped.debug('build.outputDirExists', { outputDir })
  }

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
    site: siteWithIndexFolders,
    toolEnv,
    readContent,
    logger: scoped.child('assets'),
  })

  const resolvedSite = await resolveBlocks(siteWithAssets, {
    rootDir,
    readContent,
    logger: scoped.child('resolve'),
    remarkPlugins: toolEnv.markdown.remarkPlugins,
    toolEnv,
  })

  let resolvedSiteWithPlugins = resolvedSite
  if (plugins.length) {
    // Run post-resolution site hooks
    resolvedSiteWithPlugins = await runOnResolved(plugins, resolvedSite, pluginContextBase)
    // Transform blocks then entries so hooks can mutate before timestamps
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
        : undefined;

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
    remarkPlugins: toolEnv.markdown.remarkPlugins,
    logger: scoped,
  })
  const siteWithInternalImages = await rewriteInternalImages({
    site: siteWithInternalLinks,
    remarkPlugins: toolEnv.markdown.remarkPlugins,
    logger: scoped,
  })

  const resolvedSiteWithHistory = await applyHistory(siteWithInternalImages, {
    previous: previousState,
    rootDir,
    readContent,
  })
  const sortedSite = applySorting(resolvedSiteWithHistory, scoped.child('sorting'))

  scoped.debug('build.exportModel.start', { path: exportDir })
  await writeModelExport({ exportDir, site: sortedSite, logger: scoped })

  if (exportModel.only) {
    if (options.quiet) {
      scoped.debug('build.exportOnly.success', { path: exportDir })
    } else {
      scoped.info('build.exportOnly.success', { path: exportDir })
    }
    return
  }

  const iconsResult = await buildIcons({
    rootDir,
    outputDir,
    site: sortedSite,
    logger: scoped.child('icons'),
    registerExpectedOutput,
  })

  // Prepare Handlebars template (site overrides take precedence over tool fallback).
  const templateRenderer = await createTemplateRenderer({
    rootDir,
    defaultWrapperName: templates.default.wrapper,
    defaultLayoutName: templates.default.layout,
    templatesRoot: toolEnv.templates.root,
    siteTemplatesRoot,
    logger: scoped.child('templates'),
    plugins,
    pluginContext: pluginContextBase,
  })

  const renderBaseContext = {
    model: sortedSite,
    // Expose site timestamps/fingerprint directly on `site` for templates
    site: {
      ...sortedSite.site,
      createdAt: sortedSite.createdAt,
      updatedAt: sortedSite.updatedAt,
      fingerprint: sortedSite.fingerprint,
    },
    collections: sortedSite.collections ?? [],
    layoutName: layoutPartialName,
    buildTime,
    liveReloadScript,
    ...(assetsBase ? { templates: { assetsBase } } : {}),
    ...(iconsResult.headHtml ? { iconsHead: iconsResult.headHtml } : { iconsHead: '' }),
  }

  const injectLiveReload = (rawHtml: string): string => {
    if (!options.liveReload || !liveReloadScript) return rawHtml
    if (rawHtml.includes('__webette-version')) return rawHtml
    const closeBodyIndex = rawHtml.lastIndexOf('</body>')
    if (closeBodyIndex === -1) return `${rawHtml}${liveReloadScript}`
    return `${rawHtml.slice(0, closeBodyIndex)}${liveReloadScript}${rawHtml.slice(closeBodyIndex)}`
  }

  const formatHtml = (rawHtml: string, targetPath: string): Promise<string> =>
    formatHtmlFs(injectLiveReload(rawHtml), targetPath, { prettyPrint, logger: scoped })

  const { renderedPages } = await renderSite({
    rootDir,
    outputDir,
    env: toolEnv,
    site: sortedSite,
    templatesDefault: templates.default,
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
    logger: scoped,
  })

  await writeSitemap({
    outputDir,
    site: sortedSite,
    generateIndex,
    includeDrafts,
    logger: scoped,
  })
  const protectedDirs = collectProtectedDirs({
    outputDir,
    exportDir,
    env: toolEnv,
    site: sortedSite,
    includeDrafts,
  })
  await pruneOrphans({
    outputDir,
    exportDir,
    site: sortedSite,
    includeDrafts,
    overwrite,
    generateIndex,
    writeHtaccess,
    writeNginxSample: shouldWriteNginxSample,
    protectedDirs,
    pluginExpected,
    logger: scoped,
  })
  await writeRootHtaccessFile({ outputDir, writeHtaccess, writeIfChanged })
  await writeNginxSampleFile({
    outputDir,
    writeNginxSample: shouldWriteNginxSample,
    writeIfChanged,
  })
  await protectAssetDirs({
    outputDir,
    protectAssets,
    dirsToCover: protectedDirs,
    siteTitle: sortedSite.site.title,
    siteLang: sortedSite.site.lang,
    assetsBase,
    accessForbiddenLayoutName,
    templateRenderer,
    formatHtml,
    writeIfChanged,
  })

  if (options.quiet) {
    scoped.debug('build.success', { path: outputDir, pages: renderedPages })
  } else {
    scoped.info('build.success', { path: outputDir, pages: renderedPages })
  }
}
