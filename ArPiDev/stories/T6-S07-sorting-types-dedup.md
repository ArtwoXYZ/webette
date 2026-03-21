# T6-S07 — Sorting : typer SortConfig strictement, dédupliquer findCustomSorting

Created: 2026-03-21 10h00m00s
Closed: 2026-03-21 16h10m00s
Acceptance: User

Status: Done, Validated

## Goal
Rendre le module sorting type-safe et supprimer la duplication entre `findCustomSortingForCollection` et `findCustomSortingForEntry`.

## In scope
- Remplacer les champs `unknown` dans `SortingSection`, `SortingConfig`, `CustomSorting` par les types stricts (`SortType`, `SortOrder`, `string`)
- Exporter `SortingConfig` et mettre à jour `model.ts` + `config.ts` pour l'utiliser
- Fusionner `findCustomSortingForCollection` / `findCustomSortingForEntry` en un seul `findCustomSorting`
- Supprimer les casts `as Record<string, unknown>` / `as CustomSorting` rendus inutiles

## Out of scope
- Unifier le `SortOrder` dupliqué dans `scan/internal-types.ts` (T6-S09)
- Découper sorting.ts en sous-fichiers (cohérent tel quel à ~400 lignes)
- Modifier les fonctions `normalizeSortType` / `normalizeSortOrder` (frontière de validation, gardent `unknown`)

## Execution brief
1. Typer strictement les 3 types internes dans `sorting.ts` (SortingSection, SortingConfig, CustomSorting)
2. Ajouter `export` sur `SortingConfig`, importer dans `model.ts` (ligne 109) et `config.ts` (ligne 17)
3. Supprimer `findCustomSortingForCollection`, renommer `findCustomSortingForEntry` → `findCustomSorting`, retaper le param `raw: unknown` → `items: CustomSorting[] | undefined`, supprimer les casts/gardes inutiles
4. Mettre à jour les 2 call sites : `resolveEntrySort` (ligne 195) et `resolveBlockSort` (ligne 225)

## Checks to run
- `bun run build website-example` — doit compiler sans erreur et produire `_public/`
- `bun run serve -v website-example` — le site doit fonctionner normalement
- Vérifier visuellement que l'ordre des entries/blocks est inchangé

## Evidence expected
- Build clean (pas d'erreur TypeScript)
- Output `_public/` identique ou fonctionnellement équivalent avant/après

## Done when
- Les types sorting sont stricts (plus de `unknown` sauf dans normalize*)
- `findCustomSortingForCollection` est supprimé, remplacé par `findCustomSorting` unifié
- `model.ts` et `config.ts` utilisent `SortingConfig` au lieu de `Record<string, unknown>`
- Pas de régression sur `website-example`

## Files/areas likely involved
- `src/core/build/utils/sorting.ts` — types + dedup (fichier principal)
- `src/core/model.ts` — type du champ `sorting`
- `src/core/config.ts` — type du champ `sorting` dans `WebetteConfigFile`

## Commit proposal
Title: `refactor(sorting): strict SortConfig types and deduplicate findCustomSorting`
Description:
- Replace `unknown` fields in SortingSection, SortingConfig, CustomSorting with strict types (SortType, SortOrder, string).
- Export SortingConfig and use it in model.ts and config.ts instead of Record<string, unknown>.
- Merge findCustomSortingForCollection/findCustomSortingForEntry into a single findCustomSorting function.
- Remove unnecessary type casts and runtime guards made redundant by strict typing.
Scope(s):
- sorting
Why these scopes:
- All changes are confined to the sorting module and its type surface in model/config.

## Pilot exchange

## Dev log
- 2026-03-21 16h00m00s — Change: Typage strict des types sorting + dedup findCustomSorting
  Why this way:
  - Observed issue: SortingSection, SortingConfig, CustomSorting utilisaient `unknown` pour tous les champs alors que les valeurs sont connues (SortType, SortOrder, string). Deux fonctions findCustomSortingForCollection/findCustomSortingForEntry partageaient ~80% de leur logique.
  - Root cause: les types avaient été définis de manière permissive au moment de l'implémentation initiale, avec validation runtime uniquement.
  - Chosen fix: (1) Remplacé `unknown` par `SortType`, `SortOrder`, `string`, `CustomSorting[]` dans les 3 types. (2) Exporté `SortingConfig` et mis à jour `model.ts` + `config.ts`. (3) Fusionné les 2 fonctions en `findCustomSorting(items, collectionKey, entryKey)` — la version Entry subsume la version Collection quand `entryKey` est `undefined`. (4) Supprimé les casts `as Record<string, unknown>` / `as CustomSorting` et gardes `typeof !== "object"` devenus inutiles.
  - Tradeoff: Les fonctions normalize* gardent `unknown` en paramètre car elles servent de frontière de validation de la config utilisateur.
  - Evidence: `bun run build website-example` → build clean, 6 collections, 21 entrées, 51 blocs, output identique.
  Commands/tests: `bun run build website-example` — ✅ Build terminé
