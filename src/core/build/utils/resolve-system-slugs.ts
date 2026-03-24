/**
 * Resolves system slug collisions by renaming conflicting slugs with a numeric suffix.
 *
 * If any collection slug, root entry slug, or entry slug within a collection matches
 * a reserved system route (e.g. 'tag'), the slug is renamed to '{slug}-0' (or '{slug}-1',
 * etc. if needed) and a warning is emitted.
 */

import type { Site, Collection, Entry } from '../../model'
import type { Logger } from '../../../logging/logger'
import { stripRouteSlashes } from '../../../utils/path'

export const SYSTEM_SLUGS = ['tag']

function findUniqueSlug(base: string, taken: Set<string>): string {
  let i = 0
  let candidate = `${base}-${i}`
  while (taken.has(candidate)) {
    i++
    candidate = `${base}-${i}`
  }
  return candidate
}

/**
 * Returns a new Site where any slug colliding with a system route has been renamed.
 * Emits a warning for each rename via the provided logger.
 *
 * `extraReserved` allows plugins to declare additional reserved top-level segments
 * (via `ctx.addReservedRoute`). These are merged with `SYSTEM_SLUGS` additively.
 */
export function resolveSystemSlugCollisions(site: Site, logger: Logger, extraReserved: string[] = []): Site {
  const systemSet = new Set([...SYSTEM_SLUGS, ...extraReserved])

  const topLevelSlugs = new Set<string>([
    ...SYSTEM_SLUGS,
    ...extraReserved,
    ...(site.collections ?? []).map(c => c.slug || c.id),
    ...(site.rootEntries ?? []).map(e => e.slug || e.id),
  ])

  let anyChange = false

  // --- Collections ---
  const newCollections: Collection[] = (site.collections ?? []).map(collection => {
    const collectionSlug = collection.slug || collection.id
    let currentCollection = collection

    if (systemSet.has(collectionSlug)) {
      const newSlug = findUniqueSlug(collectionSlug, topLevelSlugs)
      topLevelSlugs.add(newSlug)
      logger.warn('build.tags.slugRenamed', { kind: 'collection', oldSlug: collectionSlug, newSlug })
      currentCollection = { ...collection, slug: newSlug, route: `/${newSlug}/` }
      anyChange = true
    }

    // --- Entries within this collection ---
    const colRoute = stripRouteSlashes(currentCollection.route ?? (currentCollection.slug || currentCollection.id))
    // When the collection was renamed, the colRoute differs from the original — all entry routes must be rebased.
    const collectionRenamed = currentCollection !== collection
    const entrySlugs = new Set<string>([
      ...SYSTEM_SLUGS,
      ...currentCollection.entries.map(e => e.slug || e.id),
    ])

    let anyEntryChange = false
    const newEntries: Entry[] = currentCollection.entries.map(entry => {
      const entrySlug = entry.slug || entry.id

      if (systemSet.has(entrySlug)) {
        const newEntrySlug = findUniqueSlug(entrySlug, entrySlugs)
        entrySlugs.add(newEntrySlug)
        logger.warn('build.tags.slugRenamedInCollection', {
          oldSlug: entrySlug,
          newSlug: newEntrySlug,
          collection: currentCollection.slug || currentCollection.id,
        })
        anyEntryChange = true
        anyChange = true
        return { ...entry, slug: newEntrySlug, route: `/${colRoute}/${newEntrySlug}/` }
      }

      // Rebase route when collection was renamed (prefix changed)
      if (collectionRenamed) {
        anyEntryChange = true
        return { ...entry, route: `/${colRoute}/${entrySlug}/` }
      }

      return entry
    })

    if (!anyEntryChange && currentCollection === collection) return collection
    return { ...currentCollection, entries: anyEntryChange ? newEntries : currentCollection.entries }
  })

  // --- Root entries ---
  const newRootEntries: Entry[] | undefined = site.rootEntries?.map(entry => {
    const entrySlug = entry.slug || entry.id
    if (!systemSet.has(entrySlug)) return entry

    const newSlug = findUniqueSlug(entrySlug, topLevelSlugs)
    topLevelSlugs.add(newSlug)
    logger.warn('build.tags.slugRenamed', { kind: 'entry', oldSlug: entrySlug, newSlug })
    anyChange = true
    return { ...entry, slug: newSlug, route: `/${newSlug}/` }
  })

  if (!anyChange) return site
  return {
    ...site,
    collections: newCollections,
    ...(newRootEntries ? { rootEntries: newRootEntries } : {}),
  }
}
