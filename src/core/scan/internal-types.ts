/**
 * Internal scan-only raw types used during filesystem classification before model enrichment.
 */

import type {
  SiteStructureCollectionNode,
  SiteStructureEntryNode,
  SiteStructureIgnoredFolder,
} from "../model";

export type RawBlock = {
  rawName: string;
  path: string; // POSIX
  type: string;
  ext?: string;
  skipRender?: boolean;
  subBlocks?: RawBlock[];
};

export type RawEntry = {
  rawName: string;
  path: string; // POSIX
  blocks: RawBlock[];
  isDraft?: boolean;
  isUnlisted?: boolean;
  description?: string;
  displayName?: string;
  tags?: string[];
};

export type RawCollection = {
  rawName: string;
  path: string; // POSIX
  entries: RawEntry[];
  isUnlisted?: boolean;
  description?: string;
  displayName?: string;
  assets?: RawBlock[];
};

export type ScanDirent = {
  name: string;
  isDirectory(): boolean;
  isFile(): boolean;
};

export type RawStructureIgnoredFolder = SiteStructureIgnoredFolder;

export type RawStructureEntryNode = Omit<SiteStructureEntryNode, "blocks"> & {
  blocks: RawBlock[];
};

export type RawStructureCollectionNode = Omit<SiteStructureCollectionNode, "children"> & {
  children: RawStructureNode[];
};

export type RawStructureNode = RawStructureCollectionNode | RawStructureEntryNode;

export type SortOrder = "asc" | "desc";

export type CollectionConfig = {
  path?: string;
  name?: string;
  slug?: string;
  route?: string;
};
