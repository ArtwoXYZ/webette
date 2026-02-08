# T1-S03 — Helper menu/index par défaut

Created: 2026-02-06 16h28m24s
Closed: 2026-02-08 18h30m00s
Acceptance: User

Status: Done

## Context
Les templates par défaut n’exposent pas encore un helper menu/index clair et stable, ce qui complique la navigation et les exemples.

## Rationale
Standardiser l’API et fournir une implémentation par défaut pour améliorer l’expérience utilisateur et la cohérence des starters.

## Goal
Définir l’API du helper menu/index et l’implémenter dans les templates par défaut.

## In scope
- Extraire les liens prev/next en partial pour reutiliser le meme markup.
- Commencer par proposer la solution la plus simple et robuste (API + rendu) et la faire valider avant implementation.
- Définition de l’API (nom, paramètres, sorties attendues).
- Implémentation dans les templates par défaut du tool.
- Mise à jour des templates concernés si besoin pour démontrer l’usage.
- Échanges réguliers avec l’utilisateur pour co‑designer l’API et le rendu.

## Out of scope
- Refonte globale de navigation.
- Système d’index complet (T3).
- Changements de modèle de données.

## Ready when
- Goal est un seul résultat clair
- In scope / Out of scope explicites
- Done when testable
- Acceptance owner défini
- Rationale présente

## Done when
- Les liens prev/next utilisent un partial dans les templates par defaut, `website-example` et `webette-documentation`.
- Les menus de test sont supprimes; le menu du site d'exemple utilise la nouvelle API/helper avec le meme rendu et fonctionnement.
- L’API du helper menu/index est définie et documentée dans la story.
- Les templates par défaut utilisent le helper et rendent un menu/index fonctionnel.
- Aucun impact sur `build` hors rendu template.
- La proposition finale est validée par l’utilisateur.

## Documentation a ecrire (precise)
- Partial `prev-next`: usage `{{> prev-next}}` et maintien du rendu existant.
- API du helper `menu`: signature, option `includeUnlisted`, structure de sortie (`collections[]`, `entries[]`, `isCurrent`, `isActive`, `hasSingleEntry`, `singleEntry`, `current.*`).
- Exemples HBS: menu simple (collections), menu tree (collections + entries), menu "collection courante".
- Notes de migration: remplacer boucles `collections/entries` directes par `{{#menu}}...{{/menu}}` sans changer le rendu.
- Comportement sur pages index: `current` resolu depuis le contexte (root/collection index), pas d'entry active.
- Rappel: la logique filtre `unlisted` par defaut; utiliser `includeUnlisted=true` si besoin.
- Partial `navigation-items`: supporte maintenant les items du helper `menu` (collections/entries) en plus des items `navigation.webt` (kind/title/children).

## Blocker

## Remaining work

## Reopen when

## Dev log
- 2026-02-08 18h22m00s - Marked story as Done (Dev-side completion, pending acceptance). - Why: all Done-when items are satisfied. - Commands: none.
- 2026-02-08 18h10m00s - Updated `navigation-items` partials to render both `navigation.webt` items and `menu` helper structures for website-example and webette-documentation. - Why: keep a single partial compatible with both data shapes. - Commands: none.
- 2026-02-08 17h55m00s - Copied the `{{#menu}}` top-menu implementation to `webette-documentation` wrapper to match website-example behavior. - Why: keep doc site menu identical while using the new helper. - Commands: none.
- 2026-02-08 17h35m00s - Added a `prev-next` partial and replaced duplicated prev/next markup in default, website-example, and webette-documentation layouts. - Why: keep markup identical while reducing duplication. - Commands: none.
- 2026-02-08 17h12m00s — Removed menu test variants and switched the website-example menu to `{{#menu}}` while preserving markup/behavior. — Why: meet the story requirement for a simple, robust API without changing UI/UX. — Commands: none.
- 2026-02-08 16h45m00s — Defined a minimal data-first helper `menu` (collections + entries + current state) and wired it into default templates + website-example menu variants. — Why: keep the API small and robust while enabling multiple menu renderings without duplicating logic. — Commands: none.
- 2026-02-08 16h46m00s — API: `{{#menu}}...{{/menu}}` (optional `includeUnlisted=true`) yields `collections[]` with `entries[]`, `isCurrent`, `hasSingleEntry`, `singleEntry`; entries expose `isActive`; `current.collection` / `current.entry` resolved from page context. — Why: document the contract in the story for template authors. — Commands: none.
