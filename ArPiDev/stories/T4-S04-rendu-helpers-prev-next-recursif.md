# T4-S04 — Rendu / helpers / prev-next sur modèle récursif

Created: 2026-02-26 19h41m56s
Closed:
2026-02-26 19h51m39s
Acceptance: User

Status: Done, Validated

## Context
`T4-S03` a fait converger le routing/index vers la refonte récursive via une projection plate dérivée de `site.structure` (`collections` flat + `rootEntries`) et a validé la parité de routes/pages générées sur `website-example` (smoke / export) ainsi que les cas récursifs via fixture.

Limite explicitement laissée: le support `rootEntries` reste partiel sur la chaîne “contenu -> plugins -> history/sorting -> helpers/navigation/prev-next -> rendu HTML complet”, surtout hors `--skip-content`.

## Rationale
Cette story doit rendre le nouveau modèle réellement utilisable côté rendu/navigation sans casser `website-example`, avant la validation de non-régression de `T4-S05`.

## Goal
Adapter le rendu/templates/helpers/navigation/prev-next (et les traversées pipeline nécessaires) au modèle récursif avec vues dérivées (`collections` + `rootEntries`) pour obtenir un build complet cohérent, sans changement de rendu attendu sur `website-example`.

## In scope
- Supporter `rootEntries` dans la chaîne de build complète quand requis par le rendu:
  - résolution de contenu;
  - post-process markdown liens/images;
  - plugins transforms (si applicables aux entries racine);
  - history / sorting (au minimum comportement cohérent, documenté).
- Adapter le rendu HTML et les contextes templates pour éviter les régressions avec `rootEntries` et collections imbriquées.
- Adapter `menu` / `navigation.webt` pour que la navigation reste cohérente avec la projection/routing récursifs.
- Adapter `prev/next` (et éventuels helpers dépendants) avec règle produit inchangée:
  - “dans la collection logique courante”.
- Préserver le rendu attendu de `website-example` (objectif de non-régression du chantier T4).
- Documenter les limites restant pour `T4-S05` (validation/doc) et `T4-S06` (refactor) sans ambiguïté.

## Out of scope
- Validation finale exhaustive de non-régression HTML visuelle (`T4-S05`).
- Refactor structurel du scan / découpage de `src/core/scan/index.ts` (`T4-S06`).
- Campagne de tests de confiance étendue IA/user (`T4-S07`).
- Évolution produit supplémentaire (plugins/tags/config) hors T4.

## Execution brief
- Relever les modules qui itèrent encore uniquement sur `site.collections` et bloquent un build complet cohérent avec `rootEntries`.
- Adapter les traversées pipeline avec une stratégie simple et lisible (éviter de dupliquer trop de logique).
- Corriger `menu` / `navigation.webt` / `prev-next` pour conserver la navigation attendue sur `website-example` et supporter les nouveaux cas du fixture.
- Vérifier `website-example` en build complet (pas seulement `--skip-content`) et relire des pages clés (root index, collection index, entries avec nav/prev-next).
- Vérifier le fixture récursif en build complet pour les routes/pages + navigation de base.
- Consigner clairement les compromis transitoires restants (si certains modules restent “collections-only” mais non bloquants pour la story).

## Checks to run
- `bun run src/cli.ts build website-example` (ou `--skip-content` seulement si blocage externe à documenter) — validation build complet et rendu généré.
- `bun run src/cli.ts build website-example --export-model-only --skip-content` — recheck cohérence modèle/routes après adaptations de traversée.
- Relecture ciblée de pages HTML générées sur `website-example`:
  - root index,
  - au moins un index de collection,
  - une entry avec `prev/next`,
  - une page utilisant navigation (`menu` / `navigation.webt`).
- `bun run src/cli.ts build /tmp/webette-t4-s02-fixture` (ou `--skip-content` si templates/assets mini fixture limitent le test) — vérifier pages root entry / nested collection en build cohérent.
- Si des checks manuels user sont utiles (rendu/nav précis), préparer une mini checklist dans le `Dev log` pour `T4-S05/T4-S07`.

## Evidence expected
- Build `website-example` réussi avec rendu/navigation non régressés de manière évidente.
- Preuve que `rootEntries` ne sont plus “orphelins” dans la chaîne de build complète (ou limites restantes explicitement bornées).
- Preuve sur fixture que les nouveaux cas restent cohérents après adaptation helpers/navigation.
- Liste claire de ce qui reste pour `T4-S05` (validation/doc) vs `T4-S06` (refactor) vs `T4-S07` (tests).

## Files/areas likely involved
- `src/core/build/render.ts`
- `src/core/build/prev-next.ts`
- `src/core/templates/menu.ts`
- `src/core/resolve/resolvers/navigation.ts`
- `src/core/resolve/resolvers/reference.ts` / `src/core/targets.ts` (si références internes doivent supporter root entries/nested collections correctement)
- `src/core/build.ts` (plugins transforms sur `rootEntries`)
- `src/core/build/drafts.ts`, `src/core/build/sorting.ts`, `src/core/export/history.ts`
- `src/core/postprocess/markdown-links.ts`, `src/core/postprocess/markdown-images.ts`

## Constraints and traps
- Ne pas casser la parité de rendu `website-example` en “améliorant” la navigation.
- Garder la règle produit `prev/next` stable (“collection logique courante”).
- Les helpers/templates existants ont des attentes implicites sur la forme des données; préférer des adaptations de contexte prudentes.
- Éviter de dériver vers un gros refactor structurel (réservé à `T4-S06`).

## Documentation impact
- To document later (T4-S05 / ArPiDoc): comportement de navigation/rendu avec entries racine + collections imbriquées.
- To document later (T4-S05 / ArPiDoc): limites transitoires éventuelles du modèle exporté / helpers si elles persistent.

## Ready when
- Le but est unique (rendu/navigation cohérents sur modèle récursif avec vues dérivées).
- Les frontières avec `T4-S05`, `T4-S06`, `T4-S07` sont explicites.
- Les checks couvrent `website-example` (build/rendu) + fixture récursif.
- La contrainte de non-régression de rendu `website-example` est explicite.

## Done when
- Le build `website-example` complet reste fonctionnel avec rendu/navigation cohérents après adaptation.
- `menu` / `navigation.webt` / `prev-next` fonctionnent sans régression évidente sur `website-example`.
- Les `rootEntries` sont pris en charge de manière cohérente dans les traversées nécessaires au rendu de la story (ou limites restantes explicitement documentées).
- Les commandes/résultats et écarts éventuels sont consignés dans le `Dev log`.
- Les limites restantes sont triées explicitement entre `T4-S05`, `T4-S06`, `T4-S07`.

## Pending reason
- Waiting for user validation

## Remaining work
- Validate story acceptance (`website-example` rendered behavior + navigation/prev-next non-régression)
- Then handoff to `T4-S05` (validation/doc + non-régression chantier)

## Resume condition
- User asks for fixes after validation review, or approves and moves to `T4-S05`

## Commit proposal
Title:
feat(build): support root entries in render/navigation pipeline
Description:
- Extend the full build pipeline to process `rootEntries` (resolve, postprocess, sorting, history, plugin transforms)
- Adapt navigation/helpers/prev-next/reference handling for root-level entries in the T4 recursive derived-view model
- Include root entries in sitemap and template `withEntry` lookups, while keeping `website-example` build output stable
Scope(s):
- core/scan-derived-views
- core/build-render
- core/navigation-helpers
- core/export
Why these scopes:
- T4-S04 finishes the implementation path from recursive scan/routing (`site.structure`) to coherent full rendering and navigation behavior
- Changes span multiple modules but remain behavior-preserving for `website-example`

## Pilot exchange
- 2026-02-26 19h41m56s — Pilot -> User — Story créée après validation de `T4-S03`. Focus sur rendu/helpers/navigation/prev-next + traversées pipeline nécessaires, sans lancer le refactor de structure (`T4-S06`) ni la campagne de tests (`T4-S07`).
- 2026-02-26 19h56m39s — User -> Pilot — Validation de `T4-S04`.

## Dev log
- 2026-02-26 19h41m56s — Kickoff Dev
  Why this way:
  - Observed issue: `T4-S03` a routé/indexé `rootEntries`, mais plusieurs traversées pipeline et helpers restent centrés sur `site.collections` uniquement.
  - Root cause: la chaîne de build historique n’avait pas de concept d’entries racine.
  - Chosen fix: compléter d’abord les traversées “backend” (resolve/postprocess/plugins/history/sorting) pour rendre le build complet cohérent, puis adapter helpers/navigation/prev-next.
  - Tradeoff: modifications transverses en plusieurs modules (mais ciblées) avant le refactor de structure prévu en `T4-S06`.
  - Evidence: à produire via builds complets `website-example` + fixture récursif, puis relectures de pages/navigation.
  Commands/tests: pending
- 2026-02-26 19h47m00s — Traversées pipeline + navigation/helpers/prev-next adaptées à `rootEntries`
  What changed:
  - Added `rootEntries` traversal support in resolve/postprocess/history/sorting/plugin transforms pipeline.
  - Adapted `prev/next`, `menu`, `navigation` resolver and `reference` resolver for root-level entries (root logical group / matching without collection).
  - Preserved derived-view model shape (`collections` flat + `rootEntries`) without refactoring structure (deferred to `T4-S06`).
  Why this way:
  - Keeps the current templates/helpers contract usable while extending support to root entries.
  - Minimizes risk during T4 by using small compatibility shims (pseudo root collection where needed).
  Evidence:
  - `website-example` full build succeeds after adaptations.
  - Fixture recursive build succeeds and renders root/nested routes.
  - `_model/site.json` on fixture contains `rootEntries` with routes and history timestamps.
  Commands/tests:
  - `bun run src/cli.ts build website-example`
  - `bun run src/cli.ts build /tmp/webette-t4-s02-fixture`
  - `bun run src/cli.ts build website-example --export-model-only --skip-content`
- 2026-02-26 19h51m39s — Final pass: `sitemap` + template helper `withEntry`
  What changed:
  - `sitemap.xml` generation now includes `site.rootEntries`.
  - Template helper `withEntry` can resolve root entries (slug/id/route) in addition to collection entries.
  - Cleaned a duplicate type import in `menu` helper.
  Why this way:
  - Prevents root entries from being “pages that exist but are absent from helper/sitemap outputs”.
  - Keeps helper behavior backward compatible (`collection` remains undefined for root entries).
  Evidence:
  - Fixture sitemap contains `/home/` root-entry URL.
  - `website-example` full build still succeeds and sitemap count remains stable.
  Commands/tests:
  - `bun run src/cli.ts build website-example`
  - `bun run src/cli.ts build /tmp/webette-t4-s02-fixture`
  - `rg -n "<loc>.*(/home/)</loc>" /tmp/webette-t4-s02-fixture/_public/sitemap.xml`
  Remaining limits (for next stories):
  - `T4-S05`: broader non-régression validation of rendered HTML/navigation on `website-example`
  - `T4-S06`: structural refactor/decoupage (`src/core/scan/index.ts`)
  - `T4-S07`: confidence test campaign (automated + manual IA/user)
