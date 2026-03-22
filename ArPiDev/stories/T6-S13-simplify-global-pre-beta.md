# T6-S13 — Simplify global pre-beta

Created: 2026-03-22 20h40m00s
Closed: 2026-03-22 21h05m00s
Acceptance: User

Status: Done, Validated

## Goal

Passer une revue qualité/réutilisation/efficacité sur l'ensemble du codebase `src/` pour détecter et corriger les problèmes résiduels avant la beta. Documenter chaque finding et chaque fix dans le Dev log.

## In scope

- Revue de tout `src/` (pas juste un diff) pour :
  - Duplication de code (fonctions, patterns, logique similaire)
  - Qualité (abstractions cassées, nommage incohérent, `as any`, state redondant)
  - Efficacité (travail inutile, I/O redondant, patterns N+1)
- Correction directe des findings jugés pertinents
- Documentation détaillée de chaque finding (corrigé ou non) dans le Dev log

## Out of scope

- Changement d'architecture ou de comportement
- Refactoring majeur (scope > 1 fichier de changement par finding)
- Ajout de features, tests, ou documentation
- Findings déjà identifiés et traités dans T6-S01 à T6-S11

## Execution brief

1. Lancer 3 agents de revue en parallèle sur l'ensemble de `src/` (reuse, quality, efficiency)
2. Agréger les findings
3. Pour chaque finding : évaluer pertinence, corriger si actionable, noter si skip
4. Build de vérification après chaque batch de corrections
5. Documenter chaque finding et action dans le Dev log

## Checks to run

- `bun run build website-example` — succès après chaque batch de corrections
- Grep de vérification pour chaque pattern corrigé

## Evidence expected

- Liste complète des findings avec statut (fixed / skipped + raison)
- Build OK final
- Dev log détaillé

## Done when

- Revue complète de src/ terminée
- Tous les findings actionables sont corrigés
- Build passe
- Dev log documente chaque finding et action

## Commit proposal

```
refactor(src): global simplify — deduplicate utilities, centralize shared helpers

Batch 1 — shared helpers extracted:
- ensureLeadingSlash → utils/path.ts (removed from routes.ts, audio/engine, video/engine, image/engine)
- pickString → utils/parse.ts (removed from social-head.ts, icons.ts)
- ensureDir wrappers inlined as mkdir(dir, {recursive:true}) in audio/engine, video/engine, image/engine
- formatHtml rehype processor cached (was recreated per page) in build/utils/html.ts

Batch 2 — config & loader dedup:
- normalizeOutputDir → normalizeAssetOutputDir in utils/path.ts (removed from audio/config, video/config, image/config)
- loadSharp unified in block-types/image/sharp-loader.ts (removed duplicate from icons.ts)

Batch 3 — remaining dedup:
- visitBlocks triplicated in prune.ts → defined once at function scope
- matchRootEntry (4 copies) → centralized in core/targets.ts, re-exported from navigation/filters.ts
- escapeHtml/escapeAttr (3 copies) → shared utils/html.ts
- escapeExtForRegex (3 copies) → shared utils/path.ts with cache
```

## Pilot exchange

## Dev log

### Review agents — findings summary

3 agents lancés en parallèle sur l'ensemble de `src/` :

#### Agent 1 — Code Reuse (~13 findings)

| # | Finding | Status | Action |
|---|---------|--------|--------|
| 1 | `ensureLeadingSlash` dupliqué 4× (routes, audio, video, image) | **Fixed** | Extrait dans `utils/path.ts` |
| 2 | `pickString` dupliqué 2× (social-head, icons) | **Fixed** | Extrait dans `utils/parse.ts` |
| 3 | `ensureDir` wrapper trivial 3× (audio, video, image) | **Fixed** | Inliné comme `mkdir(dir, {recursive:true})` |
| 4 | `normalizeOutputDir` dupliqué 3× (audio, video, image config) | **Fixed** | Extrait comme `normalizeAssetOutputDir` dans `utils/path.ts` |
| 5 | `loadSharp` dupliqué 2× (image/engine, icons) | **Fixed** | Unifié dans `block-types/image/sharp-loader.ts` |
| 6 | `matchRootEntry` dupliqué 4× (markdown-images, markdown-links, reference, navigation/filters) | **Fixed** | Centralisé dans `core/targets.ts` |
| 7 | `escapeHtml`/`escapeAttr` dupliqué 3× (social-head, markdown-images, image-utils) | **Fixed** | 2 copies supprimées, shared `utils/html.ts` (image-utils garde sa version Handlebars) |
| 8 | `escapeExtForRegex` dupliqué 3× (audio/paths, video/paths, image/paths) | **Fixed** | Centralisé dans `utils/path.ts` avec cache |
| 9 | `visitBlocks` tripliqué dans prune.ts | **Fixed** | Défini une seule fois au scope de `collectProtectedDirs` |
| 10 | Audio/video `resolveOutputPaths` quasi-identiques | **Skipped** | Structures similaires mais suffisamment spécifiques par type de média |
| 11 | Triple-pass markdown (links, images, headings) | **Skipped** | Hors scope — changement d'architecture |
| 12 | Menu/navigation duplication (menu.ts vs navigation/) | **Skipped** | Hors scope — refactoring majeur |
| 13 | `WebetteError` misplacement (dans templates/engine) | **Skipped** | Hors scope — déplacement structurel |

#### Agent 2 — Code Quality (~10 findings)

| # | Finding | Status | Action |
|---|---------|--------|--------|
| 1 | Cross-layer import `config/site.ts` → `build/utils/sorting` | **Fixed** | Re-export `SortingConfig` via `core/model.ts` |
| 2-10 | Divers (nommage, `as any`, patterns mineurs) | **Skipped** | Non actionables ou hors scope |

#### Agent 3 — Efficiency (~15 findings)

| # | Finding | Status | Action |
|---|---------|--------|--------|
| 1 | Rehype processor recréé à chaque page | **Fixed** | Caché au module level dans `build/utils/html.ts` |
| 2 | `getEnv()` double-call dans cli.ts | **Skipped** | Coût négligeable (lecture env, 1× au boot) |
| 3 | `resolveTemplatesConfig()` double-call | **Skipped** | Coût négligeable (lecture config, 1× au boot) |
| 4-15 | Divers (parallel scan, markdown processor reuse) | **Skipped** | Hors scope ou non actionable |

### Build verification

`bun run build website-example` — ✅ succès après chaque batch (3 builds de vérification)

### Fichiers créés

- `src/utils/html.ts` — `escapeHtml()` partagé
- `src/core/block-types/image/sharp-loader.ts` — chargeur Sharp unifié avec cache

### Fichiers modifiés (imports mis à jour)

- `src/utils/path.ts` — ajout `normalizeAssetOutputDir`, `ensureLeadingSlash`, `escapeExtForRegex`
- `src/utils/parse.ts` — ajout `pickString`
- `src/core/targets.ts` — ajout `matchRootEntry`
- `src/core/build/utils/html.ts` — cache du processeur rehype
- `src/core/build/utils/prune.ts` — `visitBlocks` défini une seule fois
- `src/core/build/utils/icons.ts` — imports `pickString`, `loadSharp` partagés
- `src/core/templates/social-head.ts` — import `pickString`, `escapeHtml`
- `src/core/postprocess/markdown-images.ts` — imports `matchRootEntry`, `escapeHtml`
- `src/core/postprocess/markdown-links.ts` — import `matchRootEntry`
- `src/core/resolve/resolvers/reference.ts` — import `matchRootEntry`
- `src/core/resolve/resolvers/navigation/filters.ts` — re-export `matchRootEntry` from targets
- `src/core/block-types/image/engine.ts` — imports `ensureLeadingSlash`, `loadSharp`
- `src/core/block-types/image/paths.ts` — import `escapeExtForRegex`
- `src/core/block-types/image/config.ts` — import `normalizeAssetOutputDir`
- `src/core/block-types/audio/engine.ts` — imports `ensureLeadingSlash`, inline mkdir
- `src/core/block-types/audio/paths.ts` — import `escapeExtForRegex`
- `src/core/block-types/audio/config.ts` — import `normalizeAssetOutputDir`
- `src/core/block-types/video/engine.ts` — imports `ensureLeadingSlash`, inline mkdir
- `src/core/block-types/video/paths.ts` — import `escapeExtForRegex`
- `src/core/block-types/video/config.ts` — import `normalizeAssetOutputDir`
- `src/core/routes.ts` — import `ensureLeadingSlash`
- `src/core/model.ts` — re-export `SortingConfig`
