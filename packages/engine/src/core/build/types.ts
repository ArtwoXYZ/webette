/**
 * Shared types and pure helpers for the build pipeline phases.
 */

import * as path from 'node:path'
import type { Block, Site } from '../model'
import type { Logger } from '../../logging/logger'
import type { Locale } from '../../logging/i18n'
import type { WebetteEnv } from '../../config/env'
import type { ExpectedOutputsRegistry } from './utils/prune'
import type { PluginContext } from '../../plugins/types'
import type { resolveTemplatesConfig } from '../templates/config'

// ── Public API ──────────────────────────────────────────────────

export interface BuildOptions {
  verbose: boolean
  liveReload?: boolean
  quiet?: boolean
  includeDrafts?: boolean
  exportModel?: {
    only?: boolean
  }
  readContent?: boolean
  prettyPrint?: boolean
  generateIndex?: boolean
  protectAssets?: boolean
  writeHtaccess?: boolean
  writeNginxSample?: boolean
}

// ── Tags config ─────────────────────────────────────────────────

export type TagsConfig = ReturnType<typeof readTagsConfig>

export function readTagsConfig(raw?: Record<string, unknown>) {
  const enabled = raw?.enabled !== false
  const generatePages = enabled && raw?.generatePages !== false
  const pages = (raw?.pages ?? {}) as Record<string, unknown>
  const collectionTag = generatePages && pages.collectionTag !== false
  return {
    enabled,
    generatePages,
    anyPageEnabled: generatePages,
    siteIndex: generatePages && pages.siteIndex !== false,
    siteTag: generatePages && pages.siteTag !== false,
    collectionIndex: generatePages && pages.collectionIndex !== false,
    collectionTag,
    scopedLinks: collectionTag && raw?.scopedLinks !== false,
  }
}

// ── Pure helpers ────────────────────────────────────────────────

export function countBlocks(blocks: Block[] = []): number {
  return blocks.reduce(
    (total, block) => total + 1 + (block.subBlocks ? countBlocks(block.subBlocks) : 0),
    0,
  )
}

export function parseTemplateName(filename: string): string {
  return path.parse(filename).name
}

export function normalizeAssetsBase(raw: string): string {
  const trimmed = raw.trim()
  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return withLeading.replace(/\/+$/, '')
}

// ── Resolved templates config ───────────────────────────────────

type ResolvedTemplatesConfig = ReturnType<typeof resolveTemplatesConfig>

// ── Build config (cross-phase context) ──────────────────────────

export interface BuildConfig {
  rootDir: string
  options: BuildOptions
  scoped: Logger
  writeIfChanged: (targetPath: string, content: string) => Promise<boolean>
  pluginExpected: ExpectedOutputsRegistry
  toolEnv: WebetteEnv
  locale: Locale
  buildTime: Date
  prettyPrint: boolean
  includeDrafts: boolean
  generateIndex: boolean
  protectAssets: boolean
  writeHtaccess: boolean
  shouldWriteNginxSample: boolean
  readContent: boolean
  site: Site
  remarkPlugins: unknown[]
  tagsConfig: TagsConfig
  templates: ResolvedTemplatesConfig['templates']
  siteTemplatesRoot: ResolvedTemplatesConfig['siteTemplatesRoot']
  templatesAssets: ResolvedTemplatesConfig['assets']
  templatesCustom: ResolvedTemplatesConfig['custom']
  layoutPartialName: string
  notFoundLayoutName: string
  accessForbiddenLayoutName: string
  assetsBase: string | undefined
  assetsBaseRelative: string | undefined
  outputDir: string
  overwrite: 'replace-all' | 'replace-files' | 'none'
  exportModel: { dir: string; only: boolean }
}

// ── Phase result types ──────────────────────────────────────────

export interface PluginResult {
  plugins: Awaited<ReturnType<typeof import('../../plugins/loader').loadPlugins>>
  pluginContextBase: PluginContext
  pluginReservedRoutes: string[]
}

export interface ScanResult {
  scannedSite: Site
}

export interface TransformResult {
  finalSite: Site
  liveReloadScript: string
}
