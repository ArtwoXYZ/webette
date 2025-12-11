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
  slug: string;        // slug used for routing
  path: string;        // path relative to the site root
  route?: string;      // route relative to site root (trailing slash)
  blocks: Block[];     // files/blocks contained in the entry
  createdAt?: string;  // ISO timestamp of first appearance in the model
  updatedAt?: string;  // ISO timestamp of last change in the model
  fingerprint?: string; // stable hash of the entry content/structure
}

export interface Collection {
  id: string;          // identifier derived from the path
  rawName: string;     // raw folder name
  name: string;        // cleaned name
  slug: string;        // slug used for routing
  path: string;        // path relative to the site root
  route?: string;      // route relative to site root (trailing slash)
  entries: Entry[];    // entries inside the collection
  createdAt?: string;  // ISO timestamp of first appearance in the model
  updatedAt?: string;  // ISO timestamp of last change in the model
  fingerprint?: string; // stable hash of the collection content/structure
}

export interface Site {
  rootDir: string;                  // absolute path to the site root
  site: Record<string, unknown>;    // "site" section from webette.config.ts
  config?: {
    collections?: Record<string, unknown>; // raw collections config from webette.config.ts
    plugins?: string[];             // plugin paths from webette.config.ts
  };
  collections?: Collection[];       // discovered collections with their entries/blocks
  route?: string;                   // root route, usually "/"
  createdAt?: string;               // ISO timestamp of first appearance in the model
  updatedAt?: string;               // ISO timestamp of last change in the model
  fingerprint?: string;             // stable hash of the site content/structure
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
  };
  variants?: ImageVariant[];         // generated/resolved variants for media (images)
  ast?: unknown;                     // structured representation (e.g. mdast)
  html?: string;                     // rendered HTML for markdown/text blocks
}
