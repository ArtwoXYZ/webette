# webette.tool.ts — fields and expected values

This file configures the tool (not the site). It is a TS module (`export default { ... }`). All fields are optional; defaults below apply when absent.

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

## templates
- `root`: templates folder (relative to the project).
- `default`: default wrapper file (relative to `root`).

## images
- `requiresImageEngine`: `true|false` (enable generation via sharp when available).
- `sizes`: object `{ small, medium, large }` in pixels (max width; optional height if provided).
- `format`: `"webp" | "avif" | "jpeg" | "png"` (target format).
- `quality`: number 1–100 (target quality).
- `fit`: `"cover" | "contain" | "fill" | "inside" | "outside"` (resize strategy).
  - `outputDir`: relative path under the output folder (and URL) where files are written (default `assets/images` under `_public`; routes are root-relative, e.g. `/assets/images/...`).
- `reencodeDefault`: `true|false` (re-encode the `default` variant without resizing when sharp is present; otherwise copy).

Notes:
- The site config (`webette.config.ts`, `images` section) can override these values and wins over the tool (notably `requiresImageEngine`).
- For images, `outputDir` is both the target folder and the public route prefix (`/assets/images/<collection>/<entry>/<block>@<variant>.<ext>`).
