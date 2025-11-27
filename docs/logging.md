# Logging

Webette uses a structured, locale-aware logger:

- Levels: `debug`, `info`, `warn`, `error` (filtered by min level).
- Locales: `en`, `fr` (message catalogs in `locales/<lang>/logs.json`).
- Output: console (rendered), plus `.jsonl` persistence under `<site>/<dirName>/logs.jsonl`.
- Scoping: hierarchical (e.g., `webette.cli.serve.build`).

## Configuration

- Locale and min level come from the tool config (`webette.tool.ts`) via `getEnv()` / `resolveLocale()`.
- `logging.dirName` controls where logs are written inside the **site** root (default `.webette`).
- Verbose flag (`-v`) forces `debug` min level.

## API

- `createProjectLogger(rootDir, scope, verbose)` → Logger (async).
- `logger.child(scope)` → child logger sharing config and log file.
- Methods: `debug`, `info`, `warn`, `error` accept a `messageKey` plus optional params.

## Messages

- Keys and templates live in `locales/en/logs.json` and `locales/fr/logs.json`.
- Interpolation uses `{name}` placeholders.

## Notes

- Logs are persisted in neutral format (no rendered text) for future web UI/remote export.
- Locale fallback is normalized; env vars (`WEBETTE_LANG`/`LANG`) are only a fallback if the tool config does not set `logging.locale`.
