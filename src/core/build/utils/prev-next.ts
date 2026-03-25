/**
 * Prev/next navigation helpers for entry pages.
 *
 * Computes adjacent entries (within the same collection), honoring draft/unlisted visibility rules.
 */

import * as path from "node:path";
import type { Collection, Entry, Site } from "../../model";

export type EntryNavRef = {
  id: string;
  name: string;
  displayName?: string;
  route: string;
};

const normalizeEntryRoute = (route: string): string => {
  const withLeading = route.startsWith("/") ? route : `/${route}`;
  return withLeading.endsWith("/") ? withLeading : `${withLeading}/`;
};

const entryRouteFor = (collection: Collection, entry: Entry): string => {
  if (typeof entry.route === "string" && entry.route.trim()) {
    return normalizeEntryRoute(entry.route.trim());
  }
  const rel = path.posix.join(collection.slug || collection.id, entry.slug || entry.id);
  return normalizeEntryRoute(rel);
};

export function findPrevNextEntry(options: {
  site: Site;
  entry: Entry;
  renderCollection?: Collection;
  includeDrafts: boolean;
}): { prevEntry?: EntryNavRef; nextEntry?: EntryNavRef } {
  const { site, entry, renderCollection, includeDrafts } = options;

  const rootEntries = site.rootEntries ?? [];
  if (!renderCollection && rootEntries.some((e) => e.id === entry.id)) {
    const orderedRootEntries = rootEntries.filter(
      (e) => !e.isUnlisted && (includeDrafts || !e.isDraft)
    );
    const index = orderedRootEntries.findIndex((e) => e.id === entry.id);
    if (index < 0) return {};

    const prev = index > 0 ? orderedRootEntries[index - 1] : undefined;
    const next = index < orderedRootEntries.length - 1 ? orderedRootEntries[index + 1] : undefined;
    const routeForRootEntry = (target: Entry): string => {
      if (typeof target.route === "string" && target.route.trim()) {
        return normalizeEntryRoute(target.route.trim());
      }
      return normalizeEntryRoute(target.slug || target.id);
    };

    return {
      ...(prev
        ? {
            prevEntry: {
              id: prev.id,
              name: prev.name,
              ...(prev.displayName ? { displayName: prev.displayName } : {}),
              route: routeForRootEntry(prev),
            },
          }
        : {}),
      ...(next
        ? {
            nextEntry: {
              id: next.id,
              name: next.name,
              ...(next.displayName ? { displayName: next.displayName } : {}),
              route: routeForRootEntry(next),
            },
          }
        : {}),
    };
  }

  const collection =
    renderCollection ??
    site.collections?.find((c) => c.entries.some((e) => e.id === entry.id));
  if (!collection) return {};

  const orderedEntries = collection.entries.filter(
    (e) => !e.isUnlisted && (includeDrafts || !e.isDraft)
  );
  const index = orderedEntries.findIndex((e) => e.id === entry.id);
  if (index < 0) return {};

  const prev = index > 0 ? orderedEntries[index - 1] : undefined;
  const next = index < orderedEntries.length - 1 ? orderedEntries[index + 1] : undefined;

  return {
    ...(prev
      ? {
          prevEntry: {
            id: prev.id,
            name: prev.name,
            ...(prev.displayName ? { displayName: prev.displayName } : {}),
            route: entryRouteFor(collection, prev),
          },
        }
      : {}),
    ...(next
      ? {
          nextEntry: {
            id: next.id,
            name: next.name,
            ...(next.displayName ? { displayName: next.displayName } : {}),
            route: entryRouteFor(collection, next),
          },
        }
      : {}),
  };
}
