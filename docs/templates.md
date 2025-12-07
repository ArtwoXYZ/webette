# Templates (Handlebars), wrapper + layout

Webette renders HTML with Handlebars. Each entry gets its own `index.html`; optional minimal root/collection indexes can be generated via the index layout (on by default). Templates can live in the site or fall back to the tool.

## Where templates come from

- Tool defaults are configured in `webette.tool.ts` (`templates.root`, `templates.defaultWrapper`, `templates.defaultLayout`, `templates.defaultIndexLayout`).
- The renderer looks first under the site root (`<site>/<templates.root>/...`), then falls back to the tool (`process.cwd()` + `templates.root`).
- Folder structure: `wrapper/` for the wrapper, `layout/` for layouts (registered as partials), `partial/` for classic partials (e.g. `templates/partial/header.hbs` -> `{{> header}}`). `layout/index.html` is the default index layout used for root/collection listings when index generation is enabled.
- Helper: the wrapper calls `{{{renderLayout layoutName}}}` which resolves the layout (partial) by name; `layoutName` defaults to `templates.defaultLayout`.

## Template syntax

- Handlebars with the usual helpers (`if`, `each`, `with`, etc.) plus a few built-ins registered by Webette:
  - `eq`, `neq`, `in`: simple comparisons/containment for conditions.
  - `safe`: outputs a string without escaping (use only for trusted HTML like rendered Markdown).
  - `first`, `firstBlockOfType`: pick the first item in an array, or the first block of a given type.
  - `withCollection <slugOrId>`: find a collection by slug/id/route and set it as the block context.
  - `withEntry <slugOrIdOrRoute>`: find an entry across collections and set it as the block context (also exposes `collection` in block data).
  - `renderLayout <name>`: render a layout partial by name (fallback to `templates.defaultLayout` when missing/empty).
- Variables are HTML-escaped by default; use `{{{...}}}` or `safe` for trusted HTML.

## Context available in templates

Every render gets the full model plus handy aliases:

- `model`: full site model (site + collections + entries + blocks)
- `site`: `model.site`
- `collections`: `model.collections`
- `collection`: the current entry’s collection (when rendering an entry)
- `entry`: the current entry
- `blocks`: `entry.blocks`
- `liveReloadScript`: raw script injected during `serve` (use `{{{liveReloadScript}}}`)

Routes in the model are root-relative (e.g. `/assets/images/...`), so they work from any entry page.

## Default wrapper + layout

- The fallback wrapper (`templates/wrapper/wrapper.html`) envelopes the page and delegates the body to a layout via `renderLayout`.
- The fallback layout (`templates/layout/post.html`) renders an entry (title, markdown/text/image/audio/video blocks).
- The fallback index layout (`templates/layout/index.html`) renders the root or collection listings (simple links + counters).

Sites can override wrapper and layouts by dropping their files under `<site>/<templates.root>/wrapper/...` and `<site>/<templates.root>/layout/...`; resolution order is site > tool.

## Inspecting the model (debug)

To inspect the in-memory model before rendering templates, enable the export:

- Tool config: set `build.exportModel.enabled` (and optionally `dir`, `only`) in `webette.tool.ts`.
- CLI: `--export-model-dir [path]` or `--export-model-only` (overrides the tool config for this run).

When enabled, the model is serialized right after scanning/resolution into a folder (default `.webette/_model` at the site root). Export is split: `site.json` plus one file per entry under `entries/<collection>/<entry>.json`. With the `only` option, HTML generation is skipped.
