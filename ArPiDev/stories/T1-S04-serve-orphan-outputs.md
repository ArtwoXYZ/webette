# T1-S04 — Orphelins en serve

Created: 2026-02-08 18h35m00s
Closed: 2026-02-08 19h12m00s
Acceptance: User

Status: Done, Validated

## Context
En mode `serve`, des fichiers/entries supprimes peuvent laisser des sorties orphelines dans `_public`, ce qui cree un decalage avec `build`.

## Rationale
Garder une experience `serve` fiable et alignee sur le comportement de `build` pour eviter des pages obsoletes.

## Goal
Assurer que `serve` gere la suppression des sources et nettoie les outputs orphelins, avec parite `build`.

## In scope
- Detecter les suppressions (entries/blocks/assets) et nettoyer les sorties associees en `serve`.
- Reutiliser/aligner la logique de prune existante sans wipe complet.
- Logs explicites quand un nettoyage echoue.

## Out of scope
- Refonte du systeme d'index.
- Changement de modele de donnees.
- Optimisations de performance hors besoin immediat.

## Documentation impact
- To document: none

## Ready when
- Goal est un seul resultat clair
- In scope / Out of scope explicites
- Done when testable
- Acceptance owner defini
- Rationale presente

## Done when
- En `serve`, la suppression d'une entry ou d'un asset retire les sorties correspondantes.
- Aucun fichier orphelin ne reste dans `_public` apres delete/rename.
- Pas de regression sur `build` et pas de wipe complet en live.
- Validation manuelle sur un site d'exemple.

## Pending reason
- None (story completed and validated).

## Remaining work
- None.

## Resume condition
- Not applicable.

## Pilot exchange
- 2026-02-12 16h27m58s — Pilot -> Dev — Administrative migration: required story fields were backfilled to match the current ArPiDev schema.

## Dev log
- 2026-02-08 18h45m00s - In `serve`, when fs.watch provides no filename, still schedule a rebuild so deletes/renames trigger prune cleanup. - Why: avoid orphan outputs when delete events lack a filename. - Commands: none.
- 2026-02-08 19h10m00s - User validated deletes/renames in serve; no orphan outputs observed. - Why: confirms Done-when criteria. - Commands: user ran manual serve tests.
