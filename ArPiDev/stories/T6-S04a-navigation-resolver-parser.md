# T6-S04a — Navigation resolver — parser

Created: 2026-03-19 10h00m00s
Closed: 2026-03-19 22h25m00s
Acceptance: User

Status: Done, Validated

## Goal
Extraire toute la logique de lecture/interprétation du fichier `.webt` depuis `navigation.ts` vers un module dédié `navigation-parser.ts`, sans changement de comportement.

## Context
`src/core/resolve/resolvers/navigation.ts` fait 875 lignes. La logique de parsing (fonctions pures + boucle stack-based dans `resolveNavigation`) est mélangée avec le builder, les filtres et l'application d'état. Ce refacto isole le parser pour préparer T6-S04b.

## In scope
- Créer `src/core/resolve/resolvers/navigation-parser.ts`
- Y déplacer les fonctions de parsing pures : `parseNavigationNameLine` (L22-33), `parseHeaderOptionLine` (L35-48), `countIndentSpaces` (L50-76), `normalizeItemLine` (L78-83), `parseItemLine` (L93-148)
- Y déplacer les types associés si nécessaire (types retour de ces fonctions)
- Extraire la boucle de parsing du header+items de `resolveNavigation` (≈L452-549) en une fonction exportée (ex: `parseNavigationBlock`) que `resolveNavigation` appellera
- `navigation.ts` importe depuis `navigation-parser.ts` et reste le point d'entrée du resolver

## Out of scope
- Déplacer les fonctions builder/filter/state (T6-S04b)
- Modifier le comportement du parsing
- Renommer des fonctions existantes au-delà du strict nécessaire
- Toucher à `src/core/navigation/utils.ts`

## Files/areas likely involved
- `src/core/resolve/resolvers/navigation.ts` (source, 875 lignes)
- `src/core/resolve/resolvers/navigation-parser.ts` (nouveau)

## Constraints and traps
- La boucle stack-based (L452-549) dépend de `NavigationOptions` et du type des parsed items — s'assurer que les types sont bien exportés
- Ne pas casser les imports existants de `navigation.ts` par d'autres modules
- Le type `NavigationItem` et `NavigationOptions` restent dans `navigation.ts` pour cette story (T6-S04b pourrait les déplacer vers un fichier types)

## Execution brief
1. Lire `navigation.ts` en entier pour confirmer les limites exactes des fonctions à extraire
2. Créer `navigation-parser.ts` avec les 5 fonctions pures + leurs types retour
3. Extraire la boucle de parsing header+items en `parseNavigationBlock(content: string, logger): { name, options, parsedItems }` (ou signature similaire)
4. Dans `navigation.ts`, remplacer les fonctions déplacées par des imports depuis `navigation-parser.ts`
5. Vérifier que `navigation.ts` compile et que le build passe

## Checks to run
- `bun tsc --noEmit` — vérification TypeScript sans erreur
- `bun run build -v website-example` — build du site exemple, rendu identique (diff sur `_public/`)
- `bun run serve -v website-example` — serveur démarre et site navigable (vérification manuelle rapide)
- Vérifier qu'aucun autre fichier n'importait directement les fonctions déplacées

## Evidence expected
- `navigation-parser.ts` existe avec les fonctions extraites
- `navigation.ts` importe depuis `navigation-parser.ts`, plus de duplication
- TypeScript OK + rendu `website-example` identique avant/après

## Done when
- Les 5 fonctions de parsing + la boucle stack-based sont dans `navigation-parser.ts`
- `navigation.ts` les importe et les utilise sans duplication
- `bun tsc --noEmit` OK, rendu `website-example` identique

## Commit proposal
Title: `refactor(core): extract navigation .webt parser into navigation-parser.ts`
Description:
- Move parseNavigationNameLine, parseHeaderOptionLine, countIndentSpaces, normalizeItemLine, parseItemLine to navigation-parser.ts
- Extract header+items parsing loop into parseNavigationBlock function
- navigation.ts imports from navigation-parser.ts, no behavior change
Scope(s):
- core
Why these scopes:
- Refacto interne du resolver navigation dans src/core — scope principal "core" selon commit-scopes.md

## Pilot exchange

## Dev log
- 2026-03-19 22h15m00s — Change: extraction du parser navigation
  Why this way:
  - Observed issue: navigation.ts faisait 875 lignes, mélange parsing/building/filtering
  - Root cause: pas de séparation des responsabilités
  - Chosen fix: créé navigation-parser.ts (273 lignes) avec les 5 fonctions pures + parseNavigationBlock ; navigation.ts réduit à 635 lignes
  - Tradeoff: le type NavigationOptions déplacé dans le parser car utilisé par parseNavigationBlock ; NavigationItem reste dans navigation.ts (scope T6-S04b)
  - Evidence: `bun tsc --noEmit` OK, SHA256 `_public/` identique avant/après (45fca475…)
  Commands/tests: `bun tsc --noEmit` ✓ | `bun run build -v website-example` ✓ | `find _public -type f | sort | sha256sum` identique
