# Build Pipeline and Plugin Hooks

This document describes how the current Webette build/serve pipeline works (today’s implementation).

This document explains how Webette processes a **site root**, how it discovers **collections**, **entries**, and **blocks**, how it transforms **content** using an **AST**, and how **plugins** can hook into each stage.

The goal is to describe the conceptual flow of a Webette build.

---

# Overview

A Webette build runs through these major phases:

1. Load **tool configuration** (`webette.tool.ts`)
2. Load **site configuration** (`webette.config.ts`)
3. Raw scan: discover **collections**
4. Raw scan: discover **entries**
5. Raw scan: discover **blocks** (type/ext only)
6. Apply **site config** overrides (collections)
7. Enrich missing **names/slugs/ids**
8. Resolve **routes** (site/collection/entry; blocks later, by resolvers when needed)
9. Parse Markdown into an **AST**
10. Transform content (AST transforms, block transforms, enrichment plugins), render Markdown to HTML, and enrich block metadata
11. Render **templates** (wrapper + layout + partials)
12. HTML post-processing (pretty-print, rewrites)
13. Write output
14. Run post-build hooks

Each step exposes hooks plugins can use to extend or alter the behavior.

---

# Build Cycle

## 1. Tool configuration

`webette.tool.ts` defines settings used by the Webette **tool**, not by a specific site:

- Logging (level, locale, folder)
- Template fallback root and default wrapper
- Build/serve behaviors (port, output dir, overwrite rules)
- Live reload settings, watcher debounce, etc.

It is resolved via `getEnv()` and environment variables.

---

## 2. Site configuration

`webette.config.ts` defines how the **site** itself behaves:

- Site metadata (title, language, etc.)
- List of **collections** and how they behave
- Template choices (layouts, partials)
- Activated **plugins** and their options

It is loaded fresh using Bun’s transpiler on every build/serve.

---

## 3-5. Raw discovery (collections, entries, blocks)

Every folder in the **site root** is considered a **collection**, except for:

- the templates folder (e.g. `_templates/`, or the tool fallback if present in the site root)
- the Webette internal folder (e.g. `.webette/`, configurable)
- the build output folder (e.g. `_public/`)
- hidden folders or folders starting with `_`

Valid collections can be `blog/`, `notes/`, `videos/`, `recipes/`, etc.

Raw scan keeps minimal data:

- `rawName` and POSIX `path` for collections, entries, blocks
- block `type`/`ext` hints (markdown, text, image, audio, video, folder; everything else becomes `unclassified` so plugins can opt in)
- `.txt` files are treated as Markdown by default; set `markdown.treatTxtAsMarkdown = false` in the tool config or the site config to keep them as plain text blocks
- deterministic ordering (numeric prefix, then alpha)
- Special control files:
  - `ignore.webt` inside an entry folder marks listed files/folders as `skipRender` (still present in the model).
  - `draft.webt` inside an entry folder marks the entry as a **draft**. Drafts are shown in `serve` (unless `--no-include-drafts` or `build.includeDrafts=false`), but are **removed** from the model/output during `build` (HTML, assets, export). The exported model is always written under `<outputDir>/_model`, even in serve.

IDs, slugs, and routes are **not** set during the raw scan.

---

## 6. Apply site config (collections)

If a collection is declared in `webette.config.ts` (`collections.<key>`), its settings override the raw scan where applicable:

- `path` (config) matches the folder; falling back to the config key
- `name` (config) overrides the display name (and is used as the base for the slug if no `slug` is provided)
- `slug` (config) overrides the generated slug
- `route` (config) overrides the base route for the collection; entries/blocks inherit this prefix

---

## 7. Enrich names/slugs/ids

After config is applied, Webette fills in the missing derived fields:

- Clean `name` when absent
- Generate `slug` (with de-duplication) unless provided by config
- Generate `id` from the final slug
- Entries/blocks receive their own slugs/ids based on folder/file names

---

## 8. Route generation

Webette assigns a URL path to each entity (site/collection/entry/block).

Default logic:

- Each collection uses its configured `route` if provided, otherwise its slug (`/blog/`, `/notes/`, etc.)
- Each entry lives under the collection route:

  - number prefix removed (`01-welcome` -> `welcome`)
  - slugified (`my first post` -> `my-first-post`)

Examples:

- `blog/01-welcome/` -> `/blog/welcome`
- `videos/my-video/` -> `/videos/my-video`

Blocks follow the same pattern:

- `blog/welcome/image.jpg` (extension only when present)
- `blog/welcome/gallery/` (folders end with a slash)

Routes stored in the model are root-relative (leading slash) to work from any entry page.

Plugins or config may override routing for collections or entries.

---

## 9. Template rendering

Webette combines:

- **entry data** (title, body, blocks, metadata)
- **collection data** (pagination, neighbors)
- **site data** (full `site.*` from `webette.config.ts`)
- **routes**

... and renders them using templates from:

1. The site’s templates folder (e.g. `templates/` under the site root when `templates.root` is relative)
2. Tool-level fallback templates (`templates.root` + `templates.default.wrapper/default.layout`)

Site templates win over the tool fallback. In serve mode, Webette watches the site templates when present, otherwise it watches the tool fallback.

The internal templating engine supports:

- `{{key}}` -> HTML-escaped
- `{{{key}}}` -> raw insertion (trusted HTML)
- nested paths like `{{site.author}}` or `{{site.meta.title}}`

Layouts wrap full pages; partials build reusable fragments (header, footer, navigation, etc.).

AST nodes become HTML here – Markdown paragraphs -> `<p>`, headings -> `<h1>`, custom blocks -> plugin-generated HTML, etc.

Markdown is parsed to an AST (remark/unified) then rendered to HTML; frontmatter headers (YAML/TOML/JSON at the top of the file) are ignored and not planned for now. Markdown blocks keep `raw`, `ast`, `html`, and lightweight metadata (e.g., `format`, `renderedWith`) in the model for templates/plugins. The remark plugins currently come from `webette.tool.ts` (`markdown.remarkPlugins`); site-level remark plugins are not yet supported.

---

## 10. Content transformations (AST & block transforms)

Plugins can:

- detect shortcodes and convert them into structured block nodes
  e.g. `[video src="https://youtube.com/..."]` -> `{ type: "block", name: "video", props: { ... } }`
- rewrite links (external, internal, collections-aware)
- insert metadata nodes
- transform fenced blocks into semantic components (notes, warnings, embeds)

Some plugins operate on blocks instead of AST nodes:

- merging multiple blocks into a unified structure
- extracting metadata from filenames
- generating computed data (lists, summaries, thumbnails)

All transformations happen **before rendering**, ensuring templates receive clean, structured data.

---

## 11. HTML post-processing

After rendering, plugins may adjust the output:

- inject global scripts (analytics, comments, client-side widgets)
- add metadata tags
- rewrite markup
- insert per-entry or global enhancements

This is the last opportunity to modify the page before writing it.

---

## 11. Template rendering

Webette combines:

- **entry data** (title, body, blocks, metadata)
- **collection data** (pagination, neighbors)
- **site data** (full `site.*` from `webette.config.ts`)
- **routes**

...and renders them using templates from:

1. The site’s templates folder (e.g. `templates/`)
2. Tool-level fallback templates (`templates.root` + `templates.default.wrapper/default.layout`)

Structure:

- Wrapper (`wrapper/…`): outer shell; calls `{{{renderLayout layoutName}}}`.
- Layouts (`layout/…`): registered as partials; actual page body.
- Partials (`partial/…`): reusable fragments.

Helpers:

- `renderLayout <name>`: pick a layout by name, fallback to `templates.default.layout`.
- Helpers: see `docs/helpers.md`.

## 12. HTML post-processing

After rendering, plugins or the core may adjust the output:

- pretty-printing (default: on) via rehype format/parse/stringify
- inject global scripts (analytics, comments, widgets)
- add metadata tags
- rewrite markup
- insert per-entry or global enhancements

## 13. Output

Generated HTML and assets are written to the folder defined by `build.outputDirName` (from `webette.tool.ts`).

- **Build output (`outputDir`)**: `<site root>/<build.outputDirName>` (default `_public`). Contains generated `index.html` per entry and media assets under `assets/images|audio|video`. Ignored names (e.g. `.webette`, `_public`, custom patterns) follow tool configuration rules. When `readContent=false` (e.g., `--skip-content`), resolvers are short-circuited: no file is read, no asset is copied or generated, pages are rendered with empty blocks.
- **Model export (`exportDir`)**: fixed to `<outputDir>/_model` (e.g., `_public/_model`). Always written on build. Contains `site.json` (site/config + collection summaries) and split entry files under `entries/<collection>/<entry>.json`, each carrying `createdAt`/`updatedAt`/`fingerprint` for site/collections/entries/blocks. With `build.exportModel.only` or `--export-model-only`, HTML generation is skipped but the export still runs.
- **Sitemap**: `sitemap.xml` is generated from the final model (drafts filtered according to `includeDrafts`). Uses `site.url` for absolute `<loc>` when provided; otherwise routes remain absolute-path. `lastmod` comes from the model timestamps (`updatedAt`/`createdAt`).
- **Prune (`overwrite=replace-files`)**: the output directory is kept, but any file not expected from the current model (pages/assets/export) is removed. Plugins can whitelist extra files via `ctx.addExpectedOutput(relativePath)` or whole folders/prefixes via `ctx.addExpectedDir(relativeDir)`. Draft entries are excluded from prune only when drafts are hidden (`includeDrafts=false`).

Media handling (core defaults): images optionally generate variants (if the engine is on) and always copy a default; audio and video are copied as-is to their configured output dirs with lightweight metadata (size/mime). Plugins handle transcodes or thumbnails.

Rendering: the template engine (Handlebars) renders **one `index.html` per entry** at its route. Minimal root/collection indexes are generated when `build.generateIndex` is enabled (default on) using the index layout. A static `404.html` is always generated via the not-found layout + wrapper. When `build.protectAssets` is enabled (default on), “access forbidden” placeholders (wrapper + dedicated layout) are rendered in all asset folders/subfolders.

Optional server helpers:

- `build.writeHtaccess` (off by default) writes a root `.htaccess` with `ErrorDocument 404 /404.html` and `Options -Indexes`.
- `build.writeNginxSample` (off by default) writes a `nginx.conf` example in the build output.
- Serve mode reuses the same build pipeline (with live reload) and watches the site root plus the site templates when present (fallback to tool templates otherwise).

---

## 14. Post-build

Plugins can perform final tasks:

- generate `sitemap.xml`
- generate RSS/Atom feeds
- write reports
- sync files externally
- clean temp files
- create an index of collections/entries for future tooling

Logs (in both console and JSONL format) reflect what happened during the build.

---

# Plugin Hooks (current)

Plugins are plain ESM modules (`.js`/`.mjs`) listed in `webette.config.ts` under `plugins: []` (paths relative to the site root, e.g. `"_plugins/my-plugin.js"`). Supported hooks:

- `onInit(ctx)` – after env/site load, before scan.
- `onScan(site, ctx)` – after scan/routes, before content resolution. Return a new `site` or mutate in-place.
- `onResolved(site, ctx)` – after content resolution, before timestamps/export. Return a new `site` or mutate in-place.
- `transformBlock(block, ctx)` – per-block mutation (depth-first). Return a new block or mutate.
- `transformEntry(entry, ctx)` – per-entry mutation after blocks. Return a new entry or mutate.
- `extendTemplates(handlebars, ctx)` – register helpers/partials/layouts before templates are compiled.
- `ctx.addExpectedOutput(relativePath)` — register extra files/assets you generate outside the model (paths relative to the build output dir) so the prune step (`overwrite=replace-files`) does not delete them.
- `ctx.addExpectedDir(relativeDir)` — whitelist an entire directory/prefix under the build output so prune keeps everything inside (useful for plugins that emit many assets).

Context (`ctx`) includes: `rootDir`, tool `env`, `logger`, `readContent`, `exportDir`, and `pluginId`. For `transformBlock` you also get `entry` and `collection`; for `transformEntry` you get `collection`.

Order of execution:

1. `onInit`
2. `onScan`
3. resolve blocks
4. `onResolved`
5. `transformBlock` (with recursion on subBlocks)
6. `transformEntry`
7. `extendTemplates` (during template setup)

Notes:

- Plugins run locally with full access; no sandboxing.
- Changes made in transform hooks affect timestamps/fingerprints in the exported model.
