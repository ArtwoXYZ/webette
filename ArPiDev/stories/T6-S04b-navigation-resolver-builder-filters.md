# T6-S04b — Navigation resolver — builder/filters

Created: 2026-03-19 22h30m00s
Closed: 2026-03-19 22h52m00s
Acceptance: User

Status: Done, Validated

## Goal
Réorganiser le resolver navigation en sous-dossier et extraire builder/filters, pour que chaque fichier ait une responsabilité claire.

## Context
Après T6-S04a (parser extrait), `navigation.ts` fait encore 635 lignes et `navigation-parser.ts` est à côté dans `resolvers/`. La navigation est le seul resolver assez complexe pour éclater en plusieurs fichiers — un sous-dossier dédié est plus propre que 4 fichiers préfixés `navigation-*` au milieu des autres resolvers.

`src/core/navigation/utils.ts` reste en place : il est aussi importé par `src/core/templates/menu.ts`, donc il ne peut pas migrer dans le sous-dossier resolver sans créer une dépendance templates → resolvers.

## In scope
- Créer `src/core/resolve/resolvers/navigation/` comme sous-dossier du resolver
- Déplacer `navigation.ts` → `navigation/index.ts` (orchestration uniquement)
- Déplacer `navigation-parser.ts` → `navigation/parser.ts`
- Créer `navigation/builder.ts` avec :
  - Le type `NavigationItem`
  - Les fonctions : `buildEntryNode`, `buildRootEntryNode`, `buildCollectionNode`, `normalizeCollectionPathKey`, `parentCollectionPathKey`, `buildCollectionForestNodes`, `buildCollectionSubtreeNode`
- Créer `navigation/filters.ts` avec :
  - Les finders : `findCollectionForBlock`, `findRootEntryForBlock`, `matchRootEntry`, `findCurrentForBlock`
  - Les transformations d'arbre : `applyVisibility`, `applyLinkFlags`, `applyState` (closures → fonctions paramétrées)
- Mettre à jour l'import dans `src/core/resolve/registry.ts`

## Out of scope
- Modifier le comportement observable (rendu identique)
- Déplacer `src/core/navigation/utils.ts` (importé par templates/menu.ts — futur T6-S09)

Note : on est en pre-beta sans contrainte de rétro-compatibilité. Des renommages, réorganisations, ou simplifications opportunistes dans le périmètre du resolver navigation sont bienvenus si ça améliore la clarté. La boucle stack-based peut être simplifiée ou déplacée si le Dev juge que ça rend le code plus propre.

## Files/areas likely involved
- `src/core/resolve/resolvers/navigation.ts` → `navigation/index.ts`
- `src/core/resolve/resolvers/navigation-parser.ts` → `navigation/parser.ts`
- `src/core/resolve/resolvers/navigation/builder.ts` (nouveau)
- `src/core/resolve/resolvers/navigation/filters.ts` (nouveau)
- `src/core/resolve/registry.ts` (mise à jour import)

## Constraints and traps
- `applyVisibility`, `applyLinkFlags` et `applyState` sont actuellement des closures capturant `options`, `shouldIncludeCollection`, `shouldIncludeEntry`, `currentCollectionKey`, `currentEntryId` — il faudra les transformer en fonctions paramétrées
- Le type `NavigationItem` est utilisé partout (parser, builder, filters, resolver) — le mettre dans `navigation-builder.ts` et le ré-exporter ou l'importer depuis les autres modules
- `findCollectionForBlock` et `findCurrentForBlock` dépendent des types `Site`, `Block`, `Collection`, `Entry` du modèle
- Importer `Logger` depuis `src/logging/logger.ts` si nécessaire (convention codebase, cf. T6-S04a /simplify)

## Execution brief
1. Lire `navigation.ts` en entier pour confirmer les limites exactes
2. Créer le sous-dossier `resolvers/navigation/`
3. Créer `builder.ts` avec `NavigationItem` + les 7 fonctions builder
4. Créer `filters.ts` avec les 4 finders + les 3 fonctions de transformation (paramétrées au lieu de closures)
5. Déplacer `navigation-parser.ts` → `navigation/parser.ts` (ajuster les chemins d'import internes)
6. Transformer `navigation.ts` → `navigation/index.ts` (orchestration seule, importe depuis parser/builder/filters)
7. Mettre à jour l'import dans `registry.ts`
8. Supprimer les anciens fichiers `resolvers/navigation.ts` et `resolvers/navigation-parser.ts`
9. Vérifier compilation et rendu

## Checks to run
- `bun tsc --noEmit` — vérification TypeScript sans erreur
- `bun run build -v website-example` — rendu identique (SHA256 de `_public/`)
- `bun run serve -v website-example` — serveur démarre et site navigable
- Vérifier qu'aucun autre fichier n'importait directement les fonctions déplacées

## Evidence expected
- Sous-dossier `resolvers/navigation/` avec `index.ts`, `parser.ts`, `builder.ts`, `filters.ts`
- Anciens fichiers `resolvers/navigation.ts` et `resolvers/navigation-parser.ts` supprimés
- `index.ts` ne contient que l'orchestration
- TypeScript OK + rendu `website-example` identique avant/après

## Done when
- Les 7 fonctions builder + NavigationItem sont dans `navigation/builder.ts`
- Les 4 finders + 3 transformations d'arbre sont dans `navigation/filters.ts`
- Le parser est dans `navigation/parser.ts`
- `navigation/index.ts` importe depuis les trois modules, ne garde que l'orchestration
- `registry.ts` importe depuis `./resolvers/navigation`
- `bun tsc --noEmit` OK, rendu `website-example` identique

## Commit proposal
Title: `refactor(core): reorganize navigation resolver into sub-folder with builder and filters`
Description:
- Move navigation resolver into resolvers/navigation/ sub-folder (index, parser, builder, filters)
- Extract NavigationItem type and node construction into builder.ts
- Extract finders and tree transformations (applyVisibility, applyLinkFlags, applyState) into filters.ts
- Convert closure-based filters to parameterized functions
- index.ts retains only orchestration, no behavior change
Scope(s):
- core
Why these scopes:
- Refacto interne du resolver navigation dans src/core — scope principal "core" selon commit-scopes.md

## Pilot exchange

## Dev log
- 2026-03-19 22h42m00s — Change: réorganisation complète du resolver navigation en sous-dossier
  Why this way:
  - Observed issue: navigation.ts (635 lignes) + navigation-parser.ts en vrac dans resolvers/ — seul resolver éclaté en plusieurs fichiers
  - Root cause: pas de séparation des responsabilités, fichiers préfixés au lieu d'un sous-dossier
  - Chosen fix: créé resolvers/navigation/ avec 4 modules (index 299L, parser 270L, builder 213L, filters 198L)
  - Détails: closures applyVisibility/applyLinkFlags/applyState converties en fonctions paramétrées (VisibilityContext, StateContext) ; normalizeCollectionPathKey/parentCollectionPathKey rendus privés dans builder (non exportés) ; finders groupés avec filters car même domaine (contexte courant)
  - Evidence: `bun tsc --noEmit` OK, SHA256 `_public/` identique (45fca475…), anciens fichiers supprimés
  Commands/tests: `bun tsc --noEmit` ✓ | `bun run build -v website-example` ✓ | SHA256 identique
