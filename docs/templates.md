# Templates (Handlebars), wrapper + layout

Webette renders HTML with Handlebars. Each entry gets its own `index.html`; optional minimal root/collection indexes can be generated via the index layout (on by default). Templates can live in the site or fall back to the tool.

## Where templates come from

- Tool defaults are configured in `webette.tool.ts` (`templates.root` and `templates.default.*`).
- The renderer looks first under the site root (`<site>/<templates.root>/...`), then falls back to the tool (`process.cwd()` + `templates.root`).
- Folder structure: `wrapper/` for the wrapper, `layout/` for layouts (registered as partials), `partial/` for classic partials (e.g. `templates/partial/header.hbs` -> `{{> header}}`). `layout/index.html` is the default index layout used for root/collection listings when index generation is enabled. `layout/access-forbidden.html` is the default layout used to render forbidden placeholders in asset folders. `layout/not-found.html` is the default layout used to render the static `404.html`.
- Helper: the wrapper calls `{{{renderLayout layoutName}}}` which resolves the layout (partial) by name; `layoutName` defaults to `templates.default.layout`.

## Template syntax

- Handlebars with the usual helpers (`if`, `each`, `with`, etc.) plus Webette’s built-ins (see `docs/helpers.md`).
- Variables are HTML-escaped by default; use `{{{...}}}` or `safe` for trusted HTML.

## Context available in templates

Every render gets the full model plus handy aliases:

- `model`: full site model (site + collections + entries + blocks)
- `site`: `model.site`
- `collections`: `model.collections`
- `collection`: the current entry’s collection (when rendering an entry)
- `entry`: the current entry
- `blocks`: `entry.blocks`
- `entry.isDraft`: `true` when the entry folder contains `draft.webt` (visible in `serve` by default; stripped from `build` output)
- `block.content.meta.renderedInline`: `true` when a block is rendered inline in Markdown (e.g. internal image targets)
- `liveReloadScript`: raw script injected during `serve` (use `{{{liveReloadScript}}}`)
- `buildTime`: build timestamp (use with helpers like `formatDate` / `fromNow`)

Routes in the model are root-relative (e.g. `/assets/images/...`), so they work from any entry page.

## Default wrapper + layout

- The fallback wrapper (`templates/wrapper/wrapper.html`) envelopes the page and delegates the body to a layout via `renderLayout`.
- The fallback layout (`templates/layout/post.html`) renders an entry (title, markdown/text/image/audio/video blocks) and shows a simple draft badge when `entry.isDraft` is `true`.
- The fallback index layout (`templates/layout/index.html`) renders the root or collection listings (simple links + counters).
- The fallback access-forbidden layout (`templates/layout/access-forbidden.html`) renders minimal "Access forbidden" pages in asset folders.
- The fallback not-found layout (`templates/layout/not-found.html`) renders the static `404.html` page.

Sites can override wrapper and layouts by dropping their files under `<site>/<templates.root>/wrapper/...` and `<site>/<templates.root>/layout/...`; resolution order is site > tool.
If the site config does not declare `templates.root`, or if the directory is missing, Webette logs a warning and falls back to tool templates. If a site omits any `templates.default.*` key, Webette logs a warning and falls back to the tool defaults for that key.

## Inspecting the model (debug)

The model export is always written after scan/resolution:

- Path: `<outputDir>/_model` (e.g., `_public/_model`); `--export-model-dir` is ignored.
- `--export-model-only` skips HTML generation but still writes the export.

Files: `site.json` plus one file per entry under `entries/<collection>/<entry>.json`, each carrying `createdAt`, `updatedAt`, and `fingerprint` for site/collections/entries/blocks. Use this to audit the data passed to templates or to track changes across builds.
