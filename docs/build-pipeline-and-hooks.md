# Build Pipeline and Plugin Hooks

This document explains how Webette processes a **site root**, how it discovers **collections**, **entries**, and **blocks**, how it transforms **content** using an **AST**, and how **plugins** can hook into each stage.

The goal is to describe the conceptual flow of a Webette build.

---

# Overview

A Webette build runs through these major phases:

1. Load **tool configuration** (`webette.tool.json`)
2. Load **site configuration** (`webette.config.ts`)
3. Discover **collections**
4. Discover **entries**
5. Read and parse **blocks**
6. Parse Markdown into an **AST**
7. Transform content (AST transforms, block transforms, enrichment plugins)
8. Generate **routes**
9. Render **templates** (layouts + partials)
10. HTML post-processing
11. Write output
12. Run post-build hooks

Each step exposes hooks plugins can use to extend or alter the behavior.

---

# Build Cycle

## 1. Tool configuration

`webette.tool.json` defines settings used by the Webette **tool**, not by a specific site:

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

## 3. Collections discovery

Every folder in the **site root** is considered a **collection**, except for:

- the templates folder (e.g. `_templates/`)
- the Webette internal folder (e.g. `.webette/`, configurable)

Examples of valid collections:

- `blog/`
- `notes/`
- `videos/`
- `recipes/`

Collections are not reserved; they are simply directories.

Configuration may define extra behavior per collection (sorting, template mapping, routing rules).

---

## 4. Entry discovery

Each collection contains **entries**, which are usually:

- folders (e.g. `01-welcome/`)
- containing blocks of content (Markdown, images, JSON, etc.)

Entries are sorted using the glossary rule:

1. Leading number (if any)
2. Alphabetical order as fallback or tie-breaker

Entries generally correspond to pages.

---

## 5. Block discovery & parsing

Inside each entry folder, Webette identifies **blocks**:

- Markdown blocks (`index.md`, `content.md`)
- Media blocks (images, videos)
- Data blocks (`meta.json`, YAML files)
- Any custom format handled by **block plugins**

Block plugins define:

- how to read a given file type
- how to parse it into structured data
- how to expose that data to templates

---

## 6. Parsing Markdown into an AST

Markdown is converted into an **Abstract Syntax Tree (AST)**.

This is a structured representation of content:

- text nodes
- paragraphs
- headings
- emphasis / strong
- images
- links
- lists
- code blocks
- custom fenced blocks
- shortcodes
- etc.

Why an AST?

- It allows plugins to safely transform content without fragile text manipulation.
- It makes it easy to detect patterns (embedded videos, callouts, etc.).
- It allows generating **custom block nodes** in a structured, predictable way.

Webette's AST stage is where raw Markdown becomes a rich, manipulable representation.

---

## 7. Content transformations (AST & block transforms)

This stage includes **all transformations** applied before rendering:

### AST transforms

Plugins can:

- detect shortcodes and convert them into structured block nodes
  e.g. `[video src="https://youtube.com/…"]` → `{ type: "block", name: "video", props: { … } }`
- rewrite links (external, internal, collections-aware)
- insert metadata nodes
- transform fenced blocks into semantic components (notes, warnings, embeds)

### Block-level transforms

Some plugins operate on blocks instead of AST nodes:

- merging multiple blocks into a unified structure
- extracting metadata from filenames
- generating computed data (lists, summaries, thumbnails)

All transformations happen **before rendering**, ensuring templates receive clean, structured data.

---

## 8. Route generation

Webette assigns a URL path to each entry.

Default logic:

- Each collection becomes a base segment (`/blog/`, `/notes/`, etc.)
- Each entry becomes a slug:

  - number prefix removed (`01-welcome` → `welcome`)
  - slugified (`my first post` → `my-first-post`)

Plugins or config may override routing for collections or entries.

Examples:

- `blog/01-welcome/` → `/blog/welcome`
- `videos/my-video/` → `/videos/my-video`

---

## 9. Template rendering

Webette combines:

- **entry data** (title, body, blocks, metadata)
- **collection data** (pagination, neighbors)
- **site data** (full `site.*` from `webette.config.ts`)
- **routes**

… and renders them using templates from:

1. The site’s templates folder (e.g. `_templates/`)
2. Tool-level fallback templates (`templates.root` + `templates.default`)

The internal templating engine supports:

- `{{key}}` → HTML-escaped
- `{{{key}}}` → raw insertion (trusted HTML)
- nested paths like `{{site.author}}` or `{{site.meta.title}}`

Layouts wrap full pages; partials build reusable fragments (header, footer, navigation, etc.).

AST nodes become HTML here — Markdown paragraphs → `<p>`, headings → `<h1>`, custom blocks → plugin-generated HTML, etc.

---

## 10. HTML post-processing

After rendering, plugins may adjust the output:

- inject global scripts (analytics, comments, client-side widgets)
- add metadata tags
- rewrite markup
- insert per-entry or global enhancements

This is the last opportunity to modify the page before writing it.

---

## 11. Output

Generated HTML and assets are written to the folder defined by:

```
build.outputDirName (from webette.tool.json)
```

Ignored names (e.g. `.webette`, `_public`, custom patterns) follow tool configuration rules.

The output is a complete static site.

Optional debug/export step:

- If `build.exportModel.enabled` (tool config) or the CLI flag `--export-model` is set, the in-memory model (site, collections, entries, blocks) is serialized to JSON in the output folder (default `__webette-model.json`). This happens right after scanning, before HTML rendering. With `build.exportModel.only` or `--export-model-only`, Webette skips HTML generation and only writes the JSON.

---

## 12. Post-build

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

This is where embed detection, shortcode parsing, and rich transformations happen.

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

- **Block plugins** → `registerBlocks()`, `onBlocksLoaded()`
- **Enrichment plugins** → `transformContent()` (AST-focused)
- **Functional plugins** → `onRoutesResolved()`, `onRenderHTML()`, `onBuildComplete()`

Plugins may implement any mix of these.

---

# Notes

- AST is central to Webette’s content pipeline.
- Collections, entries, blocks, templates, and routes follow the definitions in the glossary.
- Site configuration and tool configuration remain strictly separated by design.
