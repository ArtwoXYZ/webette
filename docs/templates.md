# Templates and fallback wrapper

Webette renders HTML via simple templates plus a minimal replacement engine.

## Where templates come from

- Tool defaults are configured in `webette.tool.json` (`templates.root`, `templates.default`).
- The default wrapper lives at `path.join(process.cwd(), templates.root, templates.default)` (relative to the CLI working dir unless `templates.root` is absolute).
- When a site provides its own layout, it should live under its project root (e.g. `site/_templates` or `site/templates`). The build should prefer site templates over the tool fallback.

## Template syntax (internal engine)

- `{{key}}` is HTML-escaped.
- `{{{key}}}` is injected raw (for trusted HTML like the live reload script).
- No loops/conditions: complex fragments must be prepared in code and passed as strings.

## Placeholders available today

- `title`: site title (from `webette.config.ts` or fallback)
- `lang`: site language (from `webette.config.ts` or fallback)
- `liveReloadScript`: raw script injected when `serve`/live reload is enabled

These will expand alongside the data model (collections, entries, blocks) as the pipeline is implemented.
