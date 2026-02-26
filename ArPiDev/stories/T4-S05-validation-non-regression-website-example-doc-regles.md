# T4-S05 — Validation non-régression `website-example` + doc règles/cas limites

Created: 2026-02-26 19h56m39s
Closed:
2026-02-26 20h00m56s
Acceptance: User

Status: Done, Validated

## Context
`T4-S02` à `T4-S04` ont refondu le modèle interne (scan récursif, routing/index, rendu/helpers/navigation/prev-next) autour de `site.structure` (source de vérité) + vues dérivées `collections`/`rootEntries`.

Le chantier T4 a une contrainte explicite: malgré cette refonte interne, `website-example` doit conserver le même rendu attendu (pas de régression observable).

## Rationale
Après des stories d’implémentation transverses, il faut une story dédiée à la validation de non-régression et à la formalisation/documentation des règles, sinon on risque de considérer la refonte comme “terminée” sans preuve suffisante.

## Goal
Valider la non-régression fonctionnelle/rendu sur `website-example` (HTML + routes + navigation + export `_model`) et documenter les règles/cas limites du nouveau modèle arborescent avant refactor (`T4-S06`) et campagne de confiance (`T4-S07`).

## In scope
- Vérification de non-régression sur `website-example` :
  - build complet;
  - HTML généré (pages clés + structure/navigation/prev-next);
  - routes/pages générées;
  - export `_model/site.json` (cohérence de structure/routage).
- Vérification ciblée sur fixture récursif (entries racine + collections imbriquées) pour s’assurer que les nouveaux cas restent cohérents après `T4-S04`.
- Documentation interne des règles et cas limites du modèle récursif (classification, warnings, éléments ignorés, limites transitoires).
- Préparation des points ArPiDoc à traiter ensuite (sans forcément produire la doc utilisateur finale si prématuré).

## Out of scope
- Refactor structurel / découpage de `src/core/scan/index.ts` (`T4-S06`).
- Campagne de tests de confiance élargie et tests manuels co-pilotés complets (`T4-S07`).
- Nouvelles fonctionnalités produit hors chantier T4.
- Changement de rendu volontaire de `website-example`.

## Execution brief
- Exécuter une passe de build complète sur `website-example` et relever tout warning/erreur notable.
- Vérifier explicitement le HTML généré sur un set de pages de référence (root index, index de collection, entry avec navigation/prev-next, page utilisant `menu` / `navigation.webt`).
- Vérifier explicitement l’export `_model/site.json` (structure `site.structure`, projection `rootEntries`/`collections`, routes, indexes, timestamps/history si attendus).
- Vérifier le fixture récursif en build et export modèle pour confirmer les nouveaux cas (root entries, nested collections, sitemap/root routes) après adaptations T4-S04.
- Consigner les écarts: bug à corriger maintenant vs limite acceptable (et dans quelle story).
- Mettre à jour `DECISIONS.md` / notes ArPiDoc si des règles/cas limites doivent être figés pour la suite.

## Checks to run
- `bun run src/cli.ts build website-example` — build complet de référence.
- Vérifications HTML ciblées sur `website-example/_public` (lecture/grep) :
  - root index,
  - au moins un index de collection,
  - une entry avec `prev/next`,
  - une page utilisant `menu` / `navigation.webt`.
- `bun run src/cli.ts build website-example --export-model-only --skip-content` — export `_model` de référence.
- Vérifications explicites de `website-example/_public/_model/site.json` :
  - présence/cohérence `site.structure`,
  - présence/cohérence `rootEntries` (si vide/non vide selon site),
  - routes collections/entries attendues,
  - absence de régression évidente dans la projection utilisée par les templates.
- `bun run src/cli.ts build /tmp/webette-t4-s02-fixture` — build complet fixture récursif.
- `bun run src/cli.ts build /tmp/webette-t4-s02-fixture --export-model-only --skip-content` — export modèle fixture.
- Vérifications ciblées fixture :
  - HTML root entry et nested collection,
  - `sitemap.xml` contient les root entries,
  - `_model/site.json` contient `rootEntries` + routes/timestamps cohérents.

## Evidence expected
- Preuve écrite de la non-régression observable sur `website-example` (au moins sur pages/rendus clés).
- Preuve que le modèle exporté `_model/site.json` reste cohérent et exploitable après la refonte.
- Preuve sur fixture que les nouveaux cas récursifs restent corrects en build + export.
- Liste claire des limites restantes à traiter en `T4-S06` (refactor) et `T4-S07` (tests de confiance).
- Trace des décisions/doc à reporter dans ArPiDoc (si pas rédigé dans cette story).

## Files/areas likely involved
- `website-example/_public/**` (inspection des sorties)
- `website-example/_public/_model/site.json`
- `/tmp/webette-t4-s02-fixture/_public/**`
- `/tmp/webette-t4-s02-fixture/_public/_model/site.json`
- `ArPiDev/DECISIONS.md` (si clarification de règles/cas limites)
- `ArPiDoc/**` (notes de suivi uniquement si décidé)

## Constraints and traps
- Ne pas confondre “build OK” avec “non-régression de rendu prouvée”.
- Vérifier le HTML **et** le `_model/site.json` explicitement (pas seulement les logs de build).
- Distinguer clairement:
  - bug bloquant T4 à corriger avant `T4-S06`;
  - dette de refactor (`T4-S06`);
  - validation/test de confiance plus large (`T4-S07`).
- Éviter de lancer des refactors pendant la phase de validation.

## Documentation impact
- `DECISIONS.md`: possible mise à jour si la validation fige des comportements/cas limites non explicités.
- ArPiDoc (plus tard / batch): documenter la structure récursive, les entries racine, les dossiers ignorés et les règles de classification.
- Dev-facing: noter que `_model/site.json` expose `site.structure` + `rootEntries` (état interne T4).

## Ready when
- Le périmètre est centré sur validation + documentation (pas de nouvelles features).
- Les checks demandent explicitement vérification HTML et export `_model/site.json`.
- La contrainte de non-régression `website-example` est testable et tracée.
- Les frontières avec `T4-S06` / `T4-S07` sont claires.

## Done when
- `website-example` est validé sur build complet + vérifications HTML ciblées sans régression évidente.
- `_model/site.json` de `website-example` est vérifié et jugé cohérent avec la refonte T4.
- Le fixture récursif est validé sur build + export modèle pour les cas nouveaux.
- Les écarts/limites restants sont triés et assignés explicitement (`T4-S06` / `T4-S07` ou bug immédiat).
- La story contient les preuves (commandes + résultats + observations).

## Pending reason
- Waiting for user validation

## Remaining work
- User validation of non-régression conclusions / evidence
- If accepted: handoff to `T4-S06` (refactor scan file, no behavior change)

## Resume condition
- User requests corrections or validates and asks to proceed to `T4-S06`

## Commit proposal
Title:
docs(arpidev): record T4 non-regression validation evidence
Description:
- Document `website-example` non-regression checks for T4 (build logs, HTML spot checks, `_model/site.json` checks)
- Document recursive fixture validation evidence (`rootEntries`, nested collections, sitemap)
- Record remaining limits and their assignment to `T4-S06` / `T4-S07`
Scope(s):
- arpidev/story
Why these scopes:
- This story is a validation/documentation step; no production code changes are required when the checks pass

## Pilot exchange
- 2026-02-26 19h56m39s — Pilot -> User — Story créée après validation de `T4-S04`. Focus sur validation non-régression (`website-example`) et documentation des règles/cas limites, avec vérification explicite du HTML généré et de l’export `_model/site.json`.
- 2026-02-26 20h27m09s — User -> Pilot — Validation de `T4-S05`.

## Dev log
- 2026-02-26 19h59m00s — Kickoff Dev
  Why this way:
  - Observed need: le chantier T4 a besoin d’une validation explicite de non-régression (pas seulement “build OK”).
  - User requirement: vérifier explicitement le HTML généré et l’export `_model/site.json`.
  - Chosen approach: exécuter les builds de référence (`website-example` + fixture), puis faire des checks ciblés sur sorties HTML, `sitemap.xml` et `_model/site.json`.
  - Tradeoff: validation ciblée et argumentée (pas une diff visuelle exhaustive de tout le site) ; la campagne plus large reste pour `T4-S07`.
  Commands/tests: pending
- 2026-02-26 20h00m56s — Validation non-régression `website-example` (HTML + `_model/site.json`) + fixture récursif
  Summary:
  - `website-example` build complet OK ; pas de régression évidente observée sur pages HTML de référence (menu/nav/prev-next présents et cohérents).
  - `website-example` export `_model/site.json` OK ; `site.structure` présent, projection `collections` + routes attendues cohérente.
  - Fixture récursif build + export OK ; `rootEntries`, routes nested, `ignoredFolders` et timestamps confirmés ; `sitemap.xml` contient les root entries.
  Observed warnings / notes (non bloquants pour la story):
  - `website-example`: warnings déjà connus (`reference.targetNotFound` sur lien draft en build, `build.icons.icoFailed`).
  - `website-example`: `rootEntries` absent du `_model/site.json` (cohérent avec ce site de référence qui n’a pas d’entry racine, export sparse).
  HTML checks (website-example):
  - Root index: menu top-level + liens vers entries Playground/Credits présents (`website-example/_public/index.html`).
  - Collection index (`/playground/`): section `Collection contents` + liste des entries présente (`website-example/_public/playground/index.html`).
  - Entry (`/playground/introduction/`): item menu courant (`aria-current="page"`) + bloc `prev-next` vers `Edit your text` présent (`website-example/_public/playground/introduction/index.html`).
  - Résultat: rendu/navigation attendus conservés sur les pages clés vérifiées.
  `_model/site.json` checks (website-example):
  - `structure` présent (nouvelle base de scan récursif T4).
  - `collections` projection présente avec routes attendues (ex. `/playground/`, `/playground/introduction/`).
  - `rootEntries` non présent sur ce site (aucun cas root entry dans `website-example`) ; comportement acceptable/cohérent.
  Fixture checks (`/tmp/webette-t4-s02-fixture`):
  - HTML root entry `/home/` généré et menu présent.
  - HTML nested entry `/blog/specials/deep-post/` généré, retour collection correct, état courant visible dans menu.
  - `sitemap.xml` contient `/home/`, `/blog/specials/`, `/blog/specials/deep-post/`.
  - `_model/site.json` contient `ignoredFolders`, `rootEntries`, routes root/nested et timestamps `createdAt`/`updatedAt`.
  Documentation / decisions:
  - Pas de nouvelle décision d’architecture à ajouter dans `DECISIONS.md` à ce stade.
  - ArPiDoc user-facing reste à batcher après `T4` (au plus tôt après `T4-S05`, idéalement consolidé avec `T4-S07` si wording/tests manuels ajoutent des nuances).
  Limits triage (remaining stories):
  - `T4-S06`: refactor structurel / découpage de `src/core/scan/index.ts` (lisibilité, responsabilités), sans changement de comportement.
  - `T4-S07`: campagne de confiance plus large (tests techniques + checks manuels IA/user, couverture de cas réels/edge cases).
  Commands/tests:
  - `bun run src/cli.ts build website-example`
  - `bun run src/cli.ts build website-example --export-model-only --skip-content`
  - `bun run src/cli.ts build /tmp/webette-t4-s02-fixture`
  - `bun run src/cli.ts build /tmp/webette-t4-s02-fixture --export-model-only --skip-content`
  - `find website-example/_public -name 'index.html' | sort | head -n 40`
  - `sed -n '1,220p' website-example/_public/index.html`
  - `sed -n '1,220p' website-example/_public/playground/index.html`
  - `sed -n '1,260p' website-example/_public/playground/introduction/index.html`
  - `rg -n 'top-menu|/playground/introduction/|Collection contents' website-example/_public/index.html website-example/_public/playground/index.html`
  - `rg -n 'prev-next|href=\"/playground/edit-your-text/\"|aria-current=\"page\"' website-example/_public/playground/introduction/index.html`
  - `rg -n '\"structure\"|\"rootEntries\"|\"route\": \"/playground/\"|\"route\": \"/playground/introduction/\"' website-example/_public/_model/site.json`
  - `sed -n '40,140p' website-example/_public/_model/site.json`
  - `sed -n '680,780p' website-example/_public/_model/site.json`
  - `find /tmp/webette-t4-s02-fixture/_public -name 'index.html' | sort`
  - `sed -n '1,220p' /tmp/webette-t4-s02-fixture/_public/home/index.html`
  - `sed -n '1,240p' /tmp/webette-t4-s02-fixture/_public/blog/specials/deep-post/index.html`
  - `rg -n '<loc>.*(/home/|/blog/specials/|/blog/specials/deep-post/)</loc>' /tmp/webette-t4-s02-fixture/_public/sitemap.xml`
  - `rg -n '\"ignoredFolders\"|\"rootEntries\"|\"route\": \"/home/\"|\"route\": \"/blog/specials/deep-post/\"|\"createdAt\"|\"updatedAt\"' /tmp/webette-t4-s02-fixture/_public/_model/site.json | head -n 80`
