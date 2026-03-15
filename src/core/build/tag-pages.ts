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

import { mkdir } from 'node:fs/promises'
import * as path from 'node:path'
import type { Logger } from '../../logging/logger'
import type { Site } from '../model'
import {
  collectAllEntries,
  getAllTags,
  getCollectionTags,
  filterEntriesByTags,
} from '../tags/filter'
import { slugify } from '../../utils/naming'
import { stripRouteSlashes } from '../../utils/path'

type HandlebarsRenderer = {
  render: (context: Record<string, unknown>) => string
}

const TAG_INDEX_LAYOUT = 'tag-index'
const TAG_PAGE_LAYOUT = 'tag-page'

export async function renderTagPages(options: {
  outputDir: string
  site: Site
  tagsConfig: {
    siteIndex: boolean
    siteTag: boolean
    collectionIndex: boolean
    collectionTag: boolean
  }
  templateRenderer: HandlebarsRenderer
  renderBaseContext: Record<string, unknown>
  writeIfChanged: (filePath: string, content: string) => Promise<boolean>
  formatHtml: (html: string, filePath: string) => Promise<string>
  logger: Logger
}): Promise<number> {
  const {
    outputDir,
    site,
    tagsConfig,
    templateRenderer,
    renderBaseContext,
    writeIfChanged,
    formatHtml,
    logger,
  } = options

  let count = 0

  const renderPage = async (
    targetDir: string,
    context: Record<string, unknown>,
  ): Promise<boolean> => {
    const html = templateRenderer.render(context)
    await mkdir(targetDir, { recursive: true })
    const indexPath = path.join(targetDir, 'index.html')
    const finalHtml = await formatHtml(html, indexPath)
    return writeIfChanged(indexPath, finalHtml)
  }

  const allEntries = collectAllEntries(site.collections ?? [], site.rootEntries)
  const allTags = getAllTags(allEntries)

  // Nothing to do if no entry has any tag
  if (allTags.length === 0) return 0

  // /tag/ — site-level tag index
  if (tagsConfig.siteIndex) {
    const tags = allTags
    const context = {
      ...renderBaseContext,
      layoutName: TAG_INDEX_LAYOUT,
      tags,
      entry: { name: 'Tags', route: '/tag/' },
    }
    const wrote = await renderPage(path.join(outputDir, 'tag'), context)
    if (wrote) count++
  }

  // /tag/{slug}/ — site-level tag pages (one per tag)
  if (tagsConfig.siteTag) {
    const tags = allTags
    for (const tag of tags) {
      const slug = slugify(tag)
      if (!slug) continue
      const entries = filterEntriesByTags(allEntries, { tags: tag, mode: 'or' })
      const context = {
        ...renderBaseContext,
        layoutName: TAG_PAGE_LAYOUT,
        tag,
        entries,
        entry: { name: `#${tag}`, route: `/tag/${slug}/` },
      }
      const wrote = await renderPage(path.join(outputDir, 'tag', slug), context)
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
      const context = {
        ...renderBaseContext,
        layoutName: TAG_INDEX_LAYOUT,
        tags: collectionTags,
        collection,
        entry: {
          name: `Tags — ${collection.name}`,
          route: `/${routeRelative}/tag/`,
        },
      }
      const wrote = await renderPage(path.join(outputDir, routeRelative, 'tag'), context)
      if (wrote) count++
    }

    // /{collection}/tag/{slug}/ — collection tag pages
    if (tagsConfig.collectionTag) {
      for (const tag of collectionTags) {
        const slug = slugify(tag)
        if (!slug) continue
        const entries = filterEntriesByTags(collection.entries, { tags: tag, mode: 'or' })
        const context = {
          ...renderBaseContext,
          layoutName: TAG_PAGE_LAYOUT,
          tag,
          entries,
          collection,
          entry: {
            name: `#${tag}`,
            route: `/${routeRelative}/tag/${slug}/`,
          },
        }
        const wrote = await renderPage(
          path.join(outputDir, routeRelative, 'tag', slug),
          context,
        )
        if (wrote) count++
      }
    }
  }

  logger.debug('build.tagPages.done', { count })
  return count
}
