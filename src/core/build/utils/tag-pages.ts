/**
 * Tag pages rendering stage.
 *
 * Generates static tag index and tag listing pages at build time:
 *   /tag/                           — site tag index (all tags)
 *   /tag/{slug}/                    — site tag page (entries for one tag)
 *   /{collection}/tag/              — collection tag index
 *   /{collection}/tag/{slug}/       — collection tag page
 *
 * Each type is independently controlled via tagsConfig.
 * Collections with no tagged entries are skipped to avoid empty pages.
 */

import type { Logger } from '../../../logging/logger'
import type { Site } from '../../model'
import type { RenderPage } from '../../../plugins/types'
import {
  collectAllEntries,
  getAllTags,
  getCollectionTags,
  filterEntriesByTags,
} from '../../tags/filter'
import { slugify } from '../../../utils/naming'
import { stripRouteSlashes } from '../../../utils/path'

const TAG_INDEX_LAYOUT = 'tag-index'
const TAG_PAGE_LAYOUT = 'tag-page'

export async function renderTagPages(options: {
  site: Site
  tagsConfig: {
    siteIndex: boolean
    siteTag: boolean
    collectionIndex: boolean
    collectionTag: boolean
  }
  renderPage: RenderPage
  logger: Logger
}): Promise<number> {
  const { site, tagsConfig, renderPage, logger } = options

  let count = 0

  const allEntries = collectAllEntries(site.collections ?? [], site.rootEntries)
  const allTags = getAllTags(allEntries)

  // Nothing to do if no entry has any tag
  if (allTags.length === 0) return 0

  // /tag/ — site-level tag index
  if (tagsConfig.siteIndex) {
    const wrote = await renderPage({
      route: '/tag/',
      layoutName: TAG_INDEX_LAYOUT,
      context: {
        tags: allTags,
        entry: { name: 'Tags', route: '/tag/' },
      },
    })
    if (wrote) count++
  }

  // /tag/{slug}/ — site-level tag pages (one per tag)
  if (tagsConfig.siteTag) {
    for (const tag of allTags) {
      const slug = slugify(tag)
      if (!slug) continue
      const entries = filterEntriesByTags(allEntries, { tags: tag, mode: 'or' })
      const wrote = await renderPage({
        route: `/tag/${slug}/`,
        layoutName: TAG_PAGE_LAYOUT,
        context: {
          tag,
          entries,
          entry: { name: `#${tag}`, route: `/tag/${slug}/` },
        },
      })
      if (wrote) count++
    }
  }

  // Collection-scoped tag pages
  for (const collection of site.collections ?? []) {
    const collectionTags = getCollectionTags(collection)
    // Skip collections with no tagged entries to avoid empty pages
    if (!collectionTags.length) continue

    const routeRelative = collection.route
      ? stripRouteSlashes(collection.route)
      : collection.slug || collection.id

    // /{collection}/tag/ — collection tag index
    if (tagsConfig.collectionIndex) {
      const wrote = await renderPage({
        route: `/${routeRelative}/tag/`,
        layoutName: TAG_INDEX_LAYOUT,
        context: {
          tags: collectionTags,
          collection,
          entry: {
            name: `Tags — ${collection.name}`,
            route: `/${routeRelative}/tag/`,
          },
        },
      })
      if (wrote) count++
    }

    // /{collection}/tag/{slug}/ — collection tag pages
    if (tagsConfig.collectionTag) {
      for (const tag of collectionTags) {
        const slug = slugify(tag)
        if (!slug) continue
        const entries = filterEntriesByTags(collection.entries, { tags: tag, mode: 'or' })
        const wrote = await renderPage({
          route: `/${routeRelative}/tag/${slug}/`,
          layoutName: TAG_PAGE_LAYOUT,
          context: {
            tag,
            entries,
            collection,
            entry: {
              name: `#${tag}`,
              route: `/${routeRelative}/tag/${slug}/`,
            },
          },
        })
        if (wrote) count++
      }
    }
  }

  logger.debug('build.tagPages.done', { count })
  return count
}
