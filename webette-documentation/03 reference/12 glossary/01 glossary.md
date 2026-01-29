# Glossary (webette)

This page defines the key terms used throughout the webette documentation.
It is written as a reference for the current implementation.

## webette

webette is a filesystem-first static site generator: it scans a folder (the site root), builds a model (site/collections/entries/blocks), then renders static HTML and assets.

The project name is written fully in lowercase: `webette`.

## Site root

The folder you run webette against. It typically contains:

- `webette.config.ts` (site configuration)
- collection folders (your content)
- a templates folder (usually `_templates/`)

Build output is written to `<site root>/_public` (by default).

## Collection

A top-level folder under the site root that groups entries.
Collections are discovered automatically (some folders are ignored, e.g. output/templates/internal).

## Entry

A folder inside a collection. Today, each entry generally becomes one generated page (`index.html`) at the entry route.

## Block

A file (or subfolder) inside an entry. Blocks have a `type` (e.g. markdown, image, audio), a `path` (POSIX relative), and can carry resolved `content`.

## Block type

A lightweight classification derived from the filesystem:

- `markdown`: `.md` / `.markdown` / `.mdown`
- `text`: `.txt` when `treatTxtAsMarkdown=false`
- `image`: `.jpg/.png/.webp/.svg/...`
- `audio`: `.mp3/.wav/.ogg/...`
- `video`: `.mp4/.mov/.webm/...`
- `folder`: directories inside entries (nested blocks)
- `unclassified`: anything else (meant to be handled by plugins)
- `navigation`: the special `navigation.webt` block (Navigation Plan)

## Resolver

Code that resolves a block into content (reading files, extracting metadata, copying/generating assets, etc.). Resolvers also set the final asset route for media blocks.

## Slug

A URL-safe identifier derived from names (with deduplication). Slugs are used for routes, IDs, and file naming.

## Route

A root-relative URL path (e.g. `/posts/my-entry/`). Routes exist for collections and entries, and are used for output directories.

## Ordering (numeric prefixes)

Entries and blocks are sorted deterministically:

1. numeric prefix when present (`01 ...`, `2 ...`, etc.)
2. then alphabetical order

This is used for lists and Automatic Index Pages.

## Site configuration (`webette.config.ts`)

Configuration of one site (metadata, collection overrides, templates overrides, plugins, Automatic Index Pages, and optional overrides for markdown/media).

## Tool configuration (`webette.tool.ts`)

Configuration of the webette tool/runtime (logging, build defaults, overwrite policy, template defaults, image pipeline defaults, etc.). It acts as global defaults for sites.

## Templates root

The folder where templates live (commonly `_templates/` in a site). webette can fall back to tool templates when the site has none.

## Wrapper

The outer HTML shell template. It typically injects the chosen layout inside it.

## Layout

The main page body template (rendered inside the wrapper). Layouts decide how an entry is presented.

## Partial

Reusable template fragments (e.g. header/footer) included from wrapper/layouts.

## Helpers

Built-in Handlebars helpers available in templates (e.g. `image`, `asset`, `withEntry`, string/date/math helpers).

## Template assets

Optional folder of static assets (CSS/JS/images) shipped with the templates and copied to the build output (configured via `templates.assets`).

## Plugin

An optional ESM module loaded from disk and enabled in `webette.config.ts`. Plugins can mutate the model, blocks, entries, and templates.

## Plugin hooks (lifecycle)

Named steps where plugins can run, such as:
`onInit`, `onScan`, `onResolved`, `transformBlock`, `transformEntry`, `extendTemplates`.

## Expected outputs (prune contract)

When prune is enabled, webette removes files not expected from the current model. Plugins that write extra files should register them via:

- `ctx.addExpectedOutput(relativePath)`
- `ctx.addExpectedDir(relativeDir)`

## Draft (`draft.webt`)

A marker file inside an entry folder. Draft entries are visible in `serve` by default (configurable) but are removed from `build` output.

## Unlisted (`unlisted.webt`)

A marker file inside a collection or entry:

- Excluded from Automatic Index Pages
- Excluded from `sitemap.xml`
- Pages can still exist at their routes

Unlisted collections get a "forbidden" Automatic Index Page in their collection route.

## Ignore (`ignore.webt`)

A file listing names of blocks to exclude from automatic rendering. The blocks remain in the model, but templates won't receive them in the default renderable blocks list.

## Description (`description.webt`)

A raw text file stored as:

- `collection.description` when placed at the root of a collection
- `entry.description` when placed inside an entry folder

## Name (`name.webt`)

A display name stored as:

- `collection.displayName` when placed at the root of a collection
- `entry.displayName` when placed inside an entry folder

## Collection assets (`_assets/`)

A special folder at the root of a collection that can contain media files (images/audio/video). These files are processed and exposed as `collection.assets`.

## Automatic Index Pages

When enabled (`build.generateIndex=true`), webette generates:

- a **Root Automatic Index Page** (`/index.html`) listing collections
- a **Collection Automatic Index Page** (`/<collection>/index.html`) listing entries

## Index Override

A config mechanism (`index.root`, `index.collections`) that renders a specific unlisted entry as a Root/Collection Automatic Index Page.

## Navigation Plan (`navigation.webt`)

A special block that defines an ordered list of collections and/or entries. It is **data**, not UI: templates read `content.data.items` to display it.

It can optionally declare a display name:

- `name: My navigation` sets `content.data.name` (first `name:` wins; empty `name:` lines are ignored).
- If there are no item lines (empty file, or only `name:`), webette expands it into a full **Navigation Plan** (each collection followed by its entries).
- If you add `mode: collection` before any items, webette expands into a **single** collection.
- Use `collection: current` (or a collection name/slug) to pick which collection is expanded.
- Optional header options (before any items):
  - `hide collections: true|false` hides collection items (entries are promoted).
  - `hide entries: true|false` hides entry items.
  - `collections link: true|false` toggles links for collection items.
  - `entries link: true|false` toggles links for entry items.
  - When a link is disabled, the item exposes `link: false` for templates.

Items are hierarchical:

- Indentation is structural: `0` then `2` spaces per level (unlimited).
- Nested items are stored under `children` in the parent item.
- Each item can declare `title`, `collection`, and/or `entry`.
  - `title` without `collection`/`entry` creates a pure heading item (`kind: "title"`).
  - `title` with `collection`/`entry` sets the display label for that link.
- `entry` items can omit `collection` when indented (they inherit the closest parent collection).

## Site Menu (Navigation UI)

The visual output (menu/sidebar/TOC) rendered by templates **from a Navigation Plan**.  
This is a theme/UI concept, not a Webette block.

## Model export (`_public/_model`)

An export of the in-memory model written during build. Useful for debugging what templates/plugins receive.

## Fingerprint

`fingerprint` is a stable hash stored on site/collection/entry/block objects in the model export. webette uses it to detect whether something changed since a previous build so it can keep `createdAt` stable and only bump `updatedAt` when needed.

The fingerprint is computed from a deterministic serialization of selected fields (structure + routes + relevant resolved content). When `--skip-content` is used, webette falls back to file metadata (like size/mtime) to avoid marking everything as changed.

## Overwrite policy

Controls what happens to existing output:

- `replace-all`: wipe output dir before build
- `replace-files`: keep the output directory, overwrite regenerated files when content changes, and prune orphaned outputs (files that are no longer expected)
- `none`: refuse to overwrite

## Protect assets (`build.protectAssets`)

When enabled, webette writes "forbidden" placeholder `index.html` files into asset folders to discourage directory listing.

## Starter

A "starter" is a site folder template you can copy/zip to bootstrap a new site quickly.

### Skelette starter

A minimal starter: focuses on structure and templates with little or no styling.

### Full starter

A polished starter: includes a complete design (CSS, layouts, components) and richer example content.

## Build

The `build` command generates a static output site (HTML + assets + model export) under the output directory (by default: `_public/`). Draft entries are excluded from build output.

## Serve

The `serve` command runs a local dev server and rebuilds on changes. It uses the same pipeline as build, but is optimized for development (including live reload). Draft entries are typically visible in serve.

## Content resolution

`readContent` controls whether webette reads and resolves block contents during a run.
When `--skip-content` is enabled, webette keeps the structure (collections/entries/blocks/routes) but skips resolvers and content extraction (no markdown HTML, no media metadata/variants, no copied/generated assets).

## Skipped rendering

A block flag meaning "do not render automatically". Blocks marked `skipRender` stay in the model, but are excluded from the default renderable `blocks` list passed to templates.

`skipRender` is set for files listed in `ignore.webt`, and also for `navigation.webt` (the block is meant to be read by templates, not auto-rendered).

## Nested blocks

An entry can contain folders. webette treats a folder as a block that contains other blocks. Those children are called nested blocks.

## Internal targets

A webette-specific linking syntax used inside Markdown or templates to reference site entities by name/slug:

- `collection: posts`
- `entry: my entry`
- `block: image.jpg`
- combined forms like `collection: posts, entry: my entry, block: image.jpg`

webette rewrites these targets to real routes after the model is resolved.

## Inline rendering

When an image block is rendered inline from Markdown (e.g. via a `block:` image target), webette marks the block as `content.meta.renderedInline = true` so templates can avoid rendering the same image twice.

## Image variants

- `variants`: generated image outputs (e.g. `small`, `medium`, `large`) attached to an image block.
- `defaultVariant`: the preferred variant to render when templates request an image (falls back to the original route if unavailable).
- `requiresImageEngine`: whether webette should generate variants using the optional image engine (sharp). If disabled or missing, webette falls back to copying the original and aliasing variants.
