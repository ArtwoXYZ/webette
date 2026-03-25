/**
 * Build phase 3: site scanning and validation.
 *
 * Scans site structure, filters drafts, extracts index folders, logs stats.
 */

import { scanSite } from '../scan'
import { runOnScan } from '../../plugins/runner'
import { countDraftEntries, filterDraftEntries, listDraftEntries } from './utils/drafts'
import { collectIndexFolders } from './utils/index-folders'
import { countBlocks } from './types'
import type { BuildConfig, PluginResult, ScanResult } from './types'

export async function scanAndValidate(
  config: BuildConfig,
  pluginResult: PluginResult,
): Promise<ScanResult> {
  const { scoped, includeDrafts, options } = config
  const { plugins, pluginContextBase } = pluginResult

  const scanLogger = scoped.child('scan')
  const scannedSiteRaw = await scanSite(config.site, scanLogger)
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

  let scannedSiteWithPlugins = scannedSite
  if (plugins.length) {
    scannedSiteWithPlugins = await runOnScan(plugins, scannedSite, pluginContextBase)
  }

  const siteWithIndexFolders = collectIndexFolders(scannedSiteWithPlugins, {
    includeDrafts,
    logger: scoped.child('index'),
  })

  const collectionsList = siteWithIndexFolders.collections ?? []
  const rootEntriesList = siteWithIndexFolders.rootEntries ?? []
  const entriesCount = collectionsList.reduce(
    (acc, collection) => acc + collection.entries.length,
    0,
  ) + rootEntriesList.length

  const { readContent } = config
  if (readContent === false) {
    scoped.info('build.skipContent', {})
  }
  const blocksCount = collectionsList.reduce(
    (acc, collection) =>
      acc + collection.entries.reduce((entryAcc, entry) => entryAcc + countBlocks(entry.blocks), 0),
    0,
  ) + rootEntriesList.reduce((acc, entry) => acc + countBlocks(entry.blocks), 0)

  const warnEmptyEntries = (entries: typeof rootEntriesList, collectionLabel: string) => {
    for (const entry of entries) {
      if (!entry.blocks.length) {
        scoped.warn('scan.entryEmpty', {
          collection: collectionLabel,
          entry: entry.slug || entry.id,
          path: entry.path,
        })
      }
    }
  }
  for (const collection of collectionsList) {
    if (!collection.entries.length) {
      scoped.warn('scan.collectionEmpty', {
        collection: collection.slug || collection.id,
        path: collection.path,
      })
    }
    warnEmptyEntries(collection.entries, collection.slug || collection.id)
  }
  warnEmptyEntries(rootEntriesList, '(root)')
  const logLevel = options.quiet ? scoped.debug.bind(scoped) : scoped.info.bind(scoped)
  logLevel('scan.summary', {
    collections: collectionsList.length,
    entries: entriesCount,
    blocks: blocksCount,
  })

  return { scannedSite: siteWithIndexFolders }
}
