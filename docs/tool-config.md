# Tool Configuration (`webette.tool.ts`)

Webette has a small tool-level configuration file in TS, independent from any site config. It lives next to the CLI (default: current working directory) and is resolved in this order:

1. Explicit path via `WEBETTE_TOOL_CONFIG` (absolute or relative to `process.cwd()`).
2. `process.cwd()/webette.tool.ts` (typical when running from the repo root).
3. Fallback: two levels above `src/config/env.ts` (for bundled installs).

The file is transpiled (TS). A UTF-8 BOM is ignored if present.

## Shape (example)

```ts
export default {
  logging: { level: "info", locale: "fr", dirName: ".webette" },
  serve: { port: 4173, liveReloadIntervalMs: 1000, watcherDebounceMs: 150 },
  build: {
    outputDirName: "_public",
    overwrite: "replace-files",
    readContent: true,
    prettyPrint: true,
    generateIndex: true,
    protectAssets: true,
    writeHtaccess: false,
    writeNginxSample: false,
    exportModel: { dir: ".webette/_model", only: false },
  },
  markdown: { remarkPlugins: [], treatTxtAsMarkdown: true },
  templates: {
    root: "templates",
    defaultWrapper: "wrapper/wrapper.html",
    defaultLayout: "layout/post.html",
    defaultIndexLayout: "layout/index.html",
    notFoundLayout: "layout/not-found.html",
    accessForbiddenLayout: "layout/access-forbidden.html",
  },
  images: {
    requiresImageEngine: false,
    sizes: { small: 480, medium: 960, large: 1440 },
    format: "webp",
    quality: 80,
    fit: "cover",
    outputDir: "assets/images",
    reencodeDefault: false,
  },
  video: { outputDir: "assets/video" },
  audio: { outputDir: "assets/audio" },
};
```

### Fields

- `logging.level`: `debug` | `info` | `warn` | `error`
- `logging.locale`: `en` | `fr` (preferred over env vars)
- `logging.dirName`: folder for `.jsonl` logs (under the **site** root, e.g. `.webette`)
- `serve.port`: HTTP port for the serve command (`bun run serve` today, target `webette serve`)
- `serve.liveReloadIntervalMs`: polling interval for live reload
- `serve.watcherDebounceMs`: debounce for file watcher rebuilds
- `build.outputDirName`: output folder name (default `_public`)
- `build.overwrite`: `none` | `replace-all` | `replace-files`
- `build.readContent`: whether to read/resolve block contents during build/serve (default `true`; set to `false` to only scan structure)
- `build.prettyPrint`: pretty-format generated HTML via rehype (default `true`)
- `build.generateIndex`: generate root/collection index pages (default `true`)
- `build.protectAssets`: write a forbidden `index.html` in asset folders (default `true`)
- `build.writeHtaccess`: write a root `.htaccess` with `ErrorDocument 404 /404.html` and `Options -Indexes` (Apache only, default `false`)
- `build.writeNginxSample`: write a sample `nginx.conf` in the build output (default `false`)
- `build.exportModel.dir`: folder for the split export (default `.webette/_model`, under the site root if relative). The export always runs.
- `build.exportModel.only`: if `true`, skip HTML generation (export only)
- `markdown.remarkPlugins`: list of remark plugins applied during Markdown parsing/rendering (e.g. `["remark-gfm", ["remark-footnotes", { inlineNotes: true }]]`)
- `markdown.treatTxtAsMarkdown`: when `true`, `.txt` files use the Markdown pipeline; set to `false` to keep plain text blocks
- `templates.root`: base folder for internal/fallback templates (resolved from `process.cwd()` unless absolute)
- `templates.defaultWrapper`: wrapper used when the site does not provide its own (relative to `templates.root`)
- `templates.defaultLayout`: layout partial used when the site does not provide its own (relative to `templates.root`)
- `templates.defaultIndexLayout`: index layout used for root/collection listings (relative to `templates.root`)
- `templates.notFoundLayout`: layout used to render the static `404.html` page (relative to `templates.root`)
- `templates.accessForbiddenLayout`: layout used for asset-folder forbidden pages (relative to `templates.root`)
- `images.*`: defaults for the image pipeline (engine on/off, sizes, format/quality/fit, `outputDir`, `reencodeDefault`); site config (`webette.config.ts`) can override.
- `video.outputDir`: relative folder under the build output for copied video assets (no transcode in core; plugins handle variants/thumbnails)
- `audio.*`: defaults for audio handling (`outputDir`); originals are copied to `outputDir`.

## Consumption

- Loaded via `getEnv()` in `src/config/env.ts`.
- Locale resolution is centralized with `resolveLocale(config)`.
- Consumers (`build`, `serve`, `logger`) do **not** embed defaults; they rely on `getEnv()`.
- `build` resolves the default wrapper at `path.join(templates.root, templates.default)`; this is only used as fallback when the site has no explicit layout.
- Markdown parsing/rendering uses `markdown.remarkPlugins` when converting `.md` blocks to AST/HTML.
- CLI override: `--skip-content` sets `readContent` to `false` for that run.
