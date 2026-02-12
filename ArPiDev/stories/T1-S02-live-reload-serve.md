# T1-S02 — Injecter le live reload automatiquement en serve

Created: 2026-02-06 16h14m28s
Closed: 2026-02-06 16h28m24s
Acceptance: User

Status: Done, Validated

## Context
En mode `serve`, le live reload doit fonctionner sans que l’utilisateur modifie ses templates.

## Rationale
Réduire la friction en dev local et éviter les erreurs de setup pour les non‑power users.

## Goal
Activer le live reload automatiquement en `serve`, sans action template.

## In scope
- Injection automatique du script live reload sur les pages servies.
- Comportement limité à `serve` (pas d’effet en `build`).
- Vérification que les pages se rechargent après modification de contenu.
- Retirer le helper live reload et ses références des templates de `website-example` et `webette-documentation`.

## Out of scope
- Nouveau système de template ou de plugins.
- UI dédiée au live reload.
- Modification du pipeline `build` hors `serve`.

## Ready when
- Goal est un seul résultat clair
- In scope / Out of scope explicites
- Done when testable
- Acceptance owner défini
- Rationale présente

## Done when
- En `serve`, les pages se rechargent automatiquement après un changement de contenu.
- Aucune action template requise.
- Le `build` reste inchangé (pas d’injection live reload).
- Le helper live reload est retiré des templates de `website-example` et `webette-documentation`.

## Pending reason
- None (story completed and validated).

## Remaining work
- None.

## Resume condition
- Not applicable.

## Pilot exchange
- 2026-02-12 16h27m58s — Pilot -> Dev — Administrative migration: required story fields were backfilled to match the current ArPiDev schema.

## Dev log
- 2026-02-06 16h22m55s — Injection auto du live reload en `serve` via `formatHtml` (insertion avant `</body>` si absent) et suppression des références `{{{liveReloadScript}}}` dans les templates de `website-example` et `webette-documentation`. — Pourquoi: live reload sans action template et éviter les doubles injections. — Commandes: aucune.
- 2026-02-06 16h26m09s — Tests manuels ok (serve + reload validé par l’utilisateur). — Pourquoi: valider le comportement en conditions réelles. — Commandes: aucune.
