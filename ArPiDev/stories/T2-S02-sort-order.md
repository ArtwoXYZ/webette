# T2-S02 — Sort order asc/desc

Created: 2026-02-08 18h29m55s
Closed: 2026-02-08 23h10m16s
Acceptance: User

Status: Done, Validated

## Context
L'ordre des collections/entries/blocks est implicite et ne peut pas etre ajuste facilement sans renommer les dossiers ou reordonner les fichiers.

## Rationale
Une config de tri granulaire (global + overrides) permet d'adapter l'ordre sans toucher a la structure des fichiers.

## Goal
Ajouter une option de configuration de tri (granulaire) pour collections, entries et blocks, avec priorite du plus specifique au plus global.

## In scope
- Option de config au niveau du site (webette.config.ts) nommee `sorting`.
- Schema de config avec niveaux: global -> collections (collections seulement) -> entries/blocks + overrides par collection.
- Application du tri **par nom** (seul type implemente ici) aux collections, entries et blocks.
- Fallback sur `name` + warning log si un type non supporte est fourni (ex: `date`).
- Priorite: overrides entries/blocks par collection -> entries/blocks global -> global. `collections.*` ne s'applique qu'aux collections.
- Comportement par defaut inchange si l'option est absente.

## Out of scope
- Tri par dates (story suivante).
- Tri manuel par liste explicite.

## Documentation impact
- To document: Ajouter une section "sorting" (config site) avec schema complet + exemples (global, collections, entries.custom, blocks.custom avec entry). Preciser que:
  - `sorting` est lu au niveau site (`webette.config.ts`), pas tool.
  - `type` supporte **seulement** `name` pour T2-S02; si `date`/inconnu -> warning `scan.sortingUnknownType` + fallback `name`.
  - `order` = `asc`/`desc` inverse l'ordre; par defaut = asc.
  - Priorite: entries.custom / blocks.custom -> entries/blocks -> global; `collections.*` ne s'applique qu'aux collections.
  - `collection` = cle de collection (config), sinon fallback sur slug derive du nom de dossier.
  - `entry` (blocks.custom) = slug d'entree (derive du nom de dossier); si present, l'override ne touche que cette entree.
  - L'ordre est base sur le meme tri que l'existant: prefix numerique + nom (localeCompare, insensitive).

## Ready when
- Goal est un seul resultat clair
- In scope / Out of scope explicites
- Done when testable
- Acceptance owner defini
- Rationale presente

## Done when
- L'option `sorting` est disponible dans la config du site et documentee.
- Le tri des collections, entries et blocks respecte asc/desc (par nom).
- Les overrides par collection pour entries/blocks fonctionnent.
- Si un type non supporte est fourni, un warning est loggue et le tri retombe sur `name`.
- Aucun changement si l'option est absente.
- Validation manuelle sur un site d'exemple.

## Sorting schema (documente)
```ts
sorting: {
  type: "name" | "date", // global default (date non implemente dans T2-S02)
  order: "asc" | "desc",
  collections: {
    type?: "name" | "date",
    order?: "asc" | "desc"
  },
  entries: {
    type?: "name" | "date",
    order?: "asc" | "desc",
    custom?: [
      { collection: "posts", type?: "name" | "date", order?: "asc" | "desc" }
    ]
  },
  blocks: {
    type?: "name" | "date",
    order?: "asc" | "desc",
    custom?: [
      { collection: "posts", entry?: "introduction", type?: "name" | "date", order?: "asc" | "desc" }
    ]
  }
}
```
- `collection` = cle de collection definie dans `webette.config.ts`; si la collection n'est pas definie, fallback sur le slug derive du nom de dossier (ex: "01 Playground" -> "playground").
- `entry` (blocks.custom) = slug de l'entree (derive du nom de dossier, ex: "01 Introduction" -> "introduction"). Si present, l'override ne s'applique qu'aux blocks de cette entree.
- Priorite (du plus specifique au plus global) : entries.custom / blocks.custom -> entries/blocks -> global. `collections.*` ne s'applique qu'aux collections.
- Si `type` = `date` (ou inconnu) dans cette story : warning log + fallback sur `name`.
- Si `sorting` est absent : ordre actuel conserve (aucun changement).
- `order` applique l'inversion asc/desc sur le type effectif resolu.

## Pending reason
- None (story completed and validated).

## Remaining work
- None.

## Resume condition
- Not applicable.

## Pilot exchange
- 2026-02-12 16h27m58s — Pilot -> Dev — Administrative migration: required story fields were backfilled to match the current ArPiDev schema.

## Dev log
- 2026-02-08 19h14m20s - Ajout du support `sorting` (config site) + tri collections/entries/blocks avec overrides et warnings sur type inconnu; ajout config exemple. - Why: permettre un ordre asc/desc granulaire sans changer les fichiers. - Commands: `bun run build website-example`, `ConvertFrom-Json` pour verifier l'ordre.
- 2026-02-08 19h21m28s - Fix: `sorting.collections.*` n'affecte plus entries/blocks (collections seulement). - Why: respecter la priorite demandee (entries/blocks ne doivent pas heriter de collections). - Commands: none.
- 2026-02-08 19h22m26s - Validation scenario: `sorting.collections.order = desc` applique uniquement aux collections, entries restent en asc. - Why: confirmer le comportement demande. - Commands: `bun run build website-example`, `ConvertFrom-Json` pour verifier l'ordre.
- 2026-02-08 19h28m21s - Fix: `entries/blocks.custom.collection` accepte aussi les collections non declarees via fallback sur le slug du dossier. - Why: permettre les overrides sur des collections non explicites dans la config. - Commands: none.
- 2026-02-08 19h29m04s - Validation scenario: `entries.custom` sur collection non declaree (playground) applique un ordre desc uniquement sur ses entries. - Why: confirmer le fallback slug. - Commands: `bun run build website-example`, `ConvertFrom-Json` pour verifier l'ordre.
- 2026-02-08 19h35m52s - Support `blocks.custom.entry` (override a l'echelle d'une entree) + validation sur playground/introduction. - Why: permettre un tri des blocks par entree. - Commands: `bun run build website-example`, `ConvertFrom-Json` pour verifier l'ordre.
