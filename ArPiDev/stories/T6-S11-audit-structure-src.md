# T6-S11 — Audit structure src/

Created: 2026-03-22 20h15m00s
Closed: 2026-03-22 20h35m00s
Acceptance: User

Status: Done, Validated

## Goal

Rendre l'arborescence `src/` logique, lisible et explorable par un nouveau contributeur — en déplaçant/renommant/regroupant les fichiers là où c'est nécessaire, sans changement de comportement.

## In scope

- Fusionner `core/template.ts` dans `core/templates/engine.ts`
- Regrouper `core/config.ts` dans `config/site.ts`
- Aplatir `core/tags/` (1 fichier) vers `core/tag-filter.ts`
- Aplatir `core/transformations/` (1 fichier) vers `core/site-model-transformer.ts`
- Mise à jour de tous les imports impactés

## Out of scope

- Changer le comportement du build ou du rendu
- Réorganiser `core/build/utils/` (gardé à plat)
- Toucher à `core/postprocess/`, `types/`, `config/env.ts`

## Execution brief

1. Pour chaque déplacement : move fichier → grep + update imports → build → vérifier
2. Ordre : template → config → tags → transformations
3. Supprimer les dossiers vides après chaque déplacement

## Checks to run

- `bun run build website-example` — succès sans erreur après chaque étape
- Grep sur les anciens chemins d'import — aucun résultat résiduel

## Evidence expected

- Build OK après chaque déplacement
- Grep négatif sur les anciens chemins d'import
- Arborescence src/ finale

## Done when

- Les 4 déplacements sont faits
- Tous les imports sont à jour
- Le build passe
- Aucun ancien chemin d'import ne subsiste

## Commit proposal
Title: `refactor(core): audit and reorganize src/ directory structure`
Description:
- Move `core/template.ts` → `core/templates/engine.ts` to consolidate all template-related code in one directory.
- Move `core/config.ts` → `config/site.ts` to group tool-level and site-level config under `config/`.
- Flatten `core/tags/filter.ts` → `core/tag-filter.ts` (single-file directory removed).
- Flatten `core/transformations/site-model-transformer.ts` → `core/site-model-transformer.ts` (single-file directory removed).
- Update all imports across the codebase; no behavior change.
Scope(s):
- core
Why these scopes:
- All changes are internal reorganization of the core source tree structure.

## Pilot exchange

## Dev log

- 2026-03-22 20h20m00s — Move 1: `core/template.ts` → `core/templates/engine.ts`
  Why this way: regroupe engine + helpers + config + menu + social-head dans un seul dossier `templates/`.
  5 importeurs mis à jour + imports internes du fichier déplacé (logging, plugins passent de `../` à `../../`).
  Evidence: build OK, grep résiduel vide.

- 2026-03-22 20h23m00s — Move 2: `core/config.ts` → `config/site.ts`
  Why this way: regroupe config outil (`env.ts`) et config site (`site.ts`) dans `config/`.
  2 importeurs mis à jour + imports internes (model, sorting passent à `../core/`).
  Evidence: build OK, grep résiduel vide.

- 2026-03-22 20h24m00s — Move 3: `core/tags/filter.ts` → `core/tag-filter.ts`
  Why this way: dossier à 1 fichier — le nom du fichier suffit, pas besoin d'un dossier.
  4 importeurs mis à jour, dossier `core/tags/` supprimé.
  Evidence: build OK, grep résiduel vide.

- 2026-03-22 20h25m00s — Move 4: `core/transformations/site-model-transformer.ts` → `core/site-model-transformer.ts`
  Why this way: même logique — dossier à 1 fichier aplati.
  6 importeurs mis à jour, dossier `core/transformations/` supprimé.
  Evidence: build OK, grep résiduel vide.

- 2026-03-22 20h25m30s — Vérification finale
  Grep exhaustif sur les 4 anciens chemins d'import : 0 résultat résiduel.
  Arborescence src/ : 21 dossiers (vs 23 avant), structure propre et logique.
  Build website-example : ✅ succès.
