# T6-S05 — Primitif de rendu de page

Created: 2026-03-19 23h00m00s
Closed: 2026-03-20 00h15m00s
Acceptance: User

Status: Done, Validated

## Goal
Dédupliquer les 4 implémentations identiques du pattern render→mkdir→formatHtml→writeIfChanged en un seul primitif partagé.

## Context
Le même pattern FS en 4 étapes (render template → mkdir → formatHtml → writeIfChanged) est copié-collé à 4 endroits :
1. `renderEntryTo` dans `render.ts` (L139-167, closure)
2. Inline root index dans `render.ts` (L244-248)
3. Inline collection index dans `render.ts` (L305-308)
4. `createRenderPage` dans `render-synthetic-page.ts` (L25-40, factory pour plugins)

Les utilitaires `writeIfChanged` (`src/utils/fs.ts`) et `formatHtml` (`src/core/build/html.ts`) sont déjà partagés. Ce qui manque c'est le primitif qui les orchestre.

## In scope
- Créer un primitif partagé (ex: `renderPageToFile` ou similaire) qui encapsule les 4 étapes : render context via templateRenderer → mkdir → formatHtml → writeIfChanged → retourne boolean
- Faire utiliser ce primitif par les 4 call sites dans `render.ts` et `render-synthetic-page.ts`
- Le primitif reçoit ses dépendances (templateRenderer, formatHtml, writeIfChanged, outputDir) en paramètre ou via un objet factory

## Out of scope
- Modifier le comportement observable (rendu identique)
- Refactorer `renderSite` au-delà du remplacement du pattern dupliqué
- Toucher à `formatHtml` ou `writeIfChanged` eux-mêmes

Note : pre-beta, pas de contrainte de rétro-compatibilité. Si `createRenderPage` peut être simplifié ou remplacé par le nouveau primitif, c'est bienvenu.

## Files/areas likely involved
- `src/core/build/render.ts` (307 lignes, 3 occurrences du pattern)
- `src/core/build/render-synthetic-page.ts` (41 lignes, 1 occurrence)
- Nouveau fichier possible pour le primitif (ou ajout dans un fichier existant)
- `src/core/build.ts` (orchestre les dépendances, à vérifier pour les appels)

## Constraints and traps
- `renderEntryTo` construit un contexte riche (collection, entry, blocks, prevEntry, nextEntry, layoutName) avant de render — le primitif ne gère que les 4 étapes FS, pas la construction du contexte
- `createRenderPage` a un callback `addExpectedOutput` optionnel — le primitif doit le supporter
- Les closures `formatHtml` et `writeIfChanged` dans `build.ts` wrappent les versions raw avec logger/live-reload — le primitif reçoit les versions wrappées, pas les raw
- `render.ts` utilise un logger pour tracer les fichiers générés — le primitif doit pouvoir logger

## Execution brief
1. Lire `render.ts`, `render-synthetic-page.ts` et `build.ts` pour confirmer les signatures exactes
2. Définir le primitif (ex: factory qui retourne une fonction `renderPageToFile(targetDir, context, layoutName?) → boolean`)
3. Remplacer les 4 occurrences par des appels au primitif
4. Simplifier ou supprimer `createRenderPage` si le primitif le rend redondant
5. Vérifier compilation et rendu

## Checks to run
- `bun tsc --noEmit` — vérification TypeScript sans erreur
- `bun run build -v website-example` — rendu identique (SHA256 de `_public/`)
- `bun run serve -v website-example` — serveur démarre et site navigable

## Evidence expected
- Un seul primitif pour le pattern render→mkdir→format→write
- Les 4 anciens call sites utilisent le primitif
- TypeScript OK + rendu `website-example` identique avant/après

## Done when
- Le pattern render→mkdir→formatHtml→writeIfChanged n'est plus dupliqué
- Un seul primitif partagé est utilisé par `renderSite` et `createRenderPage`
- `bun tsc --noEmit` OK, rendu `website-example` identique

## Commit proposal
Title: `refactor(core): deduplicate render-to-file pattern into shared primitive`
Description:
- Extract render→mkdir→formatHtml→writeIfChanged into a shared renderPageToFile primitive
- Replace 4 duplicate implementations in render.ts and render-synthetic-page.ts
- No behavior change, identical output
Scope(s):
- core
Why these scopes:
- Refacto interne du pipeline de rendu dans src/core/build — scope "core"

## Pilot exchange

## Dev log
- 2026-03-20 00h10m00s — Change: création du primitif renderToFile et remplacement des 6 call sites
  Why this way:
  - Observed issue: pattern render→mkdir→formatHtml→writeIfChanged dupliqué 6 fois (5 dans render.ts, 1 dans render-synthetic-page.ts) — pas 4 comme estimé initialement (2 occurrences supplémentaires : collection forbidden + 404 page)
  - Root cause: pas de primitif d'orchestration FS partagé entre les différents types de pages
  - Chosen fix: créé `src/core/build/render-to-file.ts` avec `renderToFile(opts)`, `TemplateRenderer` type exporté, `DEFAULT_PAGE_FILENAME` constante exportée
  - Détails: wrapper `writeRenderedPage(context, targetDir, fileName?)` dans renderSite pour éviter le parameter sprawl ; `TemplateRenderer` type canonique (supprimé de render.ts et render-synthetic-page.ts) ; `DEFAULT_PAGE_FILENAME` utilisé aussi dans prune.ts (5 occurrences) et protect-assets.ts (1 occurrence)
  - Evidence: `bun tsc --noEmit` OK, SHA256 `_public/` identique (45fca475…), serveur navigable
  Commands/tests: `bun tsc --noEmit` ✓ | `bun run build -v website-example` ✓ | SHA256 identique | `bun run serve -v website-example` ✓
