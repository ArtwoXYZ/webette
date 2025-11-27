# Templates and fallback wrapper

> ⚠️ Directional note: templates de site, layouts/partials et rendu par collection/entrée ne sont pas encore implémentés. Aujourd’hui seul le wrapper de fallback du tool est utilisé pour générer `_public/index.html`.

Webette renders HTML via simple templates plus a minimal replacement engine.

## Where templates come from

- Tool defaults are configured in `webette.tool.ts` (`templates.root`, `templates.default`).
- The default wrapper lives at `path.join(process.cwd(), templates.root, templates.default)` (relative to the CLI working dir unless `templates.root` is absolute).
- When a site provides its own layout, it should live under its project root (e.g. `site/_templates` or `site/templates`). The build should prefer site templates over the tool fallback.

## Template syntax (internal engine)

- `{{key}}` is HTML-escaped.
- `{{{key}}}` is injected raw (for trusted HTML like the live reload script).
- No loops/conditions: complex fragments must be prepared in code and passed as strings.

## Placeholders available today

- `site.*`: full `site` section from `webette.config.ts` (e.g. `{{site.title}}`, `{{site.lang}}`, `{{site.author}}`)
- `liveReloadScript`: raw script injected when `serve`/live reload is enabled
- `route`: available on site/collection/entry/block in the exported model; routes are slug-based (`collection/entry/`, `collection/entry/block[...][.ext]`, trailing slash for folders)

These will expand alongside the data model (collections, entries, blocks) as the pipeline is implemented.

## Inspecting the model (debug)

To inspect the in-memory model before rendering templates, enable the export:

- Tool config: set `build.exportModel.enabled` (and optionally `dir`, `only`) in `webette.tool.ts`.
- CLI: `--export-model-dir [path]` or `--export-model-only` (overrides the tool config for this run).

When enabled, the model is serialized right after scanning, before HTML rendering, into a folder (default `.webette/_model` at the site root). Export is split: `site.json` contains site/config + collections (sans entries), and each entry is written to `entries/<collection>/<entry>.json`. With the `only` option, the HTML step is skipped so you can focus on the data.
