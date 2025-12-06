# Build Pipeline and Plugin Hooks

> ⚠️ This document is aspirational. The current prototype stops after scanning and resolving basic block content, exports the model, and renders a single fallback wrapper. The phases and hooks below describe the intended direction, not the implemented behavior today.

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
11. Render **templates** (layouts + partials)
12. HTML post-processing
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

1. The site’s templates folder (e.g. `_templates/`)
2. Tool-level fallback templates (`templates.root` + `templates.default`)

The internal templating engine supports:

- `{{key}}` -> HTML-escaped
- `{{{key}}}` -> raw insertion (trusted HTML)
- nested paths like `{{site.author}}` or `{{site.meta.title}}`

Layouts wrap full pages; partials build reusable fragments (header, footer, navigation, etc.).

AST nodes become HTML here – Markdown paragraphs -> `<p>`, headings -> `<h1>`, custom blocks -> plugin-generated HTML, etc.

Markdown is parsed to an AST (remark/unified) then rendered to HTML; frontmatter headers (YAML/TOML/JSON at the top of the file) are ignored and not planned for now. Markdown blocks keep `raw`, `ast`, `html`, and lightweight metadata (e.g., `format`, `renderedWith`) in the model for templates/plugins.

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

## 12. Output

Generated HTML and assets are written to the folder defined by `build.outputDirName` (from `webette.tool.ts`).

- **Build output (`outputDir`)**: `<site root>/<build.outputDirName>` (default `_public`). Contains generated `index.html` per entry and media assets under `assets/images|audio|video`. Ignored names (e.g. `.webette`, `_public`, custom patterns) follow tool configuration rules.
- **Model export (`exportDir`)**: `<site root>/<build.exportModel.dir>` (default `.webette/_model`). Only written when `build.exportModel.enabled` (tool config) or CLI export flags are set. Contains `site.json` (site/config + collections + entry summaries) and split entry files under `entries/<collection>/<entry>.json`. With `build.exportModel.only` or `--export-model-only`, HTML generation is skipped.

Media handling (core defaults): images optionally generate variants (if the engine is on) and always copy a default; audio and video are copied as-is to their configured output dirs with lightweight metadata (size/mime). Plugins handle transcodes or thumbnails.

Rendering: the template engine (Handlebars) renders **one `index.html` per entry** at its route. There is no global index/listing generated by default.

---

## 13. Post-build

Plugins can perform final tasks:

- generate `sitemap.xml`
- generate RSS/Atom feeds
- write reports
- sync files externally
- clean temp files
- create an index of collections/entries for future tooling

Logs (in both console and JSONL format) reflect what happened during the build.

---

# Plugin Hooks

Here are the conceptual hooks available to plugins. Names may evolve but the stages are stable.

## Configuration

### `onLoadSiteConfig(siteConfig, env)`

Triggered after site config and environment are resolved.

Use cases:

- validate config
- inject defaults
- extend the site schema

---

## Collections & entries

### `onCollectionsDiscovered(collections, ctx)`

Adjust collections after scanning folders.

### `onEntriesDiscovered(entries, ctx)`

Modify or augment entries before block loading.

---

## Blocks & content

### `registerBlocks()`

Declare support for new block types or file formats.

### `onBlocksLoaded(entry, blocks, ctx)`

Called once all blocks for an entry are parsed.

### `transformContent(entryContent, ctx)`

Operate on:

- **AST** (Markdown blocks)
- block-derived data
- entry-level computed values

Future versions may add a more precise hook like `transformAst(ast, ctx)` for AST-specific operations.

---

## Routes & templates

### `onRoutesResolved(routes, ctx)`

Modify or augment final routes.

### `onRenderEntry(entry, html, ctx)`

Per-entry HTML adjustments.

### `onRenderHTML(html, ctx)`

Global HTML post-processing.

---

## Build completion

### `onBuildComplete(result, ctx)`

Final stage for generating extra files or exporting data.

---

# Plugin categories (from the glossary)

- **Block plugins** -> `registerBlocks()`, `onBlocksLoaded()`
- **Enrichment plugins** -> `transformContent()` (AST-focused)
- **Functional plugins** -> `onRoutesResolved()`, `onRenderHTML()`, `onBuildComplete()`

Plugins may implement any mix of these.

---

# Notes

- AST is central to Webette's content pipeline.
- Collections, entries, blocks, templates, and routes follow the definitions in the glossary.
- Site configuration and tool configuration remain strictly separated by design.
