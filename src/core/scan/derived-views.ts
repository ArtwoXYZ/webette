/**
 * Build enriched recursive structure and flat derived views consumed by current pipeline modules.
 */

import type {
  SiteStructureNode,
  SiteStructureRoot,
} from "../model";
import { enrichBlocks } from "./enrich";
import type {
  RawCollection,
  RawEntry,
  RawStructureCollectionNode,
  RawStructureEntryNode,
  RawStructureNode,
} from "./internal-types";
import { listCollectionAssetsRaw } from "./raw-scan";
import { sortByName } from "./utils";

export function enrichStructureNodes(rawNodes: RawStructureNode[]): SiteStructureNode[] {
  return rawNodes.map((node) => {
    if (node.kind === "entry") {
      return {
        ...node,
        blocks: enrichBlocks(node.blocks),
      };
    }

    return {
      ...node,
      children: enrichStructureNodes(node.children),
    };
  });
}

function rawEntryFromStructure(node: RawStructureEntryNode): RawEntry {
  return {
    rawName: node.rawName,
    path: node.path,
    blocks: node.blocks,
    ...(node.isDraft ? { isDraft: true } : {}),
    ...(node.isUnlisted ? { isUnlisted: true } : {}),
    ...(node.description ? { description: node.description } : {}),
    ...(node.displayName ? { displayName: node.displayName } : {}),
  };
}

export async function deriveFlatRawViewsFromStructure(options: {
  rootDir: string;
  rootNodes: RawStructureNode[];
}): Promise<{ collections: RawCollection[]; rootEntries: RawEntry[] }> {
  const { rootDir, rootNodes } = options;

  const collections: RawCollection[] = [];
  const rootEntries: RawEntry[] = [];

  const visitCollection = async (node: RawStructureCollectionNode): Promise<void> => {
    const directEntries = node.children
      .filter((child): child is RawStructureEntryNode => child.kind === "entry")
      .map(rawEntryFromStructure);
    const assets = await listCollectionAssetsRaw(rootDir, node.path);

    collections.push({
      rawName: node.rawName,
      path: node.path,
      entries: directEntries,
      ...(node.isUnlisted ? { isUnlisted: true } : {}),
      ...(node.description ? { description: node.description } : {}),
      ...(node.displayName ? { displayName: node.displayName } : {}),
      ...(assets.length ? { assets } : {}),
    });

    const childCollections = node.children.filter(
      (child): child is RawStructureCollectionNode => child.kind === "collection"
    );
    for (const childCollection of childCollections) {
      await visitCollection(childCollection);
    }
  };

  for (const node of rootNodes) {
    if (node.kind === "entry") {
      rootEntries.push(rawEntryFromStructure(node));
      continue;
    }
    await visitCollection(node);
  }

  sortByName(rootEntries);
  sortByName(collections);
  for (const collection of collections) {
    sortByName(collection.entries);
  }

  return { collections, rootEntries };
}

export function buildStructureRoot(options: {
  children: RawStructureNode[];
  ignoredFolders: Array<{ path: string; reason: "empty-folder" | "meta-only-folder" }>;
}): SiteStructureRoot {
  return {
    kind: "root",
    children: enrichStructureNodes(options.children),
    ...(options.ignoredFolders.length ? { ignoredFolders: options.ignoredFolders } : {}),
  };
}
