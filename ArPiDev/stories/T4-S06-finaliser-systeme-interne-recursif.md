# T4-S06 — Finaliser le système interne récursif comme système de fonctionnement

Created: 2026-02-26 20h27m09s
Closed:
Acceptance: User

Status: Done, Validated

## Context
`T4-S02` à `T4-S05` ont rendu la refonte arborescente récursive fonctionnelle et validée en non-régression sur `website-example`.

Cependant, l’implémentation repose encore sur une couche interne de compatibilité/projection (`site.structure` + projection `collections`/`rootEntries`) qui a servi à sécuriser la migration incrémentale.

Le but produit/technique confirmé est que le **nouveau système récursif** devienne **le** système de fonctionnement interne de Webette, et non une base “à côté” d’une logique historique durable.

## Rationale
Le projet fonctionne, mais tant que la couche de compatibilité reste structurante, on garde de la complexité inutile et un risque de divergences futures. Il faut finaliser la bascule interne avant d’investir dans un refactor de confort (`T4-S07`).

## Goal
Faire du modèle/routing/rendu récursifs la base de fonctionnement interne de Webette (source de vérité unique), en supprimant la dépendance à la projection plate dérivée interne, sans régression de rendu sur `website-example`.

## In scope
- Identifier les points où la logique historique/projection de compatibilité reste structurante dans le pipeline.
- Basculer les modules encore dépendants d’un contrat historique “historique” vers la source de vérité récursive (la projection plate dérivée ne doit plus piloter le calcul interne).
- Supprimer la duplication de logique scan/routing/rendu entre l’ancienne logique et le récursif.
- Conserver le comportement utilisateur validé:
  - rendu `website-example` inchangé (non-régression),
  - support des entries racine et collections imbriquées maintenu.
- Documenter clairement les vues dérivées éventuellement conservées (export/consommation), en explicitant qu’elles ne pilotent plus le calcul interne.

## Out of scope
- Refactor de structure/lisibilité du scan (`T4-S07`) hors adaptations strictement nécessaires à la bascule.
- Campagne de tests de confiance étendue (`T4-S08`).
- Nouvelles fonctionnalités produit hors chantier T4.
- Changement volontaire de rendu/templates de `website-example`.

## Execution brief
- Cartographier rapidement les dépendances restantes au modèle historique dans le pipeline T4 (scan -> resolve -> routes -> render -> exports/helpers).
- Définir une cible claire de “système de fonctionnement”:
  - source de vérité récursive;
  - les vues dérivées éventuelles sont limitées à la consommation/export (pas de logique de calcul concurrente).
- Implémenter la bascule par étapes avec preuves fréquentes (`website-example` + fixture récursif).
- Vérifier explicitement le HTML généré et `_model/site.json` après la bascule (pas seulement un build OK).
- Consigner les arbitrages (ce qui est supprimé, ce qui est conservé, pourquoi).

## Checks to run
- `bun run src/cli.ts build website-example` — build complet de référence après bascule.
- `bun run src/cli.ts build website-example --export-model-only --skip-content` — vérification du `_model/site.json` après bascule.
- Vérifications HTML ciblées sur `website-example/_public` :
  - root index,
  - index de collection,
  - entry avec `prev/next`,
  - navigation (`menu` / `navigation.webt`) sur pages clés.
- Vérifications `_model/site.json` sur `website-example` :
  - cohérence `site.structure`,
  - cohérence des routes/projections utilisées par templates,
  - absence de régression évidente dans les données consommées.
- `bun run src/cli.ts build /tmp/webette-t4-s02-fixture`
- `bun run src/cli.ts build /tmp/webette-t4-s02-fixture --export-model-only --skip-content`
- Vérifications fixture :
  - root entries + nested collections toujours routés/rendus,
  - `sitemap.xml` toujours cohérent,
  - `_model/site.json` (rootEntries, ignoredFolders, routes) cohérent.
- Optionnel (si environnement le permet): smoke `serve` sur `website-example`; sinon documenter la limitation et s’appuyer sur validation user.

## Evidence expected
- Description claire de ce qui a été supprimé côté logique historique/projection interne.
- Preuves de non-régression sur `website-example` (HTML + `_model/site.json`).
- Preuves sur fixture récursif (entries racine / nested collections).
- Liste explicite de ce qui reste pour `T4-S07` (refactor) et `T4-S08` (tests).

## Files/areas likely involved
- `src/core/scan/index.ts`
- `src/core/routes.ts`
- `src/core/build/*.ts`
- `src/core/resolve/**/*.ts`
- `src/core/export/*.ts`
- `src/core/templates/*.ts` (si adaptation mineure de consommation de modèle)
- `src/core/model.ts`

## Constraints and traps
- Ne pas confondre “suppression de l’ancienne logique” avec “refactor de structure”: priorité au comportement correct.
- `website-example` doit rester identique en rendu observable.
- Une éventuelle vue dérivée `collections` ne doit exister que comme vue de consommation/export, jamais comme moteur de calcul concurrent.
- Éviter un big bang non vérifié: bascule incrémentale + checks fréquents.

## Documentation impact
- `DECISIONS.md`: mise à jour pertinente si la bascule fige explicitement que les vues dérivées restantes ne sont plus des moteurs internes.
- ArPiDoc (plus tard / batch): expliquer la structure récursive côté utilisateur (déjà prévu T4/T4-S08).
- ArPiDev story: documenter explicitement la cible interne atteinte.

## Ready when
- Le but est explicite: faire du système récursif **le** système interne de fonctionnement.
- Les checks couvrent HTML + `_model/site.json` sur `website-example` et fixture récursif.
- Les frontières avec `T4-S07` (refactor) et `T4-S08` (tests de confiance) sont claires.

## Done when
- Le pipeline repose sur la source de vérité récursive comme base de calcul interne.
- La dépendance à la logique historique concurrente est supprimée et la source de vérité interne est récursive.
- `website-example` reste non régressé (HTML + `_model/site.json` vérifiés).
- Le fixture récursif reste correct (build + export modèle).
- Les preuves et arbitrages sont consignés dans le `Dev log`.

## Pending reason
- Waiting for user validation

## Remaining work
- User validation of the T4-S06 bascule conclusion
- Then proceed to `T4-S07` (scan refactor/découpage) and `T4-S08` (tests de confiance)

## Resume condition
- User requests additional hardening for T4-S06, or validates and moves to `T4-S07`

## Commit proposal
Title:
refactor(scan): remove dead historical scan path and formalize recursive source of truth
Description:
- Remove unused historical raw scan functions from `scan/index.ts` and keep the recursive scan as the only filesystem classification engine
- Rename/clarify the flat `collections`/`rootEntries` build step as derived views from `site.structure`
- Align model comments and ArPiDev decisions with the recursive structure as the internal source of truth
Scope(s):
- collections
- docs/arpidev
Why these scopes:
- The code change affects the scanning/content-tree internals, while the ArPiDev decision/story records the architecture baseline after T4

## Pilot exchange
- 2026-02-26 20h27m09s — Pilot -> User — Story initialement cadrée comme refactor du scan après `T4-S05`.
- 2026-02-26 20h33m11s — User -> Pilot — Recadrage demandé: la priorité est de faire du nouveau système récursif **le** système de fonctionnement interne, avant le refactor.
- 2026-02-26 20h33m11s — Pilot -> User — Story recadrée en bascule interne vers le système récursif; le refactor du scan est déplacé en `T4-S07`.
- 2026-02-26 20h55m34s — User -> Pilot — Validation de `T4-S06` (et alignment wording/doc confirmé).

## Dev log
- 2026-02-26 20h41m05s — Kickoff Dev
  Why this way:
  - Observed issue: the recadrage T4-S06 requires a strict internal architecture statement (“récursif = système de fonctionnement”), while code/comments still referred to migration wording and older projection semantics.
  - Constraint: avoid behavior regressions; prioritize removing obsolete internals and clarifying source-of-truth semantics before the structural refactor (`T4-S07`).
  - Chosen approach: remove dead historical scan functions, rename the flat projection step as a derived view from `site.structure`, and align model comments + decision records.
  Commands/tests: pending
- 2026-02-26 20h41m05s — Bascule interne formalisée: scan historique mort supprimé, récursif = source de vérité
  What changed (code):
  - Removed unused historical raw scan functions from `src/core/scan/index.ts` (`listEntriesRaw`, `listCollectionsRaw`), so the recursive classifier is the only scan path building content-tree structure.
  - Renamed the flat-view derivation function and clarified comments: `site.structure` is the source of truth, `collections/rootEntries` are derived views for consumers.
  - Updated `src/core/model.ts` comments to mark `structure` as recursive source of truth and `collections`/`rootEntries` as derived views (consumption/export/templates).
  What changed (ArPiDev decision):
  - Added an explicit architecture decision in `DECISIONS.md` stating that `site.structure` is the internal source of truth and `site.collections`/`site.rootEntries` are derived views, not competing calculation engines.
  Why this satisfies T4-S06 intent:
  - The remaining flat views are retained as consumption/export shapes, but the old scanner path is removed and the recursive structure is the only scan/classification engine.
  - This finalizes the “which system drives Webette internally” question before the scan refactor story (`T4-S07`).
  Non-regression evidence:
  - `website-example` build (`--skip-content`) OK.
  - `website-example` export model (`--export-model-only --skip-content`) OK.
  - `website-example` full build OK.
  - `website-example` HTML smoke grep confirms navigation/menus/prev-next markers still present.
  - Fixture recursive export/build OK with `ignoredFolders`, `rootEntries`, nested routes preserved.
  - Fixture HTML smoke grep confirms root entry + nested collection pages still coherent.
  Commands/tests:
  - `bun run src/cli.ts build website-example --skip-content`
  - `bun run src/cli.ts build website-example --export-model-only --skip-content`
  - `bun run src/cli.ts build website-example`
  - `bun run src/cli.ts build /tmp/webette-t4-s02-fixture --export-model-only --skip-content`
  - `bun run src/cli.ts build /tmp/webette-t4-s02-fixture`
  - `rg -n '"structure"|"route": "/playground/"|"route": "/playground/introduction/"' website-example/_public/_model/site.json`
  - `rg -n '"rootEntries"|"ignoredFolders"|"route": "/home/"|"route": "/blog/specials/deep-post/"' /tmp/webette-t4-s02-fixture/_public/_model/site.json`
  - `rg -n 'top-menu|Collection contents|prev-next|aria-current="page"' website-example/_public/index.html website-example/_public/playground/index.html website-example/_public/playground/introduction/index.html`
  - `rg -n '<h2>Home</h2>|Site menu|Back to collection|class="is-current"' /tmp/webette-t4-s02-fixture/_public/home/index.html /tmp/webette-t4-s02-fixture/_public/blog/specials/deep-post/index.html`
  Remaining for next stories:
  - `T4-S07`: refactor structurel/découpage de `src/core/scan/index.ts` (lisibilité/maintenabilité, sans changement de comportement)
  - `T4-S08`: campagne de tests de confiance élargie (techniques + checks manuels IA/user)
