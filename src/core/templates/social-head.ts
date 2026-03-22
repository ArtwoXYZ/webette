import type { Block } from '../model'
import { pickString } from '../../utils/parse'
import { escapeHtml as escapeAttr } from '../../utils/html'

type SocialConfig = {
  injectHead: boolean
  image?: string
  titleTemplate?: string
  descriptionTemplate?: string
  defaultDescription?: string
  excerptFromFirstTextBlock: boolean
  excerptMaxWords: number
  excerptSuffix: string
  ogType?: string
  twitterCard?: string
}

const toRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

const normalizeRoute = (value: string | undefined): string => {
  if (!value) return '/'
  const trimmed = value.trim()
  if (!trimmed) return '/'
  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return withLeading.replace(/\/{2,}/g, '/')
}

const toAbsoluteOrRootedUrl = (
  value: string | undefined,
  absoluteBase: string | undefined,
): string | undefined => {
  const raw = pickString(value)
  if (!raw) return undefined
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) return raw
  if (absoluteBase) {
    try {
      const normalized = raw.startsWith('/') ? raw.slice(1) : raw
      return new URL(normalized, absoluteBase).toString()
    } catch {
      // Fall through to rooted/relative mode.
    }
  }
  if (raw.startsWith('/')) return raw
  return `/${raw.replace(/^\/+/, '')}`
}

const renderTemplate = (template: string, vars: Record<string, string>): string =>
  template
    .replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_full, token: string) => vars[token] ?? '')
    .trim()

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim()

const stripMarkdown = (value: string): string => {
  return normalizeWhitespace(
    value
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
      .replace(/^>\s?/gm, '')
      .replace(/^\s{0,3}#{1,6}\s+/gm, '')
      .replace(/[*_~]/g, ''),
  )
}

const truncateWords = (value: string, maxWords: number, suffix: string): string | undefined => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return undefined
  if (!Number.isFinite(maxWords) || maxWords <= 0) return normalized
  const words = normalized.split(' ')
  if (words.length <= maxWords) return normalized
  return `${words.slice(0, maxWords).join(' ')}${suffix}`
}

const findFirstTextBlockRaw = (blocks: unknown[]): string | undefined => {
  for (const blockValue of blocks) {
    const block = toRecord(blockValue)
    if (!block) continue

    const type = pickString(block.type)?.toLowerCase()
    if (type === 'text' || type === 'markdown') {
      const content = toRecord(block.content)
      const raw = pickString(content?.raw)
      if (raw) return raw
    }

    const subBlocks = Array.isArray(block.subBlocks) ? block.subBlocks : undefined
    if (subBlocks?.length) {
      const nested = findFirstTextBlockRaw(subBlocks)
      if (nested) return nested
    }
  }

  return undefined
}

const resolveSocialConfig = (site: Record<string, unknown>): SocialConfig | null => {
  const social = toRecord(site.social)
  if (!social) return null

  const injectHead = typeof social.injectHead === 'boolean' ? social.injectHead : true
  const excerptFromFirstTextBlock =
    typeof social.excerptFromFirstTextBlock === 'boolean' ? social.excerptFromFirstTextBlock : false
  const excerptMaxWordsRaw = toNumber(social.excerptMaxWords)
  const excerptMaxWords =
    excerptMaxWordsRaw && excerptMaxWordsRaw > 0 ? Math.trunc(excerptMaxWordsRaw) : 30

  return {
    injectHead,
    image: pickString(social.image),
    titleTemplate: pickString(social.titleTemplate),
    descriptionTemplate: pickString(social.descriptionTemplate),
    defaultDescription: pickString(social.defaultDescription),
    excerptFromFirstTextBlock,
    excerptMaxWords,
    excerptSuffix: pickString(social.excerptSuffix) ?? '…',
    ogType: pickString(social.ogType) ?? pickString(social.type),
    twitterCard: pickString(social.twitterCard) ?? pickString(social.card),
  }
}

const resolveSite = (
  root: Record<string, unknown>,
  page: Record<string, unknown>,
): Record<string, unknown> | undefined => {
  const rootSite = toRecord(root.site)
  if (rootSite) return rootSite

  const rootModel = toRecord(root.model)
  const modelSite = toRecord(rootModel?.site)
  if (modelSite) return modelSite

  return toRecord(page.site)
}

const resolvePageType = (
  route: string,
  collection: Record<string, unknown> | undefined,
  blocks: Block[],
): string => {
  if (route === '/') return 'root'
  if (blocks.length > 0) return 'entry'
  if (collection) return 'collection'
  return 'page'
}

const resolveDisplayName = (value: Record<string, unknown> | undefined): string | undefined =>
  pickString(value?.displayName) ?? pickString(value?.name)

const resolveItemDescription = (
  pageSocial: Record<string, unknown> | undefined,
  entry: Record<string, unknown> | undefined,
  collection: Record<string, unknown> | undefined,
): string | undefined => {
  return (
    pickString(pageSocial?.description) ??
    pickString(entry?.description) ??
    pickString(collection?.description)
  )
}

export function buildSocialHead(options: {
  root: Record<string, unknown>
  page: Record<string, unknown>
}): string {
  const { root, page } = options
  const site = resolveSite(root, page)
  if (!site) return ''

  const config = resolveSocialConfig(site)
  if (!config || !config.injectHead) return ''

  const entry = toRecord(page.entry)
  const collection = toRecord(page.collection)
  const pageSocial = {
    ...(toRecord(collection?.social) ?? {}),
    ...(toRecord(entry?.social) ?? {}),
  }

  if (typeof pageSocial.injectHead === 'boolean' && pageSocial.injectHead === false) {
    return ''
  }

  const blocks = Array.isArray(page.blocks) ? (page.blocks as Block[]) : []
  const route = normalizeRoute(pickString(entry?.route) ?? pickString(collection?.route))
  const pageType = resolvePageType(route, collection, blocks)

  const absoluteBase = pickString(site.url)
  const siteTitle = pickString(site.title)
  const siteDescription = pickString(site.description)
  const siteAuthor = pickString(site.author)

  const pageTitleBase =
    pickString(pageSocial.title) ??
    resolveDisplayName(entry) ??
    resolveDisplayName(collection) ??
    siteTitle

  let pageExcerpt: string | undefined
  if (config.excerptFromFirstTextBlock) {
    const firstRaw = findFirstTextBlockRaw(blocks)
    if (firstRaw) {
      pageExcerpt = truncateWords(
        stripMarkdown(firstRaw),
        config.excerptMaxWords,
        config.excerptSuffix,
      )
    }
  }

  const itemDescription = resolveItemDescription(pageSocial, entry, collection)
  const descriptionFallback =
    itemDescription ?? pageExcerpt ?? config.defaultDescription ?? siteDescription

  const pageUrl = toAbsoluteOrRootedUrl(route, absoluteBase)
  const imageUrl = toAbsoluteOrRootedUrl(config.image, absoluteBase)

  const defaultTitle =
    pageTitleBase && siteTitle && pageTitleBase !== siteTitle
      ? `${pageTitleBase} | ${siteTitle}`
      : (pageTitleBase ?? siteTitle)

  const templateVars: Record<string, string> = {
    siteTitle: siteTitle ?? '',
    pageTitle: pageTitleBase ?? siteTitle ?? '',
    pageType,
    siteDescription: siteDescription ?? '',
    pageDescription: descriptionFallback ?? '',
    pageExcerpt: pageExcerpt ?? '',
    pageUrl: pageUrl ?? route,
  }

  const renderedTitle = config.titleTemplate
    ? renderTemplate(config.titleTemplate, templateVars)
    : ''
  const finalTitle = renderedTitle || defaultTitle

  const renderedDescription = config.descriptionTemplate
    ? renderTemplate(config.descriptionTemplate, templateVars)
    : ''
  const finalDescription = renderedDescription || descriptionFallback

  const defaultOgType = pageType === 'entry' ? 'article' : 'website'
  const ogType = pickString(pageSocial.type) ?? config.ogType ?? defaultOgType
  const twitterCard =
    pickString(pageSocial.twitterCard) ??
    pickString(pageSocial.card) ??
    config.twitterCard ??
    (imageUrl ? 'summary_large_image' : 'summary')

  const canonicalTags: string[] = []
  if (pageUrl) {
    canonicalTags.push(`<link rel="canonical" href="${escapeAttr(pageUrl)}">`)
  }

  const generalTags: string[] = []
  if (siteAuthor) {
    generalTags.push(`<meta name="author" content="${escapeAttr(siteAuthor)}">`)
  }
  if (finalDescription) {
    generalTags.push(`<meta name="description" content="${escapeAttr(finalDescription)}">`)
  }

  const facebookTags: string[] = []
  if (ogType) {
    facebookTags.push(`<meta property="og:type" content="${escapeAttr(ogType)}">`)
  }
  if (finalTitle) {
    facebookTags.push(`<meta property="og:title" content="${escapeAttr(finalTitle)}">`)
  }
  if (finalDescription) {
    facebookTags.push(`<meta property="og:description" content="${escapeAttr(finalDescription)}">`)
  }
  if (pageUrl) {
    facebookTags.push(`<meta property="og:url" content="${escapeAttr(pageUrl)}">`)
  }
  if (imageUrl) {
    facebookTags.push(`<meta property="og:image" content="${escapeAttr(imageUrl)}">`)
  }
  if (siteTitle) {
    facebookTags.push(`<meta property="og:site_name" content="${escapeAttr(siteTitle)}">`)
  }

  const twitterTags: string[] = []
  if (twitterCard) {
    twitterTags.push(`<meta name="twitter:card" content="${escapeAttr(twitterCard)}">`)
  }
  if (finalTitle) {
    twitterTags.push(`<meta name="twitter:title" content="${escapeAttr(finalTitle)}">`)
  }
  if (finalDescription) {
    twitterTags.push(`<meta name="twitter:description" content="${escapeAttr(finalDescription)}">`)
  }
  if (imageUrl) {
    twitterTags.push(`<meta name="twitter:image" content="${escapeAttr(imageUrl)}">`)
  }

  const tags: string[] = []
  if (generalTags.length) {
    tags.push('<!-- General metadata -->', ...generalTags)
  }
  if (canonicalTags.length) {
    if (tags.length) tags.push('')
    tags.push('<!-- Canonical metadata -->', ...canonicalTags)
  }
  if (facebookTags.length) {
    if (tags.length) tags.push('')
    tags.push('<!-- Facebook metadata -->', ...facebookTags)
  }
  if (twitterTags.length) {
    if (tags.length) tags.push('')
    tags.push('<!-- Twitter metadata -->', ...twitterTags)
  }

  if (!tags.length) return ''
  return `\n    ${tags.join('\n    ')}`
}
