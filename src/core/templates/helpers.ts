/**
 * Built-in Handlebars helpers available in templates.
 */

import Handlebars from 'handlebars'
import type { Collection, Entry } from '../model'
import {
  filterEntriesByTags,
  collectAllEntries as collectAllEntriesUtil,
  getCollectionTags as getCollectionTagsUtil,
  getSiteTags as getSiteTagsUtil,
  type TagFilterMode,
} from '../tags/filter'
import {
  buildImageHtml,
  normalizeVariantName,
  pickImageSource,
  resolveDefaultVariant,
} from './image-utils'
import { buildSocialHead } from './social-head'
import { registerMenuHelper } from './menu'

let helpersRegistered = false

function registerMatchHelper() {
  if (Handlebars.helpers.match) return
  Handlebars.registerHelper(
    'match',
    (value: unknown, pattern: unknown, flags?: unknown, options?: unknown) => {
      const isOptionsObject =
        flags && typeof flags === 'object' && ('hash' in (flags as any) || 'loc' in (flags as any))
      const normalizedFlags = isOptionsObject ? undefined : flags
      if (value == null || pattern == null) return ''
      const str = String(value)
      const source = String(pattern)
      try {
        const regex = new RegExp(
          source,
          normalizedFlags != null ? String(normalizedFlags) : undefined,
        )
        const res = str.match(regex)
        if (!res) return ''
        return res[1] ?? res[0] ?? ''
      } catch {
        return ''
      }
    },
  )
}

// Register a small set of reusable helpers for templates.
export function registerDefaultHelpers(options?: { defaultLayoutName?: string }) {
  if (helpersRegistered) {
    registerMatchHelper()
    return
  }
  helpersRegistered = true

  const fallbackLayout = options?.defaultLayoutName?.trim() || 'layout'

  const safeString = (value: unknown) => (value == null ? '' : String(value))

  Handlebars.registerHelper('displayName', function (this: unknown, value: unknown, options: any) {
    const isOptionsOnly =
      value &&
      typeof value === 'object' &&
      ('hash' in (value as any) || 'loc' in (value as any)) &&
      options === undefined
    const target = isOptionsOnly ? (this as unknown) : value

    if (!target || typeof target !== 'object') return ''

    const obj = target as Record<string, unknown>
    const displayName =
      typeof obj.displayName === 'string' && obj.displayName.trim()
        ? obj.displayName.trim()
        : undefined
    if (displayName) return displayName

    const name = typeof obj.name === 'string' && obj.name.trim() ? obj.name.trim() : undefined
    return name ?? ''
  })

  const toNumber = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  const toDate = (value: unknown): Date | null => {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
    if (typeof value === 'number') {
      const d = new Date(value)
      return Number.isNaN(d.getTime()) ? null : d
    }
    if (typeof value === 'string' && value.trim()) {
      const d = new Date(value)
      return Number.isNaN(d.getTime()) ? null : d
    }
    return null
  }

  const resolveLocaleFromContext = (options: any): string | undefined => {
    const root = options?.data?.root ?? {}
    const site = (root as any).site ?? (root as any).model?.site
    const lang = site?.lang || site?.locale || site?.language
    if (typeof lang === 'string' && lang.trim()) return lang.trim()
    const loggingLocale = (root as any).logging?.locale
    if (typeof loggingLocale === 'string' && loggingLocale.trim()) return loggingLocale.trim()
    return undefined
  }

  const resolveDefaultVariantFromContext = (options: any) => {
    const root = options?.data?.root ?? {}
    const site = (root as any).site ?? (root as any).model?.site
    return resolveDefaultVariant(site)
  }

  const resolveAssetsBaseFromContext = (options: any): string | undefined => {
    const root = options?.data?.root ?? {}
    const templates = (root as any).templates
    const base = templates?.assetsBase
    if (typeof base === 'string' && base.trim()) return base.trim()
    return undefined
  }

  const truncate = (value: string, length: number) => {
    if (length <= 0) return ''
    if (value.length <= length) return value
    return `${value.slice(0, length)}.`
  }

  Handlebars.registerHelper('imageSrc', function (block: any, options) {
    if (!block || block.type !== 'image') return ''
    const variant = normalizeVariantName(options?.hash?.variant)
    const defaultVariant = resolveDefaultVariantFromContext(options)
    const picked = pickImageSource(block, variant, defaultVariant)
    return picked.src ?? ''
  })

  Handlebars.registerHelper('image', function (block: any, options) {
    if (!block || block.type !== 'image') return ''
    const hash = options?.hash ?? {}

    const variant = normalizeVariantName(hash.variant)
    const root = options?.data?.root ?? {}
    const site = (root as any).site ?? (root as any).model?.site

    const dataAttrs: Record<string, string> = {}
    for (const [key, value] of Object.entries(hash)) {
      if (key.startsWith('data-')) {
        dataAttrs[key] = String(value)
      }
    }

    const html = buildImageHtml(block, {
      variant,
      alt: hash.alt,
      title: hash.title,
      className: hash.class,
      id: hash.id,
      loading: hash.loading,
      decoding: hash.decoding,
      sizes: hash.sizes,
      figure: Boolean(hash.figure),
      caption: hash.caption,
      figureClass: hash.figureClass,
      data: Object.keys(dataAttrs).length ? dataAttrs : undefined,
      site,
    })

    return new Handlebars.SafeString(html)
  })

  Handlebars.registerHelper('asset', function (value: unknown, options) {
    const raw = value == null ? '' : String(value)
    const base = resolveAssetsBaseFromContext(options)
    if (!base) return raw
    const clean = raw.replace(/^\/+/, '')
    return clean ? `${base}/${clean}` : base
  })

  Handlebars.registerHelper(
    'renderSocialHead',
    function (this: unknown, context: unknown, options: any) {
      const isOptionsOnly =
        context &&
        typeof context === 'object' &&
        ('hash' in (context as any) || 'loc' in (context as any)) &&
        options === undefined
      const normalizedOptions = isOptionsOnly ? context : options
      const target = isOptionsOnly ? (this as unknown) : context

      const root =
        normalizedOptions?.data?.root && typeof normalizedOptions.data.root === 'object'
          ? (normalizedOptions.data.root as Record<string, unknown>)
          : {}
      const page = target && typeof target === 'object' ? (target as Record<string, unknown>) : {}
      const html = buildSocialHead({ root, page })
      return html ? new Handlebars.SafeString(html) : ''
    },
  )

  Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b)
  Handlebars.registerHelper('neq', (a: unknown, b: unknown) => a !== b)
  Handlebars.registerHelper('in', (value: unknown, list: unknown) =>
    Array.isArray(list) ? list.includes(value as never) : false,
  )
  Handlebars.registerHelper(
    'safe',
    (html: unknown) => new Handlebars.SafeString(html == null ? '' : String(html)),
  )
  Handlebars.registerHelper('first', (arr: unknown) => (Array.isArray(arr) ? arr[0] : undefined))
  Handlebars.registerHelper('firstBlockOfType', (blocks: unknown, type: string) =>
    Array.isArray(blocks) ? blocks.find((b: any) => b?.type === type) : undefined,
  )
  Handlebars.registerHelper('upper', (value: unknown) => safeString(value).toUpperCase())
  Handlebars.registerHelper('lower', (value: unknown) => safeString(value).toLowerCase())
  Handlebars.registerHelper('capitalize', (value: unknown) => {
    const s = safeString(value)
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
  })
  Handlebars.registerHelper('titleCase', (value: unknown) =>
    safeString(value).replace(
      /\w\S*/g,
      (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    ),
  )
  Handlebars.registerHelper('truncate', (value: unknown, len: unknown) => {
    const s = safeString(value)
    const length = typeof len === 'number' ? len : parseInt(String(len), 10)
    return Number.isFinite(length) ? truncate(s, length) : s
  })
  Handlebars.registerHelper('nl2br', (value: unknown) => {
    const s = safeString(value)
    if (!s) return ''
    const html = s.replace(/\r?\n/g, '<br>')
    return new Handlebars.SafeString(html)
  })
  registerMatchHelper()
  Handlebars.registerHelper('formatDate', function (value: unknown, options) {
    const date = toDate(value)
    if (!date) return ''
    const hash = options?.hash ?? {}
    const localeFromHash =
      typeof hash.locale === 'string' && hash.locale.trim() ? hash.locale.trim() : undefined
    const locale = localeFromHash ?? resolveLocaleFromContext(options)
    const dateStyle = hash.dateStyle || hash.format || 'medium'
    const timeStyle = hash.timeStyle || undefined
    try {
      return new Intl.DateTimeFormat(locale, {
        dateStyle: dateStyle as Intl.DateTimeFormatOptions['dateStyle'],
        timeStyle: timeStyle as Intl.DateTimeFormatOptions['timeStyle'],
      }).format(date)
    } catch {
      return date.toISOString()
    }
  })
  Handlebars.registerHelper('fromNow', function (value: unknown, options) {
    const date = toDate(value)
    if (!date) return ''

    const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000)
    const absSeconds = Math.abs(diffSeconds)

    const localeFromHash =
      typeof options?.hash?.locale === 'string' && options.hash.locale.trim()
        ? options.hash.locale.trim()
        : undefined
    const locale = localeFromHash ?? resolveLocaleFromContext(options)

    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

    const units: { threshold: number; divisor: number; unit: Intl.RelativeTimeFormatUnit }[] = [
      { threshold: 31536000, divisor: 31536000, unit: 'year' }, // 365 days
      { threshold: 2592000, divisor: 2592000, unit: 'month' }, // 30 days
      { threshold: 86400, divisor: 86400, unit: 'day' },
      { threshold: 3600, divisor: 3600, unit: 'hour' },
      { threshold: 60, divisor: 60, unit: 'minute' },
    ]

    for (const { threshold, divisor, unit } of units) {
      if (absSeconds >= threshold) {
        const valueRounded = Math.round(diffSeconds / divisor)
        return rtf.format(valueRounded, unit)
      }
    }

    return rtf.format(diffSeconds, 'second')
  })
  Handlebars.registerHelper('add', (a: unknown, b: unknown) => {
    const na = toNumber(a)
    const nb = toNumber(b)
    if (na == null || nb == null) return ''
    return na + nb
  })
  Handlebars.registerHelper('subtract', (a: unknown, b: unknown) => {
    const na = toNumber(a)
    const nb = toNumber(b)
    if (na == null || nb == null) return ''
    return na - nb
  })
  Handlebars.registerHelper('multiply', (a: unknown, b: unknown) => {
    const na = toNumber(a)
    const nb = toNumber(b)
    if (na == null || nb == null) return ''
    return na * nb
  })
  Handlebars.registerHelper('divide', (a: unknown, b: unknown) => {
    const na = toNumber(a)
    const nb = toNumber(b)
    if (na == null || nb == null || nb === 0) return ''
    return na / nb
  })
  Handlebars.registerHelper('percent', (part: unknown, total: unknown, decimals?: unknown) => {
    const p = toNumber(part)
    const t = toNumber(total)
    if (p == null || t == null || t === 0) return ''
    const d =
      typeof decimals === 'number'
        ? decimals
        : Number.isFinite(Number(decimals))
          ? Number(decimals)
          : 0
    const value = (p / t) * 100
    return d > 0 ? value.toFixed(d) : Math.round(value)
  })

  // Block helper: find a collection by slug or id and evaluate the block with it.
  Handlebars.registerHelper('withCollection', function (slug: string, options) {
    const root = options.data?.root ?? {}
    const model = (root as any).model ?? root
    const collections: Collection[] = Array.isArray((model as any).collections)
      ? (model as any).collections
      : []
    const match = collections.find(
      (col) => col.slug === slug || col.id === slug || col.route === slug,
    )
    return match ? options.fn(match, { data: options.data }) : ''
  })

  // Block helper: find an entry by slug/id/route across collections.
  Handlebars.registerHelper('withEntry', function (identifier: string, options) {
    const root = options.data?.root ?? {}
    const model = (root as any).model ?? root
    const collections: Collection[] = Array.isArray((model as any).collections)
      ? (model as any).collections
      : []
    const rootEntries: Entry[] = Array.isArray((model as any).rootEntries)
      ? (model as any).rootEntries
      : []

    let foundEntry: Entry | undefined
    let foundCollection: Collection | undefined

    for (const col of collections) {
      const entry = col.entries.find(
        (ent) =>
          ent.slug === identifier ||
          ent.id === identifier ||
          (ent.route && ent.route.replace(/\/+$/, '') === identifier.replace(/\/+$/, '')),
      )
      if (entry) {
        foundEntry = entry
        foundCollection = col
        break
      }
    }

    if (!foundEntry) {
      foundEntry = rootEntries.find(
        (ent) =>
          ent.slug === identifier ||
          ent.id === identifier ||
          (ent.route && ent.route.replace(/\/+$/, '') === identifier.replace(/\/+$/, '')),
      )
    }

    if (!foundEntry) return ''
    const data = { ...(options.data || {}), collection: foundCollection }
    return options.fn(foundEntry, { data })
  })

  Handlebars.registerHelper(
    'filterByTag',
    function (this: Record<string, unknown>, entries: unknown, options: Handlebars.HelperOptions) {
      if (!Array.isArray(entries)) return []
      const tags = options.hash?.tags ?? ''
      const mode: TagFilterMode = options.hash?.mode === 'and' ? 'and' : 'or'
      return filterEntriesByTags(entries as Entry[], { tags, mode })
    },
  )

  Handlebars.registerHelper(
    'collectAllEntries',
    function (this: Record<string, unknown>, collections?: unknown) {
      const cols = Array.isArray(collections)
        ? collections
        : Array.isArray(this.collections)
          ? this.collections
          : []
      const rootEntries = Array.isArray(
        (this.model as Record<string, unknown>)?.rootEntries,
      )
        ? ((this.model as Record<string, unknown>).rootEntries as Entry[])
        : undefined
      return collectAllEntriesUtil(cols as Collection[], rootEntries)
    },
  )

  // Returns all unique tags (sorted) from a single collection's entries.
  // Usage: {{getCollectionTags collection}}
  Handlebars.registerHelper(
    'getCollectionTags',
    function (collection: unknown) {
      if (!collection || typeof collection !== 'object') return []
      return getCollectionTagsUtil(collection as Collection)
    },
  )

  // Returns all unique tags (sorted) across the entire site (all collections + root entries).
  // Usage: {{getSiteTags}} — reads collections and model.rootEntries from context automatically.
  Handlebars.registerHelper(
    'getSiteTags',
    function (this: Record<string, unknown>) {
      const cols = Array.isArray(this.collections) ? (this.collections as Collection[]) : []
      const rootEntries = Array.isArray((this.model as Record<string, unknown>)?.rootEntries)
        ? ((this.model as Record<string, unknown>).rootEntries as Entry[])
        : undefined
      return getSiteTagsUtil(cols, rootEntries)
    },
  )

  registerMenuHelper(Handlebars)

  // Render a layout partial by name, with a default fallback.
  Handlebars.registerHelper('renderLayout', function (name: unknown, options) {
    const layoutName = (typeof name === 'string' && name.trim()) || fallbackLayout
    const partial = Handlebars.partials[layoutName]
    if (!partial) return ''

    const context = options.data?.root ?? {}
    const templateFn =
      typeof partial === 'function'
        ? (partial as Handlebars.TemplateDelegate)
        : Handlebars.compile(partial as string)

    return new Handlebars.SafeString(templateFn(context))
  })
}
