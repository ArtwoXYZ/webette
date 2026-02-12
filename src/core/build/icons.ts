/**
 * Favicons/icons generation + head tag injection.
 */

import { mkdir } from 'node:fs/promises'
import * as path from 'node:path'
import type { Site } from '../model'
import type { Logger } from '../../logging/logger'
import { writeIfChanged } from '../../utils/fs'
import { toPosix } from '../../utils/path'
import { buildIconsHead } from '../templates/icons-head'

type SharpModule = typeof import('sharp')
let cachedSharp: SharpModule | null | undefined

type IconVariants = {
  default?: string
  light?: string
  dark?: string
  hasLight: boolean
  hasDark: boolean
}

type SourceGroups = {
  global?: IconVariants
  app?: IconVariants
  apple?: IconVariants
  android?: IconVariants
  ms?: IconVariants
  favicon?: IconVariants
}

type IconsConfig = {
  outputRel: string
  publicBase: string
  injectHead: boolean
  themeColor?: string
  themeColorLight?: string
  themeColorDark?: string
  tileColor?: string
  colorScheme?: string
  sources: SourceGroups
}

type IconBuildResult = {
  headHtml: string
  generated: boolean
  outputRel?: string
}

// Default output subdir under `_public/`.
const DEFAULT_OUTPUT_DIR = 'assets/icon'
const DEFAULT_THEME_COLOR = '#ffffff'

const appleSizes = [57, 60, 72, 76, 114, 120, 144, 152, 180]
const androidSizes = [36, 48, 72, 96, 144, 192]
const msSizes = [70, 144, 150, 310]
const faviconSizes = [16, 32, 96]

async function loadSharp(logger?: Logger): Promise<SharpModule | null> {
  if (cachedSharp !== undefined) return cachedSharp
  try {
    const mod = await import('sharp')
    cachedSharp = mod.default ?? (mod as SharpModule)
    return cachedSharp
  } catch {
    logger?.warn('build.icons.sharpMissing', {})
    cachedSharp = null
    return cachedSharp
  }
}

const pickString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined

// Normalize a source value into { default/light/dark } and flags.
function extractVariants(raw: unknown): IconVariants | undefined {
  if (typeof raw === 'string' && raw.trim()) {
    return { default: raw.trim(), hasLight: false, hasDark: false }
  }
  if (!raw || typeof raw !== 'object') return undefined
  const obj = raw as Record<string, unknown>
  const def = pickString(obj.default)
  const light = pickString(obj.light) ?? pickString(obj.lightmode)
  const dark = pickString(obj.dark) ?? pickString(obj.darkmode)
  if (!def && !light && !dark) return undefined
  return {
    default: def,
    light,
    dark,
    hasLight: Boolean(light),
    hasDark: Boolean(dark),
  }
}

function normalizeIconsConfig(site: Site, logger?: Logger): IconsConfig | null {
  const siteMeta =
    site.site && typeof site.site === 'object' ? (site.site as Record<string, unknown>) : {}
  const rawIcons = siteMeta.icons
  if (!rawIcons || typeof rawIcons !== 'object') return null
  const icons = rawIcons as Record<string, unknown>

  const rawSource = icons.source
  const sourceObj =
    rawSource && typeof rawSource === 'object' ? (rawSource as Record<string, unknown>) : undefined

  const sources: SourceGroups = {
    global: extractVariants(rawSource),
    app: extractVariants(sourceObj?.app),
    apple: extractVariants(sourceObj?.apple),
    android: extractVariants(sourceObj?.android),
    ms: extractVariants(sourceObj?.ms),
    favicon: extractVariants(sourceObj?.favicon),
  }

  const hasAnySource =
    sources.global ||
    sources.app ||
    sources.apple ||
    sources.android ||
    sources.ms ||
    sources.favicon
  if (!hasAnySource) {
    logger?.warn('build.icons.missingSource', {})
    return null
  }

  // Normalize output dir (strip leading/trailing slashes).
  const rawOutput = pickString(icons.outputDir) ?? DEFAULT_OUTPUT_DIR
  const cleaned = toPosix(rawOutput).replace(/^\/+/, '').replace(/\/+$/, '')
  const outputRel = cleaned || DEFAULT_OUTPUT_DIR
  const publicBase = `/${outputRel}`

  const injectHead = typeof icons.injectHead === 'boolean' ? icons.injectHead : true

  const themeColor = pickString(icons.themeColor) ?? DEFAULT_THEME_COLOR
  const themeColorLight = pickString(icons.themeColorLight)
  const themeColorDark = pickString(icons.themeColorDark)
  const tileColor = pickString(icons.tileColor)
  const colorScheme = pickString(icons.colorScheme)

  return {
    outputRel,
    publicBase,
    injectHead,
    themeColor,
    themeColorLight,
    themeColorDark,
    tileColor,
    colorScheme,
    sources,
  }
}

function pickDefault(variants?: IconVariants): string | undefined {
  if (!variants) return undefined
  return variants.default ?? variants.light ?? variants.dark
}

// Resolve a group+mode source with fallback:
// group -> app -> global, then defaults in the same order.
function resolveSource(
  sources: SourceGroups,
  group: keyof SourceGroups,
  mode: 'default' | 'light' | 'dark',
): string | undefined {
  const groupVariants = sources[group]
  const appVariants = sources.app
  const globalVariants = sources.global

  const pickMode = (variants?: IconVariants): string | undefined => {
    if (!variants) return undefined
    if (mode === 'light') return variants.light
    if (mode === 'dark') return variants.dark
    return variants.default
  }

  if (mode === 'light' || mode === 'dark') {
    return (
      pickMode(groupVariants) ??
      pickMode(appVariants) ??
      pickMode(globalVariants) ??
      pickDefault(groupVariants) ??
      pickDefault(appVariants) ??
      pickDefault(globalVariants)
    )
  }

  return pickDefault(groupVariants) ?? pickDefault(appVariants) ?? pickDefault(globalVariants)
}

function resolveInputPath(rootDir: string, source: string): string {
  if (path.isAbsolute(source)) return source
  return path.join(rootDir, source)
}

async function generatePng(
  sharpModule: SharpModule,
  inputPath: string,
  size: number,
  targetPath: string,
): Promise<void> {
  // Contain keeps aspect ratio and centers in a transparent square.
  await sharpModule(inputPath)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(targetPath)
}

async function generateIco(
  sharpModule: SharpModule,
  inputPath: string,
  targetPath: string,
): Promise<void> {
  await sharpModule(inputPath)
    .resize(32, 32, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toFormat('ico')
    .toFile(targetPath)
}

export async function buildIcons(options: {
  rootDir: string
  outputDir: string
  site: Site
  logger: Logger
  registerExpectedOutput: (relativePath: string) => void
}): Promise<IconBuildResult> {
  const { rootDir, outputDir, site, logger, registerExpectedOutput } = options
  const config = normalizeIconsConfig(site, logger)
  if (!config) return { headHtml: '', generated: false }

  const sharpModule = await loadSharp(logger)
  if (!sharpModule) {
    return { headHtml: '', generated: false }
  }

  const outputAbs = path.join(outputDir, config.outputRel)
  await mkdir(outputAbs, { recursive: true })

  const registerOutput = (fileName: string) => {
    const rel = path.join(config.outputRel, fileName)
    registerExpectedOutput(rel)
  }

  const emitted: string[] = []
  const emitFile = (fileName: string) => {
    emitted.push(fileName)
    registerOutput(fileName)
  }

  const generateSizedIcons = async (
    sourcePath: string | undefined,
    sizes: number[],
    prefix: string,
    suffix: string = '',
  ): Promise<number[]> => {
    if (!sourcePath) return []
    const inputPath = resolveInputPath(rootDir, sourcePath)
    const generated: number[] = []
    for (const size of sizes) {
      const fileName = `${prefix}-${size}x${size}${suffix}.png`
      const target = path.join(outputAbs, fileName)
      try {
        await generatePng(sharpModule, inputPath, size, target)
        emitFile(fileName)
        generated.push(size)
      } catch (err) {
        logger.warn('build.icons.generateFailed', {
          file: fileName,
          source: sourcePath,
          error: String(err),
        })
      }
    }
    return generated
  }

  const appleSource = resolveSource(config.sources, 'apple', 'default')
  const androidSource = resolveSource(config.sources, 'android', 'default')
  const msSource = resolveSource(config.sources, 'ms', 'default')
  const faviconSource = resolveSource(config.sources, 'favicon', 'default')

  const appleGeneratedSizes = await generateSizedIcons(appleSource, appleSizes, 'apple-icon')
  if (appleSource) {
    const inputPath = resolveInputPath(rootDir, appleSource)
    const baseSize = 180
    for (const name of ['apple-icon.png', 'apple-icon-precomposed.png']) {
      try {
        await generatePng(sharpModule, inputPath, baseSize, path.join(outputAbs, name))
        emitFile(name)
        // no-op
      } catch (err) {
        logger.warn('build.icons.generateFailed', {
          file: name,
          source: appleSource,
          error: String(err),
        })
      }
    }
  }

  const androidGeneratedSizes = await generateSizedIcons(
    androidSource,
    androidSizes,
    'android-icon',
  )
  const msGeneratedSizes = await generateSizedIcons(msSource, msSizes, 'ms-icon')
  const faviconGeneratedSizes = await generateSizedIcons(faviconSource, faviconSizes, 'favicon')

  // Light/dark generation is enabled if any favicon/app/global variant exists.
  const hasLight =
    Boolean(config.sources.favicon?.hasLight) ||
    Boolean(config.sources.app?.hasLight) ||
    Boolean(config.sources.global?.hasLight)
  const hasDark =
    Boolean(config.sources.favicon?.hasDark) ||
    Boolean(config.sources.app?.hasDark) ||
    Boolean(config.sources.global?.hasDark)

  let faviconLightSizes: number[] = []
  let faviconDarkSizes: number[] = []
  if (hasLight) {
    const source = resolveSource(config.sources, 'favicon', 'light')
    faviconLightSizes = await generateSizedIcons(source, faviconSizes, 'favicon', '-light')
  }

  if (hasDark) {
    const source = resolveSource(config.sources, 'favicon', 'dark')
    faviconDarkSizes = await generateSizedIcons(source, faviconSizes, 'favicon', '-dark')
  }

  if (faviconSource) {
    try {
      const icoPath = path.join(outputAbs, 'favicon.ico')
      await generateIco(sharpModule, resolveInputPath(rootDir, faviconSource), icoPath)
      emitFile('favicon.ico')
    } catch (err) {
      logger.warn('build.icons.icoFailed', { error: String(err) })
    }
  }

  const themeColor = config.themeColor ?? DEFAULT_THEME_COLOR
  const tileColor = config.tileColor ?? themeColor

  if (androidGeneratedSizes.length) {
    const manifest = {
      name: (site.site as any)?.title ?? 'Webette',
      short_name: (site.site as any)?.title ?? 'Webette',
      icons: androidGeneratedSizes.map((size) => ({
        src: `${config.publicBase}/android-icon-${size}x${size}.png`,
        sizes: `${size}x${size}`,
        type: 'image/png',
      })),
      theme_color: themeColor,
      background_color: themeColor,
      display: 'standalone',
    }

    const manifestPath = path.join(outputAbs, 'manifest.json')
    await writeIfChanged(manifestPath, JSON.stringify(manifest, null, 2), logger)
    emitFile('manifest.json')
  }

  if (msGeneratedSizes.length) {
    const browserconfig = `<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
  <msapplication>
    <tile>
      ${msGeneratedSizes.includes(70) ? `<square70x70logo src="${config.publicBase}/ms-icon-70x70.png"/>` : ''}
      ${msGeneratedSizes.includes(144) ? `<square144x144logo src="${config.publicBase}/ms-icon-144x144.png"/>` : ''}
      ${msGeneratedSizes.includes(150) ? `<square150x150logo src="${config.publicBase}/ms-icon-150x150.png"/>` : ''}
      ${msGeneratedSizes.includes(310) ? `<square310x310logo src="${config.publicBase}/ms-icon-310x310.png"/>` : ''}
      <TileColor>${tileColor}</TileColor>
    </tile>
  </msapplication>
</browserconfig>
`
    const browserconfigPath = path.join(outputAbs, 'browserconfig.xml')
    await writeIfChanged(browserconfigPath, browserconfig, logger)
    emitFile('browserconfig.xml')
  }

  if (!config.injectHead || emitted.length === 0) {
    return { headHtml: '', generated: emitted.length > 0, outputRel: config.outputRel }
  }
  const headHtml = buildIconsHead({
    publicBase: config.publicBase,
    appleGeneratedSizes,
    androidGeneratedSizes,
    faviconGeneratedSizes,
    faviconLightSizes,
    faviconDarkSizes,
    hasManifest: androidGeneratedSizes.length > 0 && emitted.includes('manifest.json'),
    hasMsTile144: msGeneratedSizes.includes(144),
    tileColor,
    themeColor,
    themeColorLight: config.themeColorLight,
    themeColorDark: config.themeColorDark,
    colorScheme: config.colorScheme,
  })

  return {
    headHtml,
    generated: emitted.length > 0,
    outputRel: config.outputRel,
  }
}
