# T4-S07 — Refactor du scan (découpage, sans changement de comportement)

Created: 2026-02-26 20h33m11s
Closed:
2026-02-26 21h06m16s
Acceptance: User

Status: Done, Validated

## Context
`T4-S06` doit finaliser la bascule interne vers le système récursif comme base de fonctionnement de Webette.

Une fois cette base stabilisée, `src/core/scan/index.ts` restera probablement encore trop volumineux et mélangera plusieurs responsabilités. Ce refactor est volontairement séparé de la bascule fonctionnelle pour limiter le risque.

## Rationale
Le refactor de lisibilité/maintenabilité est utile, mais il ne doit pas parasiter la finalisation du comportement du nouveau système. Cette story intervient après la bascule interne pour nettoyer la structure sans re-changer la logique.

## Goal
Découper et clarifier `src/core/scan/index.ts` en modules/fonctions plus lisibles après finalisation du système récursif, sans changement de comportement observable.

## In scope
- Refactor structurel de `src/core/scan/index.ts` (extractions, responsabilités, commentaires utiles).
- Clarification des frontières (scan récursif, projection/vues dérivées, enrich/meta, orchestration).
- Préservation stricte du comportement et des sorties observables.

## Out of scope
- Bascule fonctionnelle vers le système récursif (faite en `T4-S06`).
- Nouvelles fonctionnalités.
- Campagne de tests de confiance étendue (`T4-S08`).

## Execution brief
- Extraire par petites étapes avec checks fréquents.
- Conserver les contrats de sortie stables.
- Documenter le découpage final dans le `Dev log`.

## Checks to run
- `bun run src/cli.ts build website-example --skip-content`
- `bun run src/cli.ts build website-example --export-model-only --skip-content`
- `bun run src/cli.ts build website-example`
- `bun run src/cli.ts build /tmp/webette-t4-s02-fixture --export-model-only --skip-content`

## Evidence expected
- Liste des modules/fonctions extraits.
- Preuves de non-régression sur `website-example` + fixture récursif.
- Confirmation qu’aucun changement de comportement n’est introduit.

## Files/areas likely involved
- `src/core/scan/index.ts`
- `src/core/scan/*.ts`
- imports/types associés

## Constraints and traps
- Pas de changement de comportement voulu.
- Éviter les dépendances circulaires lors des extractions.
- Conserver les commentaires utiles sur les règles de classification.

## Documentation impact
- ArPiDev story uniquement (structure interne).
- Pas d’ArPiDoc requis.

## Ready when
- `T4-S06` a stabilisé la base fonctionnelle récursive.
- Le scope est purement refactor.

## Done when
- `src/core/scan/index.ts` est allégé et recentré.
- Les checks de non-régression passent.
- Le découpage est documenté dans le `Dev log`.

## Pending reason
- 

## Remaining work
- Proceed to `T4-S08` (campagne de tests de confiance)

## Resume condition
- User requests follow-up adjustments on the scan split; otherwise proceed to `T4-S08`

## Commit proposal
Title:
refactor(scan): split scan orchestration into focused modules
Description:
- Extract scan internals from `src/core/scan/index.ts` into focused modules (`raw-scan`, `derived-views`, `enrich`, `utils`, internal types)
- Keep `scan/index.ts` as orchestration layer around the recursive structure source of truth
- Preserve observable behavior validated with `website-example` and recursive fixture builds/exports
Scope(s):
- collections
- refactor
Why these scopes:
- The change restructures scan internals without changing product behavior; impact is limited to content-tree scanning modules

## Pilot exchange
- 2026-02-26 20h33m11s — Pilot -> User — Story créée lors du recadrage T4: refactor du scan déplacé après la finalisation du système interne récursif (`T4-S06`).
- 2026-02-26 21h06m16s — User -> Pilot — Validation de `T4-S07` (refactor scan + ajout d’entêtes TS confirmé).

## Dev log
- 2026-02-26 21h01m00s — Kickoff Dev
  Why this way:
  - Observed issue: `src/core/scan/index.ts` had grown too large and mixed orchestration, recursive classification, enrich/meta helpers and flat-view derivation.
  - Constraint: `T4-S07` is a refactor-only story; no observable behavior change allowed.
  - Chosen approach: extract responsibilities into focused modules while keeping `scanSite()` as the entrypoint and preserving `site.structure` as source of truth.
  Commands/tests: pending
- 2026-02-26 21h01m19s — Scan refactor split completed (no behavior change observed)
  What changed:
  - `src/core/scan/index.ts` reduced to orchestration/import wiring (`scanSite()`, config loading, root index hookup).
  - Extracted internal raw scan types to `src/core/scan/internal-types.ts`.
  - Extracted scan helpers/predicates/path normalization to `src/core/scan/utils.ts`.
  - Extracted enrich/config-index logic to `src/core/scan/enrich.ts`.
  - Extracted recursive filesystem scan/classification and raw readers to `src/core/scan/raw-scan.ts`.
  - Extracted recursive structure enrichment + flat derived views builder to `src/core/scan/derived-views.ts`.
  - Preserved comments explaining non-obvious classification rules in the extracted modules.
  Size / readability evidence:
  - `src/core/scan/index.ts`: ~105 lines after split (from ~900-line monolith).
  - New scan modules totalize the extracted logic with clearer boundaries (`raw-scan` largest module by design for filesystem traversal/classification).
  Non-regression checks:
  - `bun run src/cli.ts build website-example --skip-content` ✅
  - `bun run src/cli.ts build website-example --export-model-only --skip-content` ✅
  - `bun run src/cli.ts build website-example` ✅
  - `bun run src/cli.ts build /tmp/webette-t4-s02-fixture --export-model-only --skip-content` ✅
  - `bun run src/cli.ts build /tmp/webette-t4-s02-fixture` ✅
  Output proofs (spot checks):
  - `website-example` HTML: `Collection contents` and `aria-current="page"` still present on reference pages.
  - `website-example` `_model/site.json`: `site.structure` still exported.
  - Fixture `_model/site.json`: `structure`, `ignoredFolders`, `rootEntries` still exported.
  - Fixture HTML + `sitemap.xml`: nested routes and `/home/` root entry still present.
  Commands/tests:
  - `bun run src/cli.ts build website-example --skip-content`
  - `bun run src/cli.ts build website-example --export-model-only --skip-content`
  - `bun run src/cli.ts build website-example`
  - `bun run src/cli.ts build /tmp/webette-t4-s02-fixture --export-model-only --skip-content`
  - `bun run src/cli.ts build /tmp/webette-t4-s02-fixture`
  - `wc -l src/core/scan/index.ts src/core/scan/internal-types.ts src/core/scan/utils.ts src/core/scan/enrich.ts src/core/scan/raw-scan.ts src/core/scan/derived-views.ts`
  - `rg -n '"structure"|"rootEntries"|"ignoredFolders"' website-example/_public/_model/site.json /tmp/webette-t4-s02-fixture/_public/_model/site.json`
  - `rg -n 'Collection contents|aria-current="page"|Previous|Next' website-example/_public/playground/index.html website-example/_public/playground/introduction/index.html`
  - `rg -n '/home/|deep-post|specials' /tmp/webette-t4-s02-fixture/_public/sitemap.xml /tmp/webette-t4-s02-fixture/_public/home/index.html /tmp/webette-t4-s02-fixture/_public/blog/specials/deep-post/index.html`
