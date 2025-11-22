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
    "overwrite": "replace-files"
  }
}
```

### Fields

- `logging.level`: `debug` | `info` | `warn` | `error`
- `logging.locale`: `en` | `fr` (preferred over env vars)
- `logging.dirName`: folder for `.jsonl` logs (under the **site** root, e.g. `.webette`)
- `serve.port`: HTTP port for `webette serve`
- `serve.liveReloadIntervalMs`: polling interval for live reload
- `serve.watcherDebounceMs`: debounce for file watcher rebuilds
- `build.ignoreNames`: directory/file names to ignore in watcher (segments)
- `build.outputDirName`: output folder name (default `_public`)
- `build.overwrite`: `none` | `replace-all` | `replace-files`

## Consumption

- Loaded via `getEnv()` in `src/config/env.ts`.
- Locale resolution is centralized with `resolveLocale(config)`.
- Consumers (`build`, `serve`, `logger`) do **not** embed defaults; they rely on `getEnv()`.
