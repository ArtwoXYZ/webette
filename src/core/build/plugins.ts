/**
 * Build phase 2: plugin loading and initialization.
 *
 * Loads plugins, stores metadata in site model, creates plugin context, runs onInit.
 */

import { loadPlugins, resolvePluginSources } from '../../plugins/loader'
import { runOnInit } from '../../plugins/runner'
import type { PluginContext } from '../../plugins/types'
import {
  filterEntriesByTags,
  collectAllEntries,
  getAllTags,
  normalizeTags,
} from '../tags/filter'
import type { BuildConfig, PluginResult } from './types'

export async function loadAndInitPlugins(config: BuildConfig): Promise<PluginResult> {
  const {
    rootDir,
    site,
    scoped,
    readContent,
    exportModel,
    pluginExpected,
  } = config

  const plugins = await loadPlugins({
    rootDir,
    ...resolvePluginSources(site.config?.plugins),
    logger: scoped,
  })

  if (plugins.length > 0) {
    site.plugins = plugins.map(plugin => ({
      id: plugin.pluginId,
      name: plugin.metadata?.name ?? plugin.pluginId,
      author: plugin.metadata?.author,
      license: plugin.metadata?.license,
      version: plugin.metadata?.version,
      folder: plugin.metadata?.folder ?? plugin.pluginId
    }))
    scoped.debug('build.pluginsStoredInSite', { count: site.plugins.length })
  }

  const pluginReservedRoutes: string[] = []
  const exportDir = exportModel.dir

  const pluginContextBase: PluginContext = {
    rootDir,
    env: config.toolEnv,
    logger: scoped,
    readContent,
    exportDir,
    pluginId: '',
    addExpectedOutput: pluginExpected.addExpectedOutput,
    addExpectedDir: pluginExpected.addExpectedDir,
    addReservedRoute: (segment: string) => pluginReservedRoutes.push(segment),
    webetteConfig: site.config?.rawConfig,
    siteConfig: site.site,
    pluginConfig: site.config?.pluginConfig,
    tags: {
      filter: filterEntriesByTags,
      collect: collectAllEntries,
      getAllTags,
      normalizeTags,
    },
  }

  await runOnInit(
    plugins.map((p, idx) => ({ ...p, pluginId: p.pluginId ?? `plugin_${idx + 1}` })),
    pluginContextBase,
  )

  return {
    plugins,
    pluginContextBase,
    pluginReservedRoutes,
  }
}
