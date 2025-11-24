# Tool Configuration (`webette.tool.json`)

Webette has a small tool-level configuration file, independent from any site config. It lives next to the CLI (default: current working directory) and is resolved in this order:

1. Explicit path via `WEBETTE_TOOL_CONFIG` (absolute or relative to `process.cwd()`).
2. `process.cwd()/webette.tool.json` (typical when running from the repo root).
3. Fallback: two levels above `src/config/env.ts` (for bundled installs).

The file is plain JSON. A UTF-8 BOM is ignored if present.

## Shape

```json
{
  "logging": {
    "level": "info",
    "locale": "fr",
    "dirName": ".webette"
  },
  "serve": {
    "port": 4173,
    "liveReloadIntervalMs": 1000,
    "watcherDebounceMs": 150
  },
  "build": {
    "ignoreNames": ["_public", ".webette"],
    "outputDirName": "_public",
    "overwrite": "replace-files",
    "exportModel": {
      "enabled": false,
      "path": "__webette-model.json",
      "only": false
    }
  },
  "templates": {
    "root": "templates",
    "default": "wrapper.html"
  }
}
```

### Fields

- `logging.level`: `debug` | `info` | `warn` | `error`
- `logging.locale`: `en` | `fr` (preferred over env vars)
- `logging.dirName`: folder for `.jsonl` logs (under the **site** root, e.g. `.webette`)
- `serve.port`: HTTP port for the serve command (`bun run serve` today, target `webette serve`)
- `serve.liveReloadIntervalMs`: polling interval for live reload
- `serve.watcherDebounceMs`: debounce for file watcher rebuilds
- `build.ignoreNames`: directory/file names to ignore in watcher (segments)
- `build.outputDirName`: output folder name (default `_public`)
- `build.overwrite`: `none` | `replace-all` | `replace-files`
- `build.exportModel.enabled`: export the in-memory model to JSON after scanning
- `build.exportModel.path`: JSON path (relative to `outputDirName` if not absolute)
- `build.exportModel.only`: if `true`, skip HTML generation (export only)
- `templates.root`: base folder for internal/fallback templates (resolved from `process.cwd()` unless absolute)
- `templates.default`: default wrapper used when the site does not provide its own layout (relative to `templates.root`)

## Consumption

- Loaded via `getEnv()` in `src/config/env.ts`.
- Locale resolution is centralized with `resolveLocale(config)`.
- Consumers (`build`, `serve`, `logger`) do **not** embed defaults; they rely on `getEnv()`.
- `build` resolves the default wrapper at `path.join(templates.root, templates.default)`; this is only used as fallback when the site has no explicit layout.
