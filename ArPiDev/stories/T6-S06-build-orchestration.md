# T6-S06 — Build orchestration : extraire les étapes de build()

Created: 2026-03-21 10h00m00s
Closed: 2026-03-21 00h20m00s
Acceptance: User

Status: Done

## Goal
Réduire `build()` (~664 lignes) en une fonction d'orchestration lisible qui délègue chaque phase à un module dédié dans `src/core/build/`, sans changement de comportement.

## In scope
- Transformation de `src/core/build.ts` en dossier `src/core/build/` avec un `index.ts` orchestrateur + un fichier par phase
- Chaque module de phase exporte une fonction qui reçoit explicitement ses dépendances en paramètres (pas de closure implicite)
- `index.ts` ne fait qu'enchaîner les appels et reste < 80 lignes
- Typage des paramètres/retours des fonctions extraites (interfaces ou types locaux si nécessaire)
- Mise à jour des imports dans les fichiers qui importent depuis `src/core/build`

## Out of scope
- Changement de comportement ou de signature publique de `build()`
- Refactor des fonctions appelées en profondeur (ex: `scanSite`, `resolveBlocks`, etc.)
- Ajout de tests unitaires (la non-régression est vérifiée par build de `website-example`)

## Execution brief
- Créer le dossier `src/core/build/` avec la structure suivante :
  - `index.ts` — orchestrateur (< 80 lignes), exporte `build()`
  - `initialize.ts` (~lignes 103-220) — config, logger, templates, validation
  - `plugins.ts` (~lignes 221-309) — chargement plugins, `onInit` hooks
  - `scan.ts` (~lignes 243-375) — scan, drafts, index folders, stats, validation
  - `output.ts` (~lignes 376-448) — gestion du dossier de sortie (overwrite policy)
  - `resolve.ts` (~lignes 450-610) — assets, blocs, plugins transforms, post-processing, slug collisions
  - `render.ts` (~lignes 612-766) — export modèle, icons, template renderer, rendu pages, tags, sitemap, prune, finalize
- Pour chaque module : exporter une fonction principale avec paramètres typés et retour explicite
- `index.ts` orchestre les appels séquentiels et les early returns (ex: `exportModel.only`)
- Supprimer l'ancien `src/core/build.ts` une fois la migration faite
- Mettre à jour les imports dans les fichiers qui référencent `src/core/build`
- Vérifier la non-régression : `bun run build -v website-example`

## Files/areas likely involved
- `src/core/build.ts` → supprimé, remplacé par `src/core/build/index.ts`
- `src/core/build/` — nouveau dossier avec ~7 fichiers
- Tout fichier important depuis `../core/build` ou `./build` (imports à mettre à jour)

## Constraints and traps
- Le pipeline est fortement séquentiel : chaque phase dépend de la précédente — les fonctions extraites doivent retourner l'état nécessaire à la suivante
- Certaines variables (`logger`, `toolEnv`, `outputDir`) traversent toute la chaîne : les passer explicitement ou les regrouper dans un contexte commun
- Les sections 3 et 7 (scan + resolve/transform) sont les plus imbriquées avec les hooks plugins — découper avec soin pour ne pas casser le flux
- La ligne `if (exportModel.only)` crée un early return au milieu de la pipeline — gérer proprement dans l'orchestrateur
- Ne pas introduire de changement de nommage des variables intermédiaires du pipeline (`scannedSite` → `resolvedSite` → `finalSite`) : garder la traçabilité

## Checks to run
- `bun run build -v website-example` — build complet sans erreur
- Diff visuel rapide : le HTML généré dans `website-example/_public` doit être identique avant/après

## Evidence expected
- `build()` réduite à < 80 lignes d'orchestration
- Chaque fonction extraite a un nom clair, des paramètres typés, et un retour explicite
- `bun run build -v website-example` réussi sans diff de sortie

## Done when
- `build()` est une fonction d'orchestration courte (< 80 lignes) appelant des fonctions nommées
- Aucune régression sur `website-example` (`bun run build -v website-example`)
- Le code compile sans erreur TypeScript

## Pending reason

## Remaining work

## Resume condition

## Commit proposal
Title: `refactor(core): extract build() phases into named orchestration functions`
Description:
- Replace monolithic src/core/build.ts (664 lines) with src/core/build/ folder: index.ts orchestrator (25 lines) + 6 phase modules (initialize, plugins, scan, output, transform, finalize) + types.ts + utils/ subfolder for existing utilities.
- index.ts orchestrates 6 sequential phases with explicit typed data flow via BuildConfig, PluginResult, ScanResult, TransformResult.
- Move 15 existing build utilities into build/utils/ for clear separation between pipeline phases and implementation details.
- No behavior change — verified by full website-example build with identical output.
Scope(s):
- core
Why these scopes:
- All changes are internal to the core build pipeline (src/core/build).

## Out-of-scope fixes requested by user

Fixes for pre-existing issues found during `/simplify` review, applied within this story:

1. `layoutPartialName` computed redundantly (initialize.ts + template.ts + render.ts)
2. Empty-entry warning loops duplicated (scan.ts: collections vs root entries)
3. quiet-vs-info log pattern repeated 3 times (scan.ts + finalize.ts x2)
4. Double `rmWithRetries` for `replace-all` in output.ts
5. `renderSite` 16-param call (finalize.ts) — not fixed here, needs broader refactor of render.ts API

## Pilot exchange
- 2026-03-21 01h00m00s — Dev -> Pilot — Request: add notes to T6-S09 (nommage/utils) in TASKS.md mentioning that `layoutPartialName` redundant computation was partially addressed in T6-S06 (shared helper `templateBaseName` created in types.ts). Also note that the quiet-vs-info pattern and empty-entry warning dedup were handled in T6-S06, so T6-S09 can skip those.

## Dev log
- 2026-03-21 00h42m00s — Change: Refactored build pipeline
  Why this way:
  - Observed issue: build.ts was a 664-line monolith mixing config, scanning, resolution, rendering, and cleanup
  - Root cause: organic growth over multiple stories without extraction
  - Chosen fix: split into build/ folder with index.ts orchestrator (25 lines) + 6 phase modules + types.ts + utils/ subfolder
  - Tradeoff: utils/ subfolder adds one level of depth but cleanly separates pipeline phases from implementation utilities
  - Evidence: `bun run build -v website-example` succeeds with identical output
- 2026-03-21 00h17m00s — Bugfix: templateBaseName was broken
  Why this way:
  - Observed issue: pages rendered with only navigation, no content (empty `<div class="container"></div>`)
  - Root cause: `templateBaseName()` helper used `string.slice()` instead of `path.parse().name`, producing `'layout/entry'` instead of `'entry'` — template renderer couldn't find the layout partial
  - Fix: replaced with `path.parse(filename).name` + added `import * as path from 'node:path'`
  - Evidence: clean rebuild + preview verification — all pages render correctly
  Structure:
  - `build/index.ts` (25 lines) — orchestrator
  - `build/types.ts` — BuildOptions, BuildConfig, phase result types, pure helpers
  - `build/initialize.ts` — config, env, templates validation
  - `build/plugins.ts` — plugin loading, onInit, context creation
  - `build/scan.ts` — scan, drafts, index folders, stats
  - `build/output.ts` — output directory setup (overwrite policy)
  - `build/transform.ts` — assets, blocks, plugin transforms, post-processing, sorting, slug collisions
  - `build/finalize.ts` — model export, icons, rendering, sitemap, prune, server files
  - `build/utils/` — 15 existing utility modules moved from build/ root
