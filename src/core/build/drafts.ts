/**
 * Draft helpers for the build/serve pipeline.
 *
 * Handles draft filtering and draft-related summaries for logs.
 */

import type { Site } from "../model";

export function filterDraftEntries(site: Site, includeDrafts: boolean): Site {
  if (includeDrafts) return site;
  const collections = site.collections
    ? site.collections.map((collection) => {
        const entries = collection.entries.filter((entry) => !entry.isDraft);
        return { ...collection, entries };
      })
    : undefined;

  return { ...site, ...(collections ? { collections } : {}) };
}

export function countDraftEntries(site: Site): number {
  return (site.collections ?? []).reduce(
    (acc, collection) =>
      acc + collection.entries.filter((entry) => entry.isDraft).length,
    0
  );
}

export function listDraftEntries(site: Site): { collection: string; entry: string; path: string }[] {
  const drafts: { collection: string; entry: string; path: string }[] = [];
  for (const collection of site.collections ?? []) {
    for (const entry of collection.entries) {
      if (!entry.isDraft) continue;
      drafts.push({
        collection: collection.slug || collection.id,
        entry: entry.slug || entry.id,
        path: entry.path,
      });
    }
  }
  return drafts;
}
