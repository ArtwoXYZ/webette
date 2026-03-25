/**
 * Extracts custom index folders from collections into site.indexes.
 */

import type { Collection, Entry, Site } from "../../model";
import type { Logger } from "../../../logging/logger";

type IndexCollections = Record<string, Entry>;

export function collectIndexFolders(
  site: Site,
  options: { includeDrafts: boolean; logger?: Logger }
): Site {
  const includeDrafts = options.includeDrafts;
  const logger = options.logger;

  const collectionIndexEntries: IndexCollections = {};

  const collections = site.collections
    ? site.collections.map((collection) => {
      const entries = collection.entries ?? [];
      const indexEntries = entries.filter((entry) => entry.isIndex);
      const regularEntries = entries.filter((entry) => !entry.isIndex);

      const chosenIndex = indexEntries.find(
        (entry) => includeDrafts || !entry.isDraft
      );

      const collectionKey = collection.slug || collection.id;
      const filteredCollection: Collection = { ...collection, entries: regularEntries };

      if (indexEntries.length > 1) {
        logger?.warn("index.folder.multipleCollection", {
          collection: collectionKey,
          count: indexEntries.length,
          chosen: chosenIndex?.rawName ?? "",
          candidates: indexEntries.map((entry) => entry.rawName).join(", "),
        });
      }
      if (!includeDrafts && indexEntries.length && !chosenIndex) {
        logger?.warn("index.folder.draftCollectionSkipped", {
          collection: collectionKey,
          candidates: indexEntries.map((entry) => entry.rawName).join(", "),
        });
      }

      if (collectionKey && chosenIndex) {
        collectionIndexEntries[collectionKey] = chosenIndex;
      }

      return filteredCollection;
    })
    : undefined;

  const rootIndex =
    site.indexes?.root && (includeDrafts || !site.indexes.root.isDraft)
      ? site.indexes.root
      : undefined;
  if (!includeDrafts && site.indexes?.root?.isDraft) {
    logger?.warn("index.folder.draftRootSkipped", {
      entry: site.indexes.root.rawName,
    });
  }

  const nextIndexes =
    rootIndex || Object.keys(collectionIndexEntries).length
      ? {
        ...(rootIndex ? { root: rootIndex } : {}),
        ...(Object.keys(collectionIndexEntries).length
          ? { collections: collectionIndexEntries }
          : {}),
      }
      : undefined;

  return {
    ...site,
    ...(collections ? { collections } : {}),
    ...(nextIndexes ? { indexes: nextIndexes } : {}),
  };
}
