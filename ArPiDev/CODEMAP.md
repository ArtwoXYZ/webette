# CODEMAP

## Snapshot
- Date: 2026-07-31
- Reviewed by: Pilot (post reprise: deps à jour, fixes race condition assets + favicon.ico)
- Scope: `packages/engine/src/**`, `packages/engine/locales/**`, `packages/engine/package.json`, `tsconfig.json`, `packages/engine/webette.tool.ts`

## How to run
- Install: `bun install` (from monorepo root)
- Dev server: `bun run packages/engine/src/cli.ts serve <site-folder>` (from root), or `bun run serve <site-folder>` (from `packages/engine/`)
- Build: `bun run packages/engine/src/cli.ts build <site-folder>` (from root), or `bun run build <site-folder>` (from `packages/engine/`)
- Typecheck: `bun run --filter webette typecheck` (from root)
- Test: none (no test script defined)
- Convenience scripts (root): `bun run serve:tutorial`, `bun run typecheck`

## Entry points
- Backend: `packages/engine/src/cli.ts` (dispatches `build` / `serve`)
- Frontend: N/A (static output in `_public/` of the target site)
- Jobs/Workers: N/A

## High-level architecture
- Filesystem-first pipeline: scan folders → resolve blocks → postprocess markdown → apply history/timestamps → render templates → export model → prune output.
- `build` orchestrates the pipeline (`packages/engine/src/core/build.ts`) and `serve` wraps it with Bun's HTTP server + filesystem watch (`packages/engine/src/core/serve.ts`).
- Handlebars templates are resolved site-first with tool fallbacks; helpers live in `packages/engine/src/core/templates/helpers.ts`.

## Monorepo structure
```
webette/
├── packages/
│   ├── engine/          (npm "webette" — the SSG)
│   │   ├── src/
│   │   ├── locales/
│   │   └── webette.tool.ts
│   └── app/             (desktop app — T7, skeleton only)
│       └── tutorial/    (ex website-example)
├── websites/
│   └── documentation/   (webette doc site, built by engine)
├── appTheme/            (maquette web autonome du design app — PAS ENCORE intégrée dans packages/app)
├── .tangled/workflows/  (CI + Release Spindles)
├── docs/                (internal dev docs, migration to websites/doc pending)
└── package.json         (workspaces: ["packages/*"])
```

## Module / component map
- CLI + config: `packages/engine/src/cli.ts`, `packages/engine/src/config/env.ts`, `packages/engine/src/core/config.ts`, `packages/engine/webette.tool.ts`
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
- Logs: `.webette/logs.jsonl` via `packages/engine/src/logging/logger.ts`
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
- TypeScript 7 (native) : ne ship plus `lib.*.d.ts` dans `node_modules/typescript/lib` → les éditeurs doivent utiliser leur TS embarqué (`.zed/settings.json` désactive `autoUseWorkspaceTsdk`) ; `"types": ["bun"]` doit être explicite dans les tsconfig.
- `sharp` ne sait pas écrire du `.ico` : `generateIco` emballe manuellement un PNG 32×32 dans un conteneur ICO (`core/build/utils/icons.ts`).
- Le resolve est entièrement parallèle et `resolveReference` re-résout le bloc cible → les écritures d'assets passent par un cache single-flight (`utils/single-flight.ts`) vidé à chaque passe `resolveBlocks`.
- Pages synthétiques (index, 404, sitemap) : `createdAt`/`updatedAt` régénérés à CHAQUE build (dette connue, non traitée).

## Fast answers
- "Where do I change the build pipeline?" -> `packages/engine/src/core/build.ts`
- "Where are templates resolved?" -> `packages/engine/src/core/template.ts`, `packages/engine/src/core/templates/resolve-file.ts`
- "Where are block types handled?" -> `packages/engine/src/core/resolve/registry.ts`, `packages/engine/src/core/block-types/**`
- "Where is site config parsed?" -> `packages/engine/src/core/config.ts`
- "Where is logging configured?" -> `packages/engine/src/logging/logger.ts`, `packages/engine/src/config/env.ts`
- "Where do plugins hook in?" -> `packages/engine/src/plugins/types.ts`, `packages/engine/src/plugins/runner.ts`

## Open questions
- FIXED: How should templates be packaged/distributed when webette ships as a standalone binary?
  - Answer: Starters are distributed as external folders (likely zipped) via website/repos; not bundled in the tool.
- FIXED: Should `ignore.webt` support glob patterns in addition to explicit filenames?
  - Answer: No; only explicit filenames are planned.
