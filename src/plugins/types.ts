/**
 * Plugin API types.
 */

import type { Logger } from "../logging/logger";
import type { Site, Collection, Entry, Block } from "../core/model";
import Handlebars from "handlebars";
import type { WebetteEnv } from "../config/env";
import type { TagFilterOptions } from "../core/tag-filter";

/**
 * Function signature exposed to plugins via `onGeneratePages`.
 *
 * - `route` — root-relative URL (e.g. `/my-plugin/`), converted to a FS path under outputDir.
 * - `layoutName` — Handlebars partial name for the layout (e.g. `'entry'`, `'welcome'`).
 * - `context` — extra data merged on top of `renderBaseContext`; `layoutName` always wins.
 *
 * Returns `true` if the file was written (content changed), `false` otherwise.
 * Also calls `addExpectedOutput` internally so pruneOrphans keeps the page.
 */
export type RenderPage = (opts: {
  route: string
  layoutName: string
  context?: Record<string, unknown>
}) => Promise<boolean>

export type PluginContext = {
  rootDir: string;
  env: WebetteEnv;
  logger: Logger;
  readContent: boolean;
  exportDir: string;
  pluginId: string;
  addExpectedOutput: (relativePath: string) => void;
  addExpectedDir: (relativeDir: string) => void;
  /**
   * Declare a top-level route segment as reserved.
   * Any entry or collection with a matching slug will be auto-renamed with a warning.
   * Must be called in `onInit`, `onScan`, or `onResolved` — calling it in `onGeneratePages`
   * is too late and will emit a warning.
   */
  addReservedRoute: (segment: string) => void;
  webetteConfig?: Record<string, unknown>; // Full webette.config.ts (all sections, raw)
  siteConfig?: Record<string, unknown>; // The "site" section of webette.config.ts
  pluginConfig?: Record<string, unknown>; // The "pluginConfig" section (map pluginId → config)
  thisPluginConfig?: Record<string, unknown>; // Config of this specific plugin
  tags: {
    filter: (entries: Entry[], options: TagFilterOptions) => Entry[];
    collect: (collections: Collection[], rootEntries?: Entry[]) => Entry[];
    collectAllTags: (entries: Entry[]) => string[];
    normalizeTags: (input: string | string[]) => string[];
  };
};

export interface Plugin {
  // Optional identifier; if missing we derive one from the filename
  pluginId?: string;
  // Called after env/site load, before scanning
  onInit?: (ctx: PluginContext) => Promise<void> | void;
  // Called after scan/routes, before content resolution
  onScan?: (site: Site, ctx: PluginContext) => Promise<Site | void> | Site | void;
  // Called after content resolution, before timestamps/export
  onResolved?: (site: Site, ctx: PluginContext) => Promise<Site | void> | Site | void;
  // Per-block mutation after resolution (subBlocks handled recursively)
  transformBlock?: (block: Block, ctx: PluginContext & { entry: Entry; collection: Collection }) => Promise<Block | void> | Block | void;
  // Per-entry mutation after blocks
  transformEntry?: (entry: Entry, ctx: PluginContext & { collection: Collection }) => Promise<Entry | void> | Entry | void;
  // Template extensions (helpers/partials/layouts)
  extendTemplates?: (hb: typeof Handlebars, ctx: PluginContext) => Promise<void> | void;
  // Called after tag pages, before sitemap. Use ctx.renderPage to generate static pages.
  onGeneratePages?: (site: Site, ctx: PluginContext & { renderPage: RenderPage }) => Promise<void> | void;
}

export type LoadedPlugin = Plugin & {
  pluginId: string;
  metadata?: {
    name?: string;
    author?: string;
    license?: string;
    version?: string;
    folder?: string;
  };
};
