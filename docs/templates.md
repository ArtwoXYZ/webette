# Templates (Handlebars), wrapper + layout

Webette renders HTML with Handlebars. Each entry gets its own `index.html`; optional minimal root/collection indexes can be generated via the index layout (on by default). Templates can live in the site or fall back to the tool.

## Where templates come from

- Tool defaults are configured in `webette.tool.ts` (`templates.root` and `templates.default.*`).
- The renderer looks first under the site root (`<site>/<templates.root>/...`), then falls back to the tool (`process.cwd()` + `templates.root`).
- Folder structure: `wrapper/` for the wrapper, `layout/` for layouts (registered as partials), `partial/` for classic partials (e.g. `templates/partial/header.hbs` -> `{{> header}}`). `layout/index.hbs` is the default index layout used for root/collection listings when index generation is enabled. `layout/access-forbidden.hbs` is the default layout used to render forbidden placeholders in asset folders. `layout/not-found.hbs` is the default layout used to render the static `404.html`.
- Helper: the wrapper calls `{{{renderLayout layoutName}}}` which resolves the layout (partial) by name; `layoutName` defaults to `templates.default.layout`.

## Template syntax

- Handlebars with the usual helpers (`if`, `each`, `with`, etc.) plus Webette’s built-ins (see `docs/helpers.md`).
- Variables are HTML-escaped by default; use `{{{...}}}` or `safe` for trusted HTML.

## Context available in templates

Every render gets the full model plus handy aliases:

- `model`: full site model (site + collections + entries + blocks)
- `site`: `model.site`
- `collections`: `model.collections`
- `collection`: the current entry's collection (when rendering an entry)
- `entry`: the current entry
- `blocks`: renderable blocks (filters out `skipRender` blocks)
- `entry.isDraft`: `true` when the entry folder contains `draft.webt` (visible in `serve` by default; stripped from `build` output)
- `block.content.meta.renderedInline`: `true` when a block is rendered inline in Markdown (e.g. internal image targets)
- `liveReloadScript`: raw script injected during `serve` (use `{{{liveReloadScript}}}`)
- `buildTime`: build timestamp (use with helpers like `formatDate` / `fromNow`)
- `templates.assetsBase`: base public path for template assets (only when `templates.assets` is configured)

Routes in the model are root-relative (e.g. `/assets/images/...`), so they work from any entry page.

## Default wrapper + layout

- The fallback wrapper (`templates/wrapper/wrapper.hbs`) envelopes the page and delegates the body to a layout via `renderLayout`.
- The fallback layout (`templates/layout/post.hbs`) renders an entry (title, markdown/text/image/audio/video blocks) and shows a simple draft badge when `entry.isDraft` is `true`.
- The fallback index layout (`templates/layout/index.hbs`) renders the root or collection listings (simple links + counters).
- The fallback access-forbidden layout (`templates/layout/access-forbidden.hbs`) renders minimal "Access forbidden" pages in asset folders.
- The fallback not-found layout (`templates/layout/not-found.hbs`) renders the static `404.html` page.

Sites can override wrapper and layouts by dropping their files under `<site>/<templates.root>/wrapper/...` and `<site>/<templates.root>/layout/...`; resolution order is site > tool.
If the site config does not declare `templates.root`, or if the directory is missing, Webette logs a warning and falls back to tool templates. If a site omits any `templates.default.*` key, Webette logs a warning and falls back to the tool defaults for that key.

## Custom index layouts

You can override index layouts separately from the default index layout:

```ts
templates: {
  root: "_templates",
  default: {
    index: "layout/index.hbs"
  },
  custom: {
    index: {
      root: "layout/index-root.hbs",
      collections: "layout/index-collection.hbs",
      collection: {
        posts: "layout/index-posts.hbs"
      }
    }
  }
}
```

Resolution order:
- Root index (`/index.html`): `custom.index.root` -> `default.index`
- Collection indexes: `custom.index.collection[slug]` -> `custom.index.collections` -> `default.index`

## Unlisted collections and entries

Add `unlisted.webt` to a collection or entry folder to remove it from index generation.
Unlisted collections and entries are excluded from the root/collection indexes and from the sitemap, but their pages are still generated. For unlisted collections, the collection folder receives a forbidden index rendered with `templates.default.accessForbidden`.

## Navigation block

Create a `navigation.webt` file inside an entry to build a custom, ordered list of collections and entries.
Each line defines one item:

```
name: My navigation
- title: First section
  - title: Posts, collection: posts
    - entry: draft
- title: Second section
  - collection: lab
    - title: Credits (anchored), collection: another-one, entry: credits#Audio
```

Rules:
- `name` is optional and sets `content.data.name` (first `name:` wins; empty `name:` lines are ignored).
- Items can declare `title`, `collection`, and/or `entry`.
- `title` is optional; it sets an item's display label (empty `title:` is ignored).
- Indentation is structural: `0` then `2` spaces per level (unlimited). Children are nested under `children` in the model.
- `collection` is required for collection items; `entry` items can omit `collection` when indented (they inherit the closest parent collection).
- Values can be collection/entry names or slugs.
- The list keeps the order defined in the file.
- If there are no items (empty file, or only `name:`), Webette expands it into a full index (each collection followed by its entries).
- You can append an anchor to entry items: `entry: slug#anchor` or `entry: slug#Heading text`.

The block does not auto-render. Use it in templates via `content.data.items` (tree):

```hbs
{{!-- navigation blocks are skipRender, so look them up in entry.blocks, not in blocks --}}
{{#with (firstBlockOfType entry.blocks "navigation")}}
  {{#if content.data.name}}
    <h2>{{content.data.name}}</h2>
  {{/if}}
  {{> navigation-items items=content.data.items}}
{{/with}}
```

Where `navigation-items` is a recursive partial that renders `items` and their optional `children`.

## Template assets

Sites can expose a templates assets folder (CSS/JS/images) via `templates.assets` in `webette.config.ts`:

```ts
templates: {
  root: "_templates",
  assets: {
    dir: "assets",
    publicBase: "/assets/theme"
  }
}
```

- `assets.dir` is relative to `templates.root` (or absolute if you pass an absolute path).
- `assets.publicBase` is the public URL prefix used in the build output.
- When configured, Webette copies the assets folder into the build output at `publicBase`.
- Use the `asset` helper in templates: `{{asset "css/init.css"}}`.

## Inspecting the model (debug)

The model export is always written after scan/resolution:

- Path: `<outputDir>/_model` (e.g., `_public/_model`); `--export-model-dir` is ignored.
- `--export-model-only` skips HTML generation but still writes the export.

Files: `site.json` plus one file per entry under `entries/<collection>/<entry>.json`, each carrying `createdAt`, `updatedAt`, and `fingerprint` for site/collections/entries/blocks. Use this to audit the data passed to templates or to track changes across builds.
