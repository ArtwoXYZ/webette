# T6-S09 — Nommage & utils : dédupliquer, consolider, documenter les conventions

Created: 2026-03-21 17h00m00s
Closed: 2026-03-21 17h15m00s
Acceptance: User

Status: Done, Validated

## Rationale
Après les refactos T6-S01 à T6-S08, plusieurs utilitaires restent dupliqués (`splitRouteSegments`, `buildBlockRouteHint`, `normalizePath`, `normalizeCollectionPathKey`, type `SortOrder`). Un fichier utils orphelin (`src/core/navigation/utils.ts`) est isolé. Les conventions de nommage ne sont documentées nulle part. Nettoyage pre-beta.

## Goal
Dédupliquer les utilitaires, relocaliser le fichier orphelin, documenter les conventions de verbes.

## In scope
- Extraire `splitRouteSegments` + `buildBlockRouteHint` dans `src/core/resolve/route-hints.ts`
- Dédupliquer `normalizeCollectionPathKey` dans `src/utils/path.ts`
- Supprimer les copies redondantes de `normalizePath` (remplacer par `toPosix` existant)
- Dédupliquer le type `SortOrder` (importer depuis `scan/internal-types`)
- Déplacer `src/core/navigation/utils.ts` → `src/utils/navigation.ts`
- Documenter les conventions de verbes dans `src/utils/CONVENTIONS.md`

## Out of scope
- Renommer des fonctions existantes
- Modifier le comportement
- Ajouter des tests automatisés

## Execution brief
1. Créer `route-hints.ts`, mettre à jour `resolve/index.ts` et `resolvers/reference.ts`
2. Ajouter `normalizeCollectionPathKey` dans `utils/path.ts`, supprimer copies dans `builder.ts` et `menu.ts`
3. Supprimer `normalizePath` dans `scan/utils.ts` et `sorting.ts`, remplacer appels par `toPosix`
4. Importer `SortOrder` depuis `scan/internal-types` dans `sorting.ts`
5. Déplacer `navigation/utils.ts` → `utils/navigation.ts`, mettre à jour 4 consommateurs
6. Créer `CONVENTIONS.md`

## Files/areas likely involved
- `src/core/resolve/route-hints.ts` (nouveau)
- `src/core/resolve/index.ts`
- `src/core/resolve/resolvers/reference.ts`
- `src/utils/path.ts`
- `src/core/resolve/resolvers/navigation/builder.ts`
- `src/core/templates/menu.ts`
- `src/core/scan/utils.ts`
- `src/core/scan/enrich.ts`
- `src/core/build/utils/sorting.ts`
- `src/core/scan/internal-types.ts`
- `src/utils/navigation.ts` (nouveau, déplacé)
- `src/core/resolve/resolvers/navigation/index.ts`
- `src/core/resolve/resolvers/navigation/parser.ts`
- `src/core/resolve/resolvers/navigation/filters.ts`
- `src/utils/CONVENTIONS.md` (nouveau)

## Checks to run
- `bun run build website-example` — build clean
- `bun run serve -v website-example` — site fonctionnel

## Evidence expected
- Plus de copies dupliquées de `splitRouteSegments`, `buildBlockRouteHint`, `normalizeCollectionPathKey`, `normalizePath` local, `SortOrder`
- `src/core/navigation/utils.ts` supprimé, `src/core/navigation/` supprimé
- `CONVENTIONS.md` créé

## Done when
- Toutes les duplications listées sont éliminées
- `navigation/utils.ts` relocalisé
- Conventions documentées
- Pas de régression sur `website-example`

## Commit proposal
Title: `refactor(core): deduplicate utils, relocate navigation helpers, document verb conventions`
Description:
- Extract splitRouteSegments and buildBlockRouteHint into shared route-hints.ts module.
- Deduplicate normalizeCollectionPathKey into src/utils/path.ts.
- Remove redundant normalizePath wrappers in scan/utils and sorting (replaced by toPosix).
- Import SortOrder type from scan/internal-types instead of redefining in sorting.ts.
- Relocate src/core/navigation/utils.ts to src/utils/navigation.ts.
- Add src/utils/CONVENTIONS.md documenting function verb naming conventions.
Scope(s):
- core
Why these scopes:
- Changes span core modules and shared utils, all internal refactoring.

## Dev log
- 2026-03-21 17h05m00s — Change: Phase 1 — Extract route hints
  Why this way:
  - Observed issue: `splitRouteSegments` and `buildBlockRouteHint` were duplicated identically in `resolve/index.ts` and `resolvers/reference.ts`.
  - Chosen fix: Extract both into `src/core/resolve/route-hints.ts`, import in both consumers.
  - Tradeoff: none, pure extraction.

- 2026-03-21 17h08m00s — Change: Phase 2 — Deduplicate normalizeCollectionPathKey
  Why this way:
  - Observed issue: `normalizeCollectionPathKey` duplicated in `navigation/builder.ts` (uses `toPosix`) and `templates/menu.ts` (inlines backslash replace). Functionally identical.
  - Chosen fix: Add canonical version to `src/utils/path.ts` (using `toPosix`), import in both consumers.

- 2026-03-21 17h10m00s — Change: Phase 3 — Consolidate normalizePath
  Why this way:
  - Observed issue: `normalizePath` in `scan/utils.ts` and `sorting.ts` is `toPosix(value.replace(/\\/g, "/"))` — redundant since `toPosix` already does the backslash replace. The `routes.ts` version has a different signature (`unknown → string | undefined`) so it stays local.
  - Chosen fix: Remove `normalizePath` from `scan/utils.ts` and `sorting.ts`, replace all call sites with `toPosix`. Updated `enrich.ts` which was the only external consumer of `scan/utils.normalizePath`.

- 2026-03-21 17h12m00s — Change: Phase 4 — Deduplicate SortOrder type
  Why this way:
  - Observed issue: `SortOrder` defined both in `scan/internal-types.ts:59` and `sorting.ts:11`.
  - Chosen fix: Import from `scan/internal-types` in `sorting.ts`, remove local definition.

- 2026-03-21 17h15m00s — Change: Phase 5 — Relocate navigation/utils.ts
  Why this way:
  - Observed issue: `src/core/navigation/utils.ts` was the only file in `src/core/navigation/`, orphaned after T6-S04b extracted the resolver into `resolve/resolvers/navigation/`. Its exports are general-purpose (parseList, normalizeKey, shouldInclude*) and used by 4 consumers across different parts of the codebase.
  - Chosen fix: Move to `src/utils/navigation.ts`, update 4 import paths, delete empty `src/core/navigation/` directory. Re-export path for `parseBoolean` adjusted from `../../utils/parse` to `./parse` (same directory now).

- 2026-03-21 17h18m00s — Change: Phase 6 — Document verb conventions
  Why this way:
  - Observed issue: no documentation of function naming conventions. New contributors would need to reverse-engineer patterns.
  - Chosen fix: Created `src/utils/CONVENTIONS.md` with a table of 10 verb prefixes, their semantics, and examples from the codebase.
