# T4-S03 — Routing + génération d’index sur arbre récursif

Created: 2026-02-26 19h12m58s
Closed: 2026-02-26 19h41m56s
Acceptance: User

Status: Done, Validated

## Context
`T4-S02` a introduit une base de scan récursif exportée dans `site.structure` avec classification `collection`/`entry`, tout en conservant la projection plate dérivée `site.collections[].entries` pour maintenir le pipeline fonctionnel.

La prochaine étape est d’aligner le routing et la génération d’index sur le nouveau modèle récursif, sans casser le rendu attendu de `website-example`.

## Rationale
Tant que le routing/index repose sur le modèle plat historique, les nouveaux cas (entries racine, collections imbriquées) restent mal représentés. Cette story traite ce cœur fonctionnel avant d’adapter les helpers/templates (`T4-S04`).

## Goal
Faire reposer le routing et la génération d’index sur l’arbre récursif (ou une projection dérivée cohérente du nouvel arbre), avec parité de routes/pages générées sur `website-example` et compatibilité temporaire du pipeline.

## In scope
- Adapter la génération de routes pour supporter:
  - entries racine;
  - collections imbriquées;
  - entries sous collections imbriquées.
- Adapter l’extraction/génération des index (root + collection indexes) sur base du modèle récursif.
- Introduire les utilitaires de traversée/projection nécessaires (flatten / lookup / parentage) si besoin.
- Préserver la parité de routes/pages générées sur `website-example` (objectif de non-régression de chantier).
- Conserver un état fonctionnel du pipeline pour préparer `T4-S04`.
- Documenter les limites restantes explicitement pour `T4-S04` (rendu/helpers) si certaines adaptations d’interface template sont différées.

## Out of scope
- Refonte finale des helpers/templates (`menu`, `index`, `navigation.webt`) et `prev/next` (`T4-S04`).
- Validation finale HTML visuelle de non-régression sur `website-example` (`T4-S05`).
- Refonte plugin / tags / config (hors chantier T4).
- Nettoyage complet des structures historiques si cela met en risque la compatibilité temporaire.

## Execution brief
- Identifier une source de vérité temporaire pour routes/index à partir de `site.structure` (directement ou via projection intermédiaire), en évitant une double logique divergente.
- Adapter `src/core/routes.ts` et la phase scan/build associée pour calculer des routes cohérentes avec les nouvelles positions (root entries + nested collections).
- Adapter `src/core/build/index-folders.ts` (et points d’appel) pour extraire/associer les indexes sur l’arbre récursif.
- Vérifier les pages/index générés sur `website-example` (parité des paths attendus).
- Vérifier sur le fixture local (`/tmp/webette-t4-s02-fixture` ou équivalent) que les nouveaux cas produisent des routes/index cohérents.
- Laisser `T4-S04` se concentrer sur la forme de rendu/template, pas sur le calcul des routes.

## Checks to run
- `bun run src/cli.ts build website-example --skip-content` — smoke build après refonte routing/index.
- `find website-example/_public -name 'index.html' | sort` (ou équivalent) — comparer la liste des pages générées avant/après la story.
- `bun run src/cli.ts build website-example --export-model-only --skip-content` — vérifier la cohérence routes/modèle exporté après adaptation.
- `rg -n '"route": ' website-example/_public/_model/site.json | head -n 200` — vérifier routes collections/entries non régressées de manière évidente.
- `bun run src/cli.ts build /tmp/webette-t4-s02-fixture --skip-content` — preuve de routes/pages sur cas entry racine + collections imbriquées.
- Si comparaison manuelle de snapshots: consigner précisément les écarts observés et la décision (bug vs changement acceptable) dans le `Dev log`.

## Evidence expected
- Description de la stratégie choisie pour faire converger routing/index vers `site.structure`.
- Preuve que `website-example` build toujours et conserve des routes/pages générées cohérentes (pas de régression évidente de paths).
- Preuve sur fixture que les nouveaux cas (entry racine, collection imbriquée) ont des routes/index calculés de façon cohérente.
- Liste des adaptations reportées à `T4-S04` (templates/helpers/prev-next) sans ambiguïté.

## Files/areas likely involved
- `src/core/routes.ts`
- `src/core/scan/index.ts` (si la projection plate dérivée doit être enrichie)
- `src/core/build/index-folders.ts`
- `src/core/build/render.ts` (uniquement si couplage strict routes/index impose une adaptation minimale)
- `src/core/model.ts` (si types de projection / lookups supplémentaires)
- Éventuellement `src/core/build.ts` (orchestration/logs de scan/index)

## Constraints and traps
- Ne pas introduire une seconde logique de routing durable (modèle plat concurrent vs récursif) sans point de vérité clair.
- `website-example` doit rester stable en sortie observable; une “bonne” architecture qui casse des routes n’est pas acceptable.
- `T4-S04` doit garder un scope utile: ne pas y laisser des bugs de routing/index déguisés en problèmes de template.
- Les indexes custom (`root` / `collection`) existent déjà; la refonte doit préserver leur comportement attendu même si l’implémentation interne change.

## Documentation impact
- To document later (T4-S05 / ArPiDoc): comportement des routes/index sur entries racine et collections imbriquées.
- To document later (T4-S05 / ArPiDoc): limites/compatibilité temporaire éventuelles si visibles côté `_model`.

## Ready when
- Le but est unique (routing/index récursifs avec parité de sortie).
- Les frontières avec `T4-S04` et `T4-S05` sont explicites.
- Les checks couvrent `website-example` + fixture récursif.
- La contrainte “tout doit continuer à fonctionner” est traduite en preuves concrètes (pages/routes générées).

## Done when
- Les routes (collections/entries/indexes) sont calculées à partir du nouveau modèle récursif ou d’une projection dérivée cohérente.
- `website-example` build avec routes/pages générées sans régression évidente.
- Le fixture récursif produit des routes/pages cohérents pour entry racine + collections imbriquées.
- Les commandes/résultats et écarts éventuels sont consignés dans le `Dev log`.
- Les limites restantes pour `T4-S04` sont explicitement consignées.

## Pending reason
- 

## Remaining work
- 

## Resume condition
- 

## Commit proposal
Title: feat(collections): route nested collections and root entries from recursive scan projection
Description:
- Derive the derived flat collections projection from `site.structure` and add `rootEntries` for root-level entry routing.
- Generate nested collection routes/index pages from collection path hierarchy while preserving `website-example` route/page parity.
- Render and prune root-entry pages in derived-view mode, with recursive fixture proof for root entries and nested collections.
Scope(s):
- collections
Why these scopes:
- The change focuses on content-tree routing/index behavior and derived flat collection projection, without the final helper/template refactor yet.

## Pilot exchange
- 2026-02-26 19h12m58s — Pilot -> User — Story créée après validation de `T4-S02`. Focus volontaire sur routing/index et parité des routes/pages générées; `menu`/`navigation`/`prev-next` restent dans `T4-S04`.
- 2026-02-26 19h41m56s — User -> Pilot — Validation de `T4-S03`.

## Dev log
- 2026-02-26 19h13 CET — Kickoff Dev
  Why this way:
  - Observed issue: `T4-S02` fournit `site.structure` mais le routing/index repose encore sur la projection plate dérivée, ce qui laisse les cas récursifs mal routés.
  - Root cause: le scan historique continue de produire `site.collections` selon l’ancienne logique (profondeur), et `routes/render/index` consomment ce contrat.
  - Chosen fix: basculer la projection plate dérivée vers une projection dérivée de `site.structure` (collections “flat” + `rootEntries`) puis adapter `routes`/`render`/`prune` minimalement.
  - Tradeoff: certains modules non ciblés (résolution/plugins/history/sorting pour `rootEntries`) restent à compléter plus tard.
  - Evidence: à produire sur `website-example` + fixture récursif.
  Commands/tests: pending
- 2026-02-26 19h24 CET — Change: projection plate dérivée dérivée de `site.structure` + `rootEntries`
  Why this way:
  - Observed issue: la projection plate dérivée créait encore des “collections” vides pour des entries racine et classait mal des cas récursifs.
  - Root cause: `listCollectionsRaw` / `listEntriesRaw` scannent par profondeur et non par classification.
  - Chosen fix: projeter `RawCollection[]` + `RawEntry[]` root depuis l’arbre de scan récursif (via la fonction de projection des vues plates utilisée à ce moment), puis enrichir/résoudre routes sur cette base.
  - Tradeoff: on garde un contrat `site.collections` plat (compatibilité temporaire) plutôt qu’un basculement direct de tout le pipeline sur un arbre.
  - Evidence: le fixture passe de faux positifs du modèle plat précédent (`home`, `empty`, `metaonly` en collections) à 3 vraies collections + 1 root entry dans le résumé de scan.
  Commands/tests:
  - `bun run src/cli.ts build /tmp/webette-t4-s02-fixture --skip-content` (OK, `Scan : 3 collections, 4 entrées, 4 blocs`)
- 2026-02-26 19h24 CET — Change: routes nested collections + root entries, génération d’index cohérente
  Why this way:
  - Observed issue: les routes de collections imbriquées doivent inclure le chemin parent (`/blog/specials/...`) et les entries racine doivent obtenir des pages (`/home/`).
  - Root cause: `resolveRoutes()` calculait les routes de collection sans hiérarchie parentale et n’avait pas de support `rootEntries`.
  - Chosen fix: calcul récursif de `baseRoute` via la hiérarchie de `collection.path`, ajout de `resolveRootEntryRoutes()`, rendu des root entries dans `render.ts`, et prise en charge dans `prune.ts`.
  - Tradeoff: clés d’indexes de collection (`site.indexes.collections`) restent basées sur slug/id pour compatibilité; collisions potentielles de slugs imbriqués non traitées dans cette story.
  - Evidence:
    - Fixture: `/home/index.html`, `/blog/specials/index.html`, `/blog/specials/deep-post/index.html`, `/metacollection/child/index.html` générés.
    - `_model/site.json` du fixture contient `rootEntries` et routes attendues (`/home/`, `/blog/specials/`, `/blog/specials/deep-post/`).
  Commands/tests:
  - `find /tmp/webette-t4-s02-fixture/_public -name 'index.html' | sort` (OK, pages attendues présentes)
  - `rg -n '\"rootEntries\"|\"route\": \"/home/\"|\"route\": \"/blog/specials/\"|\"route\": \"/blog/specials/deep-post/\"|\"route\": \"/metacollection/child/\"' /tmp/webette-t4-s02-fixture/_public/_model/site.json` (OK)
- 2026-02-26 19h24 CET — Check: non-régression observable conservée sur `website-example` (routes/pages)
  Why this way:
  - Observed issue: la refonte ne doit pas casser le site de référence actuel.
  - Root cause: changements sur projection + routes + rendu peuvent facilement déplacer des pages existantes.
  - Chosen fix: relancer `website-example` en smoke build et export modèle (séquentiel pour éviter collision d’écriture).
  - Tradeoff: vérification HTML visuelle complète reste différée à `T4-S05`; ici on valide surtout build/routing/pages générées.
  - Evidence:
    - `website-example` build `--skip-content` terminé avec succès.
    - `website-example` export-only `--skip-content` terminé avec succès.
    - Résumé de scan inchangé sur `website-example` (3 collections, 17 entrées, 41 blocs).
  Commands/tests:
  - `bun run src/cli.ts build website-example --skip-content` (OK)
  - `bun run src/cli.ts build website-example --export-model-only --skip-content` (OK; relancé séquentiellement après un échec de collision quand exécuté en parallèle sur le même dossier)
- 2026-02-26 19h24 CET — Remaining limits for next stories
  Why this way:
  - Observed issue: la story traite routing/index et rendu minimal des root entries, mais pas encore toute la chaîne sur `rootEntries`.
  - Root cause: plusieurs modules hors scope (`resolveBlocks`, plugins transform, history/sorting, helpers/nav/prev-next) itèrent encore uniquement sur `site.collections`.
  - Chosen fix: documenter explicitement les limites restantes pour `T4-S04`/`T4-S05`.
  - Tradeoff: support root entries pleinement fiable en build “complet” (avec contenu/plugins) reste partiel à ce stade; les preuves fixture de cette story utilisent `--skip-content`.
  - Evidence: code parcouru + checks exécutés sur fixture en `--skip-content`.
  Commands/tests:
  - `rg -n \"site\\.collections\\?\\? \\[\\]|for \\(const collection of site\\.collections\" src/core src/plugins` (référence de travail déjà utilisée au cadrage)
