# T2-S03 — Sort by dates

Created: 2026-02-08 23h10m40s
Closed: 2026-02-09 00h14m34s
Acceptance: User

Status: Done

## Context
Le tri actuel est basé sur le nom/ordre numerique, mais certains sites veulent un tri par dates (creation/maj).

## Rationale
Permettre un tri par dates reutilise la nouvelle config `sorting` et repond a un besoin courant.

## Goal
Ajouter le tri par dates via `sorting.type = "created"` ou `sorting.type = "updated"` aux niveaux global/collections/entries/blocks.

## In scope
- Support de `type: "created"` et `type: "updated"` dans `sorting` pour collections, entries et blocks.
- Pas d'alias `date`.
- Fallback clair si la date est absente (a confirmer).
- Validation manuelle sur un site d'exemple.

## Out of scope
- Tri manuel explicite par liste.
- Nouveaux champs de dates dans le modele.
- Changement du format de dates existantes.

## Ready when
- Goal est un seul resultat clair
- In scope / Out of scope explicites
- Done when testable
- Acceptance owner defini
- Rationale presente
- Le Dev a presente un plan explicite dans le chat et obtenu validation avant de coder.

## Done when
- `sorting.type = "created"` et `sorting.type = "updated"` fonctionnent pour collections/entries/blocks.
- Le tri par dates respecte `order` asc/desc.
- Les cas sans date sont traites de facon deterministe (fin de liste).
- Validation manuelle sur un site d'exemple.

To document:
- Emplacement: `sorting` se configure dans `webette.config.ts` (config site), pas au niveau tool.
- Pipeline: le tri fonctionnel est applique **apres** `applyHistory` via `applySorting` dans `src/core/build/sorting.ts` (appele depuis `src/core/build.ts`).
- Scan: le scan ne fait qu’un tri deterministe par nom (prefix numerique + nom) dans `src/core/scan/index.ts` pour stabiliser le modele; il n’applique pas la config `sorting`.
- Types: `sorting.type` accepte `name`, `created`, `updated` (pas d’alias `date`). Si type inconnu -> warning `scan.sortingUnknownType` + fallback `name`.
- Order: `sorting.order` accepte `asc` ou `desc`.
- Priorite: `entries.custom` / `blocks.custom` -> `entries`/`blocks` -> global; `collections.*` ne s’applique qu’aux collections.
- Overrides:
  - `entries.custom`: `{ collection, type?, order? }` (collection = cle de config, sinon slug derive du nom de dossier).
  - `blocks.custom`: `{ collection, entry?, type?, order? }` (entry = slug derive du nom d’entree; si absent -> toutes les entries de la collection).
- Comparaison:
  - `name`: ordre = `orderKey` (prefix numerique) puis `localeCompare` insensible.
  - `created`/`updated`: utilise `createdAt`/`updatedAt` (dates calculees par le pipeline). Dates manquantes -> fin de liste. Egalites -> fallback sur tri par nom.
- Perimetre: s’applique aux collections, entries, blocks et assets (assets traites comme blocks).

## Blocker

## Remaining work

## Reopen when

## Dev log
- 2026-02-08 23h39m31s - Ajout du tri par dates (created/updated) via un passe de tri apres history + support config dans build. - Why: permettre le tri par dates reelles (createdAt/updatedAt) apres calcul historique. - Commands: `bun run build website-example`, verif ordre via `ConvertFrom-Json`.
- 2026-02-08 23h56m56s - Suppression du tri config (order/type) durant le scan; tri fonctionnel centralise apres history dans `build/sorting`. - Why: eviter le doublon et rendre le tri independant du scan/historique. - Commands: none.
- 2026-02-08 23h59m58s - Validation build apres de-dup du tri (scan vs build). - Why: verifier que le pipeline reste stable apres centralisation du tri. - Commands: `bun run build website-example`.
- 2026-02-09 00h03m43s - Validations multiples avec changement de `sorting` (created asc/desc, updated desc + overrides entries/blocks) et controle de l'ordre dans `_public/_model`. - Why: prouver que le tri date + overrides s'applique bien aux collections/entries/blocks. - Commands: `bun run build website-example` (x3), `ConvertFrom-Json` sur `site.json`/entries.
