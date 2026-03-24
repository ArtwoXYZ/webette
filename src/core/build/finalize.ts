/**
 * Build phase 6: model export, rendering, and finalization.
 *
 * Exports model, builds icons, prepares templates, renders all pages
 * (entries, tags, plugin pages), writes sitemap, prunes orphans,
 * writes server files, protects asset dirs.
 */

import { createTemplateRenderer } from '../templates/engine'
import { writeSitemap } from '../sitemap'
import { runOnGeneratePages } from '../../plugins/runner'
import { writeModelExport } from '../export/write-model'
import { formatHtml as formatHtmlFs } from './utils/html'
import { buildIcons } from './utils/icons'
import { renderSite } from './utils/render'
import { renderTagPages } from './utils/tag-pages'
import { createRenderPage } from './utils/render-synthetic-page'
import { collectProtectedDirs, pruneOrphans } from './utils/prune'
import { protectAssetDirs } from './utils/protect-assets'
import { writeNginxSampleFile, writeRootHtaccessFile } from './utils/server-files'
import type { BuildConfig, PluginResult, TransformResult } from './types'

export async function renderAndFinalize(
  config: BuildConfig,
  pluginResult: PluginResult,
  transformResult: TransformResult,
): Promise<void> {
  const {
    rootDir,
    scoped,
    options,
    toolEnv,
    writeIfChanged,
    pluginExpected,
    buildTime,
    prettyPrint,
    includeDrafts,
    generateIndex,
    protectAssets,
    writeHtaccess,
    shouldWriteNginxSample,
    templates,
    siteTemplatesRoot,
    templatesCustom,
    layoutPartialName,
    notFoundLayoutName,
    accessForbiddenLayoutName,
    assetsBase,
    outputDir,
    exportModel,
    tagsConfig,
  } = config
  const { plugins, pluginContextBase } = pluginResult
  const { finalSite, liveReloadScript } = transformResult
  const exportDir = exportModel.dir
  const logLevel = options.quiet ? scoped.debug.bind(scoped) : scoped.info.bind(scoped)

  scoped.debug('build.exportModel.start', { path: exportDir })
  await writeModelExport({ exportDir, site: finalSite, logger: scoped })

  if (exportModel.only) {
    logLevel('build.exportOnly.success', { path: exportDir })
    return
  }

  const iconsResult = await buildIcons({
    rootDir,
    outputDir,
    site: finalSite,
    logger: scoped.child('icons'),
    registerExpectedOutput: pluginExpected.addExpectedOutput,
  })

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
    model: finalSite,
    site: {
      ...finalSite.site,
      createdAt: finalSite.createdAt,
      updatedAt: finalSite.updatedAt,
      fingerprint: finalSite.fingerprint,
    },
    collections: finalSite.collections ?? [],
    layoutName: layoutPartialName,
    buildTime,
    liveReloadScript,
    ...(assetsBase ? { templates: { assetsBase } } : {}),
    ...(iconsResult.headHtml ? { iconsHead: iconsResult.headHtml } : { iconsHead: '' }),
    tagPagesEnabled: tagsConfig.anyPageEnabled,
    tagScopeByCollection: tagsConfig.scopedLinks,
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

  const renderSyntheticPage = createRenderPage({
    outputDir,
    templateRenderer,
    renderBaseContext,
    writeIfChanged,
    formatHtml,
    addExpectedOutput: pluginExpected.addExpectedOutput,
  })

  const { renderedPages } = await renderSite({
    rootDir,
    outputDir,
    env: toolEnv,
    site: finalSite,
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

  if (tagsConfig.anyPageEnabled) {
    await renderTagPages({
      site: finalSite,
      tagsConfig,
      renderPage: renderSyntheticPage,
      logger: scoped,
    })
  }

  if (plugins.length) {
    await runOnGeneratePages(plugins, finalSite, pluginContextBase, renderSyntheticPage)
  }

  await writeSitemap({
    outputDir,
    site: finalSite,
    generateIndex,
    includeDrafts,
    logger: scoped,
  })
  const protectedDirs = collectProtectedDirs({
    outputDir,
    exportDir,
    site: finalSite,
    includeDrafts,
  })
  await pruneOrphans({
    outputDir,
    exportDir,
    site: finalSite,
    includeDrafts,
    overwrite: config.overwrite,
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
    siteTitle: finalSite.site.title,
    siteLang: finalSite.site.lang,
    assetsBase,
    accessForbiddenLayoutName,
    templateRenderer,
    formatHtml,
    writeIfChanged,
  })

  logLevel('build.success', { path: outputDir, pages: renderedPages })
}
