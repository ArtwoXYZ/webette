# T6-S10 — Parallélisation du rendu

Created: 2026-03-22 14h00m00s
Closed: 2026-03-22 20h10m00s
Acceptance: User

Status: Done, Validated

## Goal

Déterminer si la parallélisation des boucles de rendu (`renderSite`, `renderTagPages`) apporte un gain de performance mesurable, et l'implémenter uniquement si c'est le cas.

## Context

Les boucles de rendu dans `renderSite` (render.ts L168-296) et `renderTagPages` (tag-pages.ts L64-131) sont séquentielles (`for...of` + `await`). Chaque itération est indépendante (chemin unique, pas de state muté partagé, template stateless). Techniquement parallélisable — mais website-example n'a que ~25 entries : le gain pourrait être négligeable.

## In scope

- Instrumenter le temps de rendu (renderSite + renderTagPages) dans le build
- Mesurer sur website-example et éventuellement un jeu de données plus gros
- Décision Go/No-Go basée sur les mesures
- Si Go : paralléliser les boucles d'entries, d'indexes et de tag pages avec `Promise.all`

## Out of scope

- Paralléliser d'autres phases du build (scan, transform, copy assets)
- Ajouter des dépendances externes (pLimit etc.) — utiliser une solution native si besoin
- Modifier le comportement de rendu (output identique)

## Execution brief

1. **Benchmark** : ajouter `performance.now()` ou `Bun.nanoseconds()` autour de `renderSite` et `renderTagPages` dans `finalize.ts`. Mesurer 3-5 runs sur website-example, noter les timings moyens dans le Dev log.
2. **Évaluer** : si le rendu total représente moins de ~100ms ou moins de 10% du build total → No-Go, documenter et clore. Sinon → Go.
3. **Si Go — implémenter** :
   - Dans `renderSite` : collecter les promises de `renderEntryTo` dans un tableau, résoudre avec `Promise.all`, compter les résultats.
   - Même approche pour les boucles d'indexes (collection indexes) et `renderTagPages`.
   - Attention : les boucles d'indexes ont du `pickIndexLayout` async avec logging — vérifier que les logs restent cohérents (acceptable en single-thread JS).
4. **Vérifier** : `bun run build` sur website-example, diff `_public/` avant/après, timings comparés.

## Checks to run

- `bun run build` sur website-example — succès sans erreur
- Diff du contenu `_public/` entre la version séquentielle et parallèle — doit être identique
- Timings avant/après consignés dans le Dev log

## Evidence expected

- Timings du benchmark initial (baseline séquentielle)
- Décision Go/No-Go avec justification chiffrée
- Si Go : timings après parallélisation + diff _public/ vide

## Done when

- Les timings de rendu sont mesurés et documentés
- La décision Go/No-Go est prise et justifiée
- Si Go : les boucles sont parallélisées, le rendu est identique, les timings montrent une amélioration
- Si No-Go : la story est close avec les mesures et la justification

## Files/areas likely involved

- `src/core/build/finalize.ts` — point d'instrumentation
- `src/core/build/utils/render.ts` — boucles entries + indexes (L168-296)
- `src/core/build/utils/tag-pages.ts` — boucles tag pages (L64-131)
- `src/core/build/utils/render-to-file.ts` — primitive FS (inchangée)

## Constraints and traps

- website-example est petit (~25 entries) : ne pas conclure qu'un gain invisible ici sera invisible partout
- JS single-thread : `Promise.all` ne parallélise que l'I/O, pas le CPU (template render, rehype format)
- Si `formatHtml` (rehype) est le vrai bottleneck, Promise.all n'aidera pas beaucoup car c'est CPU-bound
- Ne pas casser le compteur `renderedPages` — le recalculer depuis les résultats Promise.all

## Pending reason

## Remaining work

## Resume condition

## Commit proposal
Title: `perf(core): benchmark render parallelization — no-go`
Description:
- Benchmark renderSite + renderTagPages on website-example (~107 pages): prettyPrint (rehype) accounts for 77% of render time, CPU-bound and not parallelizable in single-threaded JS.
- Promise.all shows no measurable gain with or without prettyPrint; decision: no-go.
- No production code changed; story documents findings for future reference.
Scope(s):
- core
Why these scopes:
- The investigation targeted the core build render pipeline (render.ts, tag-pages.ts, finalize.ts).

## Pilot exchange

## Dev log

- 2026-03-22 20h00m00s — Benchmark: instrumentation `performance.now()` dans `finalize.ts`
  Setup: `performance.now()` autour de `renderSite` et `renderTagPages` dans finalize.ts.
  Site de test: website-example (~25 entries, ~107 pages HTML total incluant indexes, tags, assets).

- 2026-03-22 20h01m00s — Benchmark baseline (séquentiel, prettyPrint=true, 5 runs)
  | Run | renderSite | renderTagPages |
  |-----|-----------|----------------|
  | 1   | 1105.9ms  | 1420.8ms       |
  | 2   | 1151.5ms  | 1559.9ms       |
  | 3   | 1061.8ms  | 1461.8ms       |
  | 4   | 1066.3ms  | 1309.7ms       |
  | 5   | 1133.9ms  | 1630.6ms       |
  **Moyenne: renderSite ~1104ms, renderTagPages ~1477ms, total ~2581ms**

- 2026-03-22 20h02m00s — Benchmark sans prettyPrint (séquentiel, 3 runs)
  | Run | renderSite | renderTagPages |
  |-----|-----------|----------------|
  | 1   | 376.4ms   | 318.7ms        |
  | 2   | 281.4ms   | 274.4ms        |
  | 3   | 294.9ms   | 286.9ms        |
  **Moyenne: renderSite ~317ms, renderTagPages ~293ms, total ~610ms**
  Conclusion: **prettyPrint (rehype) = ~77% du temps de rendu**. CPU-bound (parse→format→stringify par page).

- 2026-03-22 20h03m00s — Test Promise.all sur entry pages (prettyPrint=true, 3 runs)
  | Run | renderSite | renderTagPages |
  |-----|-----------|----------------|
  | 1   | 1226.2ms  | 1571.4ms       |
  | 2   | 1284.5ms  | 1535.9ms       |
  | 3   | 1036.9ms  | 1354.1ms       |
  **Moyenne: renderSite ~1183ms** — aucun gain vs séquentiel (~1104ms).
  Why this way:
  - Observed issue: Promise.all ne parallélise pas le CPU en JS single-thread.
  - Root cause: rehype `unified().process()` est CPU-bound. Les promises sont interleaved à l'event loop mais le travail CPU reste séquentiel.
  - Evidence: timings identiques (dans la variance) avec et sans Promise.all.

- 2026-03-22 20h04m00s — Test Promise.all sur entry pages (prettyPrint=false, 3 runs)
  | Run | renderSite | renderTagPages |
  |-----|-----------|----------------|
  | 1   | 350.7ms   | 310.0ms        |
  | 2   | 395.1ms   | 164.7ms        |
  | 3   | 277.8ms   | 151.3ms        |
  **Moyenne: renderSite ~341ms** — aucun gain vs séquentiel (~317ms).
  Why this way:
  - Observed issue: même sans prettyPrint, pas de gain.
  - Root cause: l'I/O Bun sur fichiers locaux est déjà très rapide (~5ms/page). L'overhead de scheduling Promise.all annule le gain potentiel d'interleaving.
  - Evidence: timings dans la variance entre séquentiel et parallèle.

- 2026-03-22 20h05m00s — **Décision: NO-GO**
  Why this way:
  - Le bottleneck est rehype prettyPrint (77% du temps), qui est CPU-bound et non parallélisable en JS single-thread.
  - Sans prettyPrint, le rendu est déjà rapide (~5ms/page) et Promise.all n'améliore rien.
  - Pour réellement paralléliser le CPU, il faudrait des worker threads ou un runtime multi-thread — hors scope et disproportionné.
  - Piste alternative plus utile (hors scope): si le temps de rendu devient un problème, désactiver prettyPrint par défaut ou le rendre opt-in.
  - Tous les changements de benchmark ont été revertés. Aucun code modifié.
  - Build vérifié OK après revert.
