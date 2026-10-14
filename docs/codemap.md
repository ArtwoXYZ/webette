# Codemap

Where things live in the repository, and the pitfalls worth knowing before
changing them. Keep this file in sync when the structure moves.

## How to run
- Install: `bun install` (from monorepo root)
- Dev server: `bun run packages/engine/src/cli.ts serve <site-folder>` (from root), or `bun run serve <site-folder>` (from `packages/engine/`)
- Build: `bun run packages/engine/src/cli.ts build <site-folder>` (from root), or `bun run build <site-folder>` (from `packages/engine/`)
- Local control API: `bun run packages/engine/src/cli.ts api [--port <n>]` (127.0.0.1, default port 4177; GET /status, POST /build, POST /serve, POST /stop, GET /logs?since=<byte-offset>, GET /logs/stream; see `docs/local-api.md`)
- Typecheck: `bun run typecheck` (from root, all packages)
- Test: `bun test` (from root)
- Reference build: `bun run build:tutorial` (builds `packages/app/tutorial`)
- Desktop app: `bun run dev:app` (native window), `bun run preview:app` (UI in a browser)
- Convenience scripts (root): `bun run serve:tutorial`, `bun run release:notes`

## Entry points
- Backend: `packages/engine/src/cli.ts` (dispatches `build` / `serve` / `api`); public programmatic entrypoint: `packages/engine/src/index.ts`
- Frontend: N/A (static output in `_public/` of the target site)
- Jobs/Workers: N/A

## High-level architecture
- Filesystem-first pipeline: scan folders → resolve blocks → postprocess markdown → apply history/timestamps → render templates → export model → prune output.
- `build` orchestrates the pipeline (`packages/engine/src/core/build.ts`) and `serve` wraps it with Bun's HTTP server + filesystem watch (`packages/engine/src/core/serve.ts`); `serve()` returns a `ServeHandle { port, stop() }`.
- `api` (`packages/engine/src/core/api.ts`) exposes a local HTTP control API (single active site, stable error codes) so external UIs can drive build/serve without embedding engine logic.
- Handlebars templates are resolved site-first with tool fallbacks; helpers live in `packages/engine/src/core/templates/helpers.ts`.

## Monorepo structure
```
webette/
├── packages/
│   ├── engine/          (npm "webette" — the SSG)
│   │   ├── src/
│   │   ├── locales/
│   │   └── webette.tool.ts
│   └── app/             (desktop app, Electrobun, UI alpha in progress)
│       ├── src/bun/     (main process: in-process API, UI HTTP server, RPC)
│       ├── src/web/     (webview: console design + UI logic)
│       └── tutorial/    (reference site)
├── websites/
│   └── documentation/   (webette doc site, built by engine)
├── scripts/             (repository tooling: release notes)
├── .tangled/workflows/  (CI and release pipelines)
├── docs/                (internal dev docs, migration to websites/doc pending)
└── package.json         (workspaces: ["packages/*"])
```

## Module / component map
- CLI + config: `packages/engine/src/cli.ts`, `packages/engine/src/config/env.ts`, `packages/engine/src/core/config.ts`, `packages/engine/webette.tool.ts`
- Local API: `packages/engine/src/core/api.ts` (webette api server); public entrypoint: `packages/engine/src/index.ts`
- Desktop app: `packages/app/src/bun/` (main process: in-process API, UI HTTP server, RPC bridge), `packages/app/src/web/` (console design, UI state machine, API client, 8-bit sounds)
- Scan + routes: `packages/engine/src/core/scan/**`, `packages/engine/src/core/routes.ts`, `packages/engine/src/core/targets.ts`
- Resolve + block types: `packages/engine/src/core/resolve/**`, `packages/engine/src/core/block-types/**`
- Build + render: `packages/engine/src/core/build/**`, `packages/engine/src/core/template.ts`, `packages/engine/src/core/templates/**`
- Export + sitemap: `packages/engine/src/core/export/**`, `packages/engine/src/core/sitemap.ts`
- Plugins: `packages/engine/src/plugins/**`
- Logging + i18n: `packages/engine/src/logging/**`, `packages/engine/locales/**`
- Utilities + types: `packages/engine/src/utils/**`, `packages/engine/src/types/**`

## Data model
- DB: none (filesystem + JSON export)
- Key entities: `Site`, `Collection`, `Entry`, `Block`, `ImageVariant` (`packages/engine/src/core/model.ts`)
- Migrations: N/A

## Integrations
- External services: none
- Optional deps: `sharp` (image variants), `music-metadata` (audio tags), `rehype-external-links` (external link attrs)
- Webhooks/queues: none

## Configuration
- Env vars: `WEBETTE_TOOL_CONFIG`, `WEBETTE_LANG`, `LANG`
- Config files: `packages/engine/webette.tool.ts` (tool defaults), `webette.config.ts` in site folder (site overrides), `_templates/**` in site folder
- Tool config resolution order: `WEBETTE_TOOL_CONFIG` env → `<cwd>/webette.tool.ts` → `<engine-src>/../../webette.tool.ts`

## Logging / Observability
- Logs: `.webette/logs.jsonl` via `packages/engine/src/logging/logger.ts`; read back by the local API (polling and live stream)
- Metrics/Tracing: none

## Security / Auth
- Authn/authz: none (static generator)
- Visibility controls: `draft.webt` / `unlisted.webt` affect build output, not access control

## Known pitfalls
- Image variants require `sharp`; if missing, variants alias to default and re-encode is skipped.
- Audio metadata requires `music-metadata`; if missing, only base metadata is emitted.
- `overwrite=replace-all` deletes the entire output dir; `replace-files` prunes unexpected files.
- `webette.config.ts` / `webette.tool.ts` are loaded via Bun build; Node-only environments won't load them.
- `serve` includes drafts by default; `build` excludes drafts and unlisted affects indexes/sitemap.
- `bun --cwd` requires an absolute path; use `bun run packages/engine/src/cli.ts` from root instead.
- TypeScript 7 (native) no longer ships `lib.*.d.ts` in `node_modules/typescript/lib`: editors must use their bundled TypeScript (`.zed/settings.json` disables `autoUseWorkspaceTsdk`), and each `tsconfig.json` must declare `"types": ["bun"]`.
- `sharp` cannot write `.ico`: `generateIco` wraps a 32×32 PNG in an ICO container by hand (`core/build/utils/icons.ts`).
- Block resolution is fully parallel and `resolveReference` re-resolves the target block, so asset writes go through a single-flight cache (`utils/single-flight.ts`) cleared on every `resolveBlocks` pass.
- Synthetic pages (indexes, 404, sitemap) get a new `createdAt`/`updatedAt` on every build (known debt, tracked as an issue).
- `sharp` does not resolve from the desktop app (isolated installs), so tutorial images are not optimized when built from the app.

## Fast answers
- "Where do I change the build pipeline?" -> `packages/engine/src/core/build.ts`
- "Where are templates resolved?" -> `packages/engine/src/core/template.ts`, `packages/engine/src/core/templates/resolve-file.ts`
- "Where are block types handled?" -> `packages/engine/src/core/resolve/registry.ts`, `packages/engine/src/core/block-types/**`
- "Where is site config parsed?" -> `packages/engine/src/core/config.ts`
- "Where is logging configured?" -> `packages/engine/src/logging/logger.ts`, `packages/engine/src/config/env.ts`
- "Where do plugins hook in?" -> `packages/engine/src/plugins/types.ts`, `packages/engine/src/plugins/runner.ts`
