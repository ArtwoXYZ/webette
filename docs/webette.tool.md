# webette.tool.ts — fields and expected values

This file configures the **tool** (build/serve behavior), not the site content. It is a TS module (`export default { ... }`). All fields are optional; defaults below apply when absent.

Site-specific settings (`images`, `audio`, `video`, `markdown`, `sorting`) belong in `webette.config.ts`.

## logging
- `level`: `"debug" | "info" | "warn" | "error"` (minimum level).
- `locale`: `"en" | "fr"` (log language).
- `dirName`: log folder name (default `.webette` under the site root).

## serve
- `port`: dev server port.
- `liveReloadIntervalMs`: live reload polling interval (ms).
- `watcherDebounceMs`: watcher debounce (ms).

## build
- `outputDirName`: output folder name (default `_public`).
- `overwrite`: `"none" | "replace-all" | "replace-files"` (overwrite policy).
  - `replace-all`: purge the output dir before each build.
  - Otherwise, Webette prunes orphaned outputs (pages/assets/model) that no longer exist in the current model, so deleted blocks/entries/collections disappear without a full clean; plugins should register custom outputs to avoid unintended deletion.
- `readContent`: `true|false` (skip content resolution).
- `exportModel`: object with `only` (`bool` to export model only). The export always runs and is written to `<outputDir>/_model`; `only` just skips HTML generation.
