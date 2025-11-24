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
}

export interface Entry {
  id: string;          // identifier derived from the path
  rawName: string;     // raw folder name
  name: string;        // cleaned name without ordering prefix
  slug: string;        // slug used for routing
  path: string;        // path relative to the site root
  route?: string;      // route relative to site root (trailing slash)
  blocks: Block[];     // files/blocks contained in the entry
}

export interface Collection {
  id: string;          // identifier derived from the path
  rawName: string;     // raw folder name
  name: string;        // cleaned name
  slug: string;        // slug used for routing
  path: string;        // path relative to the site root
  route?: string;      // route relative to site root (trailing slash)
  entries: Entry[];    // entries inside the collection
}

export interface Site {
  rootDir: string;                  // absolute path to the site root
  site: Record<string, unknown>;    // "site" section from webette.config.ts
  config?: {
    collections?: Record<string, unknown>; // raw collections config from webette.config.ts
  };
  collections?: Collection[];       // discovered collections with their entries/blocks
  route?: string;                   // root route, usually "/"
}
