# CODEMAP

## Snapshot
- Date: 2026-02-05
- Reviewed by: Architect
- Scope: `src/**`, `templates/**`, `package.json`, `tsconfig.json`, `webette.tool.ts`, `README.md`

## How to run
- Install: `bun install`
- Dev: `bun run serve <site-folder>`
- Test: none (no test script defined)
- Build: `bun run build <site-folder>`

## Entry points
- Backend: `src/cli.ts` (dispatches `build` / `serve`)
- Frontend: N/A (static output in `_public/`)
- Jobs/Workers: N/A

## High-level architecture
- Filesystem-first pipeline: scan folders → resolve blocks → postprocess markdown → apply history/timestamps → render templates → export model → prune output.
- `build` orchestrates the pipeline (`src/core/build.ts`) and `serve` wraps it with Bun’s HTTP server + filesystem watch (`src/core/serve.ts`).
- Handlebars templates are resolved site-first with tool fallbacks; helpers live in `src/core/templates/helpers.ts`.

## Module / component map
- CLI + config: `src/cli.ts`, `src/config/env.ts`, `src/core/config.ts`, `webette.tool.ts`
- Scan + routes: `src/core/scan/**`, `src/core/routes.ts`, `src/core/targets.ts`
- Resolve + block types: `src/core/resolve/**`, `src/core/block-types/**`
- Build + render: `src/core/build/**`, `src/core/template.ts`, `src/core/templates/**`
- Export + sitemap: `src/core/export/**`, `src/core/sitemap.ts`
- Plugins: `src/plugins/**`
- Logging + i18n: `src/logging/**`, `locales/**`
- Utilities + types: `src/utils/**`, `src/types/**`

## Data model
- DB: none (filesystem + JSON export)
- Key entities: `Site`, `Collection`, `Entry`, `Block`, `ImageVariant` (`src/core/model.ts`)
- Migrations: N/A

## Integrations
- External services: none
- Optional deps: `sharp` (image variants), `music-metadata` (audio tags), `rehype-external-links` (external link attrs)
- Webhooks/queues: none

## Configuration
- Env vars: `WEBETTE_TOOL_CONFIG`, `WEBETTE_LANG`, `LANG`
- Config files: `webette.tool.ts` (tool defaults), `webette.config.ts` (site overrides), `templates/**`

## Logging / Observability
- Logs: `.webette/logs.jsonl` via `src/logging/logger.ts`
- Metrics/Tracing: none

## Security / Auth
- Authn/authz: none (static generator)
- Visibility controls: `draft.webt` / `unlisted.webt` affect build output, not access control

## Known pitfalls
- Image variants require `sharp`; if missing, variants alias to default and re-encode is skipped.
- Audio metadata requires `music-metadata`; if missing, only base metadata is emitted.
- `overwrite=replace-all` deletes the entire output dir; `replace-files` prunes unexpected files.
- `webette.config.ts` / `webette.tool.ts` are loaded via Bun build; Node-only environments won’t load them.
- `serve` includes drafts by default; `build` excludes drafts and unlisted affects indexes/sitemap.

## Fast answers
- "Where do I change the build pipeline?" -> `src/core/build.ts`
- "Where are templates resolved?" -> `src/core/template.ts`, `src/core/templates/resolve-file.ts`
- "Where are block types handled?" -> `src/core/resolve/registry.ts`, `src/core/block-types/**`
- "Where is site config parsed?" -> `src/core/config.ts`
- "Where is logging configured?" -> `src/logging/logger.ts`, `src/config/env.ts`
- "Where do plugins hook in?" -> `src/plugins/types.ts`, `src/plugins/runner.ts`

## Open questions
- FIXED: How should templates be packaged/distributed when webette ships as a standalone binary?
  - Answer: Starters are distributed as external folders (likely zipped) via website/repos; not bundled in the tool.
- FIXED: Should `ignore.webt` support glob patterns in addition to explicit filenames?
  - Answer: No; only explicit filenames are planned.
