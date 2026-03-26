/**
 * Shared types for Handlebars template helpers.
 */

import type Handlebars from 'handlebars'
import type { Site, Collection, Entry } from '../model'

/**
 * Shape of the root context passed to Handlebars templates.
 */
export interface TemplateRoot {
  model?: Site
  site?: Record<string, unknown>
  collections?: Collection[]
  collection?: Collection
  entry?: Entry
  templates?: { assetsBase?: string }
  logging?: { locale?: string }
  tagScopeByCollection?: boolean
  layoutName?: string
  buildTime?: unknown
  liveReloadScript?: string
  iconsHead?: string
  tagPagesEnabled?: boolean
}

/**
 * Type guard: returns true if `v` is a Handlebars helper options object.
 * Used for arity detection (detecting when the first arg is actually the options object).
 */
export function isHbsOptions(v: unknown): v is Handlebars.HelperOptions {
  return v != null && typeof v === 'object' && 'hash' in v && 'data' in v
}

/**
 * Unwrap `options.data.root` as `TemplateRoot`.
 * This is the single `as TemplateRoot` assertion point for all helpers.
 */
export function resolveRoot(options: Handlebars.HelperOptions): TemplateRoot {
  return (options?.data?.root ?? {}) as TemplateRoot
}
