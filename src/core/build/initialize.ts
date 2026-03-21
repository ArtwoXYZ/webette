/**
 * Build phase 1: configuration initialization.
 *
 * Resolves environment, site config, templates config, and all build flags.
 */

import { stat } from 'node:fs/promises'
import * as path from 'node:path'
import { getEnv, resolveLocale } from '../../config/env'
import { createSite } from '../config'
import { resolveTemplatesConfig } from '../templates/config'
import { writeIfChanged as writeIfChangedFs } from '../../utils/fs'
import { createExpectedOutputsRegistry } from './utils/prune'
import type { Logger } from '../../logging/logger'
import type { BuildOptions, BuildConfig } from './types'
import { readTagsConfig, normalizeAssetsBase, templateBaseName } from './types'

export async function initializeBuild(
  rootDir: string,
  options: BuildOptions,
  logger: Logger,
): Promise<BuildConfig> {
  const scoped = logger.child('build')

  const writeIfChanged = async (targetPath: string, content: string): Promise<boolean> =>
    writeIfChangedFs(targetPath, content, scoped)

  const pluginExpected = createExpectedOutputsRegistry()

  const { env: toolEnv } = await getEnv()
  const locale = resolveLocale(toolEnv)
  const buildTime = new Date()
  const prettyPrint =
    typeof options.prettyPrint === 'boolean' ? options.prettyPrint : toolEnv.build.prettyPrint
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

  const site = await createSite(rootDir, scoped)
  const remarkPlugins = Array.isArray(site.config?.markdown?.remarkPlugins)
    ? (site.config.markdown.remarkPlugins as unknown[])
    : []
  const tagsConfig = readTagsConfig(site.config?.tags)
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
  const layoutPartialName = templateBaseName(templates.default.layout)
  const notFoundLayoutName = templateBaseName(templates.default.notFound)
  const accessForbiddenLayoutName = templateBaseName(templates.default.accessForbidden)
  scoped.debug('build.siteLoaded', { title: site.site.title })

  const assetsBase = templatesAssets ? normalizeAssetsBase(templatesAssets.publicBase) : undefined
  const assetsBaseRelative = assetsBase ? assetsBase.replace(/^\/+/, '') : undefined
  if (assetsBaseRelative) {
    pluginExpected.addExpectedDir(assetsBaseRelative)
  }

  const readContent =
    typeof options.readContent === 'boolean' ? options.readContent : toolEnv.build.readContent

  const outputDir = path.join(rootDir, toolEnv.build.outputDirName)
  const overwrite: 'replace-all' | 'replace-files' | 'none' =
    options.liveReload === true
      ? 'replace-files'
      : toolEnv.build.overwrite as 'replace-all' | 'replace-files' | 'none'

  const exportModel = {
    dir: path.join(outputDir, '_model'),
    only: options.exportModel?.only ?? toolEnv.build.exportModel.only,
  }

  return {
    rootDir,
    options,
    scoped,
    writeIfChanged,
    pluginExpected,
    toolEnv,
    locale,
    buildTime,
    prettyPrint,
    includeDrafts,
    generateIndex,
    protectAssets,
    writeHtaccess,
    shouldWriteNginxSample,
    readContent,
    site,
    remarkPlugins,
    tagsConfig,
    templates,
    siteTemplatesRoot,
    templatesAssets,
    templatesCustom,
    layoutPartialName,
    notFoundLayoutName,
    accessForbiddenLayoutName,
    assetsBase,
    assetsBaseRelative,
    outputDir,
    overwrite,
    exportModel,
  }
}
