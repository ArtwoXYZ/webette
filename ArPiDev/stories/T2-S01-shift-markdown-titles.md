# T2-S01 — Shift Markdown headings

Created: 2026-02-08 19h15m00s
Closed: 2026-02-08 18h29m40s
Acceptance: User

Status: Done

## Context
Les sites peuvent avoir des contenus Markdown avec des niveaux de titres trop hauts (h1) pour la mise en page, et il faut un moyen simple de les decalier.

## Rationale
Offrir une option simple pour abaisser les niveaux de titres sans modifier les fichiers source.

## Goal
Ajouter une option de configuration qui decale les titres Markdown (h1→h2, h2→h3, etc.) lors du rendu.

## In scope
- Option de config au niveau du site (webette.config.ts) pour activer le decalage et definir l'offset.
- Application du decalage dans le pipeline Markdown.
- Comportement clair pour les niveaux limites (h6).

## Out of scope
- Changement de syntaxe Markdown.
- Refonte globale du rendu Markdown.
- Nouvel outil de transformation hors pipeline existant.

## Ready when
- Goal est un seul resultat clair
- In scope / Out of scope explicites
- Done when testable
- Acceptance owner defini
- Rationale presente

## Done when
- L'option est disponible dans la config du site et documentee.
- Les titres Markdown sont decales correctement avec l'offset defini.
- Aucun changement si l'option est desactivee.
- Validation manuelle sur un site d'exemple.
To document: `markdown.headingShift` (niveau site dans `webette.config.ts`) decale les niveaux de titres Markdown (h1->h2, h2->h3, etc.), clamp a h1..h6, accepte un nombre (ou string numerique), et 0/absent = aucun changement. S'applique au rendu Markdown (pas aux blocs texte).

## Blocker

## Remaining work

## Reopen when

## Dev log
- 2026-02-08 20h10m00s - Added site-level `markdown.headingShift` support via a remark plugin that shifts heading depth during Markdown resolution. - Why: allow title level offsets without editing source content. - Commands: none.
- 2026-02-08 21h40m00s - Ajout de `markdown.headingShift: 0` dans la config du site de documentation pour exposer l'option au niveau site. - Why: rendre la config explicite dans un fichier de site. - Commands: none.
- 2026-02-08 18h20m00s - Build du site d'exemple pour validation manuelle. - Why: verifier que l'option n'introduit pas de regression sur le rendu. - Commands: `bun run build website-example` (ok, avertissements non bloquants).
- 2026-02-08 18h24m08s - Correction du helper `remarkShiftHeadings` (attacher Unified) + validation manuelle du decalage (h1->h2) sur `Welcome to webette`, puis retour du config `headingShift` a 0. - Why: l'option etait chargee mais le plugin ne s'appliquait pas. - Commands: `bun run build website-example` (x2), `Get-ChildItem ... | Select-String "Welcome to webette"`.
