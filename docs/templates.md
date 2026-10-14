# Templates (Handlebars), wrapper + layout

Webette renders HTML with Handlebars. Each entry gets its own `index.html`; optional minimal **Automatic Index Pages** (root + collection) can be generated via the index layout (on by default). Sites must provide their own templates folder — Webette is an engine, not a starter.

## Where templates come from

- Tool defaults are configured in `webette.tool.ts` (`templates.root` and `templates.default.*`).
- Templates are loaded from the site root: `<site>/<templates.root>/...`. If the templates folder is missing, the build fails with a clear error indicating the expected path.
- Folder structure: `wrapper/` for the wrapper, `layout/` for layouts (registered as partials), `partial/` for classic partials (e.g. `_templates/partial/header.hbs` -> `{{> header}}`). `layout/index.hbs` is the default **Automatic Index Page** layout used for root/collection listings when index generation is enabled. `layout/access-forbidden.hbs` is the default layout used to render forbidden placeholders in asset folders. `layout/not-found.hbs` is the default layout used to render the static `404.html`.
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
- `prevEntry`: previous visible entry within the same collection (computed at render time; omitted when none)
- `nextEntry`: next visible entry within the same collection (computed at render time; omitted when none)
- `entry.isDraft`: `true` when the entry folder contains `draft.webt` (visible in `serve` by default; stripped from `build` output)
- `block.content.meta.renderedInline`: `true` when a block is rendered inline in Markdown (e.g. internal image targets)
- `liveReloadScript`: raw script injected during `serve` (use `{{{liveReloadScript}}}`)
- `buildTime`: build timestamp (use with helpers like `formatDate` / `fromNow`)
- `templates.assetsBase`: base public path for template assets (only when `templates.assets` is configured)

Routes in the model are root-relative (e.g. `/assets/images/...`), so they work from any entry page.

### Prev/next entry navigation

`prevEntry` and `nextEntry` are derived from the current collection order and follow Webette visibility rules:

- Unlisted entries are skipped.
- Draft entries are skipped when drafts are excluded (`build` always excludes drafts; `serve` can include them).

Both objects are small references:

```ts
type EntryNavRef = {
  id: string;
  name: string;
  displayName?: string;
  route: string;
};
```

Example (layout):

```hbs
{{#if prevEntry}}
  <a href="{{prevEntry.route}}">← {{displayName prevEntry}}</a>
{{/if}}
{{#if nextEntry}}
  <a href="{{nextEntry.route}}">{{displayName nextEntry}} →</a>
{{/if}}
```

## Default wrapper + layout

Sites must provide the following templates under `<site>/<templates.root>/`:

- `wrapper/wrapper.hbs` — envelopes the page and delegates the body to a layout via `renderLayout`.
- `layout/post.hbs` — renders an entry (title, markdown/text/image/audio/video blocks); shows a draft badge when `entry.isDraft` is `true`.
- `layout/index.hbs` — renders Root/Collection **Automatic Index Pages** (simple links + counters).
- `layout/access-forbidden.hbs` — renders minimal "Access forbidden" pages in asset folders.
- `layout/not-found.hbs` — renders the static `404.html` page.

If the templates folder does not exist at the expected path, the build fails immediately with an error message indicating the missing path.

## Automatic Index Page layouts

You can override Automatic Index Page layouts separately from the default index layout:

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
- Root Automatic Index Page (`/index.html`): `custom.index.root` -> `default.index`
- Collection Automatic Index Pages: `custom.index.collection[slug]` -> `custom.index.collections` -> `default.index`

## Per-entry layouts

You can override the default entry layout on a per-entry basis:

```ts
templates: {
  root: "_templates",
  default: {
    layout: "layout/post.hbs",
  },
  custom: {
    entry: {
      // key format: "<collectionSlug>/<entrySlug>" (falls back to ids if missing)
      "posts/webette-demonstration": "layout/post-feature.hbs",
      "pages/about": "layout/page.hbs",
    }
  }
}
```

Resolution order for entries:

1. `templates.custom.entry["<collection>/<entry>"]`
2. `templates.default.layout`

## Unlisted collections and entries

Add `unlisted.webt` to a collection or entry folder to remove it from Automatic Index Pages.
Unlisted collections and entries are excluded from Root/Collection Automatic Index Pages and from the sitemap, but their pages are still generated. For unlisted collections, the collection folder receives a forbidden index page rendered with `templates.default.accessForbidden`.

## Navigation Plan (`navigation.webt`)

Create a `navigation.webt` file inside an entry to build a **Navigation Plan**: a custom, ordered list of collections and entries.
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
- Optional header lines can configure auto-expansion (must appear before item lines):
  - `mode: collection` expands into a single collection instead of all collections.
  - `collection: current` uses the collection that contains the `navigation.webt` file.
  - `collection: <name>` uses a specific collection name or slug.
  - `hide collections: true|false` hides collection items (entries are promoted to the same level).
  - `hide entries: true|false` hides entry items.
  - `collections link: true|false` toggles links for collection items.
  - `entries link: true|false` toggles links for entry items.
    When a link is disabled, the item exposes `link: false` so templates can render a label instead of an `<a>`.
- Items can declare `title`, `collection`, and/or `entry`.
- `title` is optional; it sets an item's display label (empty `title:` is ignored).
- Indentation is structural: `0` then `2` spaces per level (unlimited). Children are nested under `children` in the model.
- `collection` is required for collection items; `entry` items can omit `collection` when indented (they inherit the closest parent collection).
- Values can be collection/entry names or slugs.
- The list keeps the order defined in the file.
- If there are no items (empty file, or only `name:`), Webette expands it into a full **Navigation Plan** (each collection followed by its entries).
- If `mode: collection` is set and there are no items, Webette expands it into a **single** collection (the chosen collection plus its entries).
- You can append an anchor to entry items: `entry: slug#anchor` or `entry: slug#Heading text`.

The block does not auto-render. Use it in templates via `content.data.items` (tree):

```hbs
{{!-- navigation is just another block type: render it where it appears in `blocks` --}}
{{#each blocks}}
  {{#if (eq type "navigation")}}
    {{#if content.data.name}}
      <h2>{{content.data.name}}</h2>
    {{/if}}
    {{> navigation-items items=content.data.items}}
  {{/if}}
{{/each}}
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

Files: `site.json` plus one file per entry (`entries/<collection>/<entry>.json`, `root-entries/<entry>.json`, `indexes/root.json`, `indexes/collections/<collection>.json`), each carrying `createdAt`, `updatedAt`, and `fingerprint` for site/collections/entries/blocks. Use this to audit the data passed to templates or to track changes across builds.
