/**
 * Core model types used across scan/resolve/render/export.
 */

import type { SortingConfig } from "./build/utils/sorting";
export type { SortingConfig };

export interface Block {
  id: string;          // identifier scoped to the entry
  rawName: string;     // raw filename or folder name
  name: string;        // cleaned name without ordering prefix
  slug: string;        // slug used for clean url
  type: string;        // logical block type (md, image, folder, custom, etc.)
  ext?: string;        // extension when applicable (e.g., ".md")
  path: string;        // path relative to the site root
  route?: string;      // route relative to site root (includes ext when present)
  subBlocks?: Block[]; // nested blocks (e.g., subfolder for galleries)
  skipRender?: boolean; // marked to be excluded from automatic rendering
  createdAt?: string;  // ISO timestamp of first appearance in the model
  updatedAt?: string;  // ISO timestamp of last change in the model
  fingerprint?: string; // stable hash of the block content/structure
  content?: ResolvedBlockContent; // resolved payload (text/data/meta) for rendering/plugins
}

export interface Entry {
  id: string;          // identifier derived from the path
  rawName: string;     // raw folder name
  name: string;        // cleaned name without ordering prefix
  displayName?: string; // optional title from name.webt (entry-level)
  slug: string;        // slug used for routing
  path: string;        // path relative to the site root
  route?: string;      // route relative to site root (trailing slash)
  blocks: Block[];     // files/blocks contained in the entry
  description?: string; // raw description from description.webt (entry-level)
  tags?: string[];     // tags from tags.webt (one tag per line)
  isDraft?: boolean;   // flagged when draft.webt is present in the entry folder
  isUnlisted?: boolean; // flagged when unlisted.webt is present in the entry folder
  isIndex?: boolean;   // flagged when entry is a custom index folder
  createdAt?: string;  // ISO timestamp of first appearance in the model
  updatedAt?: string;  // ISO timestamp of last change in the model
  fingerprint?: string; // stable hash of the entry content/structure
}

export interface Collection {
  id: string;          // identifier derived from the path
  rawName: string;     // raw folder name
  name: string;        // cleaned name
  displayName?: string; // optional title from name.webt (collection-level)
  slug: string;        // slug used for routing
  path: string;        // path relative to the site root
  route?: string;      // route relative to site root (trailing slash)
  entries: Entry[];    // entries inside the collection
  assets?: Block[];    // media assets from _assets (images/audio/video)
  description?: string; // raw description from description.webt (collection-level)
  isUnlisted?: boolean; // flagged when unlisted.webt is present in the collection root
  createdAt?: string;  // ISO timestamp of first appearance in the model
  updatedAt?: string;  // ISO timestamp of last change in the model
  fingerprint?: string; // stable hash of the collection content/structure
}

export interface SiteStructureIgnoredFolder {
  path: string;                    // path relative to the site root
  reason: "empty-folder" | "meta-only-folder";
}

export interface SiteStructureEntryNode {
  kind: "entry";
  rawName: string;
  path: string;                    // path relative to the site root
  blocks: Block[];                 // scanned blocks for classification evidence
  displayName?: string;
  description?: string;
  tags?: string[];
  isDraft?: boolean;
  isUnlisted?: boolean;
}

export interface SiteStructureCollectionNode {
  kind: "collection";
  rawName: string;
  path: string;                    // path relative to the site root
  children: SiteStructureNode[];   // nested collections/entries
  displayName?: string;
  description?: string;
  isUnlisted?: boolean;
}

export type SiteStructureNode = SiteStructureCollectionNode | SiteStructureEntryNode;

export interface SiteStructureRoot {
  kind: "root";
  children: SiteStructureNode[];
  ignoredFolders?: SiteStructureIgnoredFolder[];
}

export type ImageFormat = "webp" | "avif" | "jpeg" | "png";
export type ImageFit = "cover" | "contain" | "fill" | "inside" | "outside";

export interface Site {
  rootDir: string;                  // absolute path to the site root
  site: Record<string, unknown>;    // "site" section from webette.config.ts
  config?: {
    collections?: Record<string, unknown>; // raw collections config from webette.config.ts
    plugins?: string[] | { dir: string };  // plugin paths or directory from webette.config.ts
    templates?: Record<string, unknown>; // raw templates config from webette.config.ts
    pluginConfig?: Record<string, unknown>; // plugin-specific configuration (map pluginId → config)
    tags?: Record<string, unknown>; // raw tags config from webette.config.ts
    images?: Record<string, unknown>; // raw images config from webette.config.ts
    audio?: Record<string, unknown>; // raw audio config from webette.config.ts
    video?: Record<string, unknown>; // raw video config from webette.config.ts
    markdown?: Record<string, unknown>; // raw markdown config from webette.config.ts
    sorting?: SortingConfig; // sorting config from webette.config.ts
    rawConfig?: Record<string, unknown>; // full raw webette.config.ts before processing
  };
  indexes?: {
    root?: Entry;
    collections?: Record<string, Entry>;
  };
  structure?: SiteStructureRoot;    // recursive source of truth for scanned content structure
  rootEntries?: Entry[];            // derived root-level entry view for consumers/templates/export
  collections?: Collection[];       // derived flat collection view (entries/assets) for consumers/templates/export
  route?: string;                   // root route, usually "/"
  createdAt?: string;               // ISO timestamp of first appearance in the model
  updatedAt?: string;               // ISO timestamp of last change in the model
  fingerprint?: string;             // stable hash of the site content/structure
  plugins?: Array<{
    id: string;
    name: string;
    author?: string;
    license?: string;
    version?: string;
    folder: string;
  }>; // loaded plugins metadata
}

export type ImageVariantName = "default" | "small" | "medium" | "large";

export interface ImageVariant {
  name: ImageVariantName;
  route: string;                     // public path to the generated variant
  width?: number;
  height?: number;
  format?: string;
  size?: number;
  aliasOf?: ImageVariantName;
  reason?: string;
}

export interface ResolvedBlockContent {
  raw?: string;                      // raw text content (md/txt)
  data?: unknown;                    // parsed data (json, etc.)
  meta?: {                           // lightweight metadata for media
    size?: number;                   // byte size when available
    mime?: string;                   // mimetype inferred from extension
    width?: number;                  // pixel width when available
    height?: number;                 // pixel height when available
    format?: string;                 // e.g., "markdown"
    renderedWith?: string;           // pipeline used to generate HTML
    duration?: number;               // seconds (audio)
    bitrate?: number;                // bits per second (audio)
    sampleRate?: number;             // Hz (audio)
    channels?: number;               // channel count (audio)
    codec?: string;                  // codec identifier (audio)
    title?: string;                  // tag (audio)
    artist?: string;                 // tag (audio)
    album?: string;                  // tag (audio)
    year?: number;                   // tag (audio)
    genre?: string[];                // tag (audio)
    alt?: string;                    // preferred fallback alt text for images
  };
  variants?: ImageVariant[];         // generated/resolved variants for media (images)
  ast?: unknown;                     // structured representation (e.g. mdast)
  html?: string;                     // rendered HTML for markdown/text blocks
  blockRoute?: string;               // route for media blocks (images, videos, audio)
  changedType?: string;              // new type if resolver changed it (e.g., reference blocks)
}
