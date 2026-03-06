# TASKS

Active story:

## T1 — Stabiliser l’existant (build/serve)
- [x] T1-S01 Fix EBUSY en `serve` Windows lors du nettoyage de `_public` (suppression fiable).
- [x] T1-S02 Injecter le live reload automatiquement en `serve` (sans action template).
- [x] T1-S03 Helper menu/index: définir l’API + implémenter dans templates par défaut.
- [x] T1-S04 Gestion des fichiers supprimés/outputs orphelins en mode `serve` (parité avec build).

## T2 — Petits gains rapides
- [x] T2-S01 Option pour décaler les titres Markdown (h1→h2, etc.).
- [x] T2-S02 Option de tri asc/desc des entries/collections.
- [x] T2-S03 Option de tri par dates (création/maj).
- [x] T2-S04 Generer les favicons/icones (config + build + templates par defaut).
- [x] T2-S05 Ajouter les headers sociaux (config + templates par defaut).
- [ ] T2-S06 Integrer Standard.site (Lexicon ATproto) : decision + POC d'integration. [PENDING]

## T3 — Navigation & index refonte
- [x] T3-S01 Nouveau système d’index (dossiers “Root Index” / “Collection Index”) en conservant les overrides de layout existants (peut remplacer les overrides de contenu, pas les layouts).
- [x] T3-S02 Unifier navigation.webt + helper menu/index (auto list + exclusions + classes).
- [x] T3-S03 Clarifier la config d’index personnalisés (root/collection) et documenter.
- [x] T3-S04 Blocs cross-entry (référencer vidéo/image/asset d’une autre entrée).

## T4 — Refonte du modèle arborescent (collections/entries récursifs)
- [x] T4-S01 Cadrer la refonte (PAS POUR DEV, tâche pour Pilot/Archi): règles de classification, invariants, warnings, objectif de non-régression de rendu (`website-example`) et découpage des stories d’exécution.
- [x] T4-S02 Scanner récursif + classification des dossiers (entries racine, collections imbriquées, dossiers vides ignorés avec warning) avec preuves scan/export modèle.
- [x] T4-S03 Routing + génération d’index sur arbre récursif (parité fonctionnelle visée, routes/pages générées vérifiées sur `website-example`).
- [x] T4-S04 Rendu/templates/helpers (`menu` / `index`, layouts/index custom, prev/next) adaptés au nouveau modèle, sans changement de rendu attendu sur `website-example`.
- [x] T4-S05 Validation de non-régression sur `website-example` + documentation des règles/cas limites (rendu attendu identique malgré la refonte; sans objectif de compat rétro).
- [x] T4-S06 Finaliser le système interne récursif comme système de fonctionnement de Webette (supprimer la dépendance à la projection legacy interne, sans régression de rendu sur `website-example`).
- [x] T4-S07 Refactor du scan (découpage de `src/core/scan/index.ts`, clarification des responsabilités, sans changement de comportement).
- [x] T4-S08 Campagne de tests de confiance du nouveau système (checks techniques + tests manuels ciblés IA/user sur cas réels/edge cases).

## T5 — Plugins & configuration (beta)
- [x] T5-S01 Plugin TOC (spec + plugin minimal + doc d’usage).
- [x] T5-S02 Chargement des plugins automatique dans le fichier de config en précisant seulement le dossier où les dossiers des plugins se trouvent
- [ ] T5-S03 Faire en sorte que Webette passe proprement la configuration du site (y compris pluginConfig) aux plugins via le contexte
- [ ] T5-S02 Tags pour entries (modèle + rendu/filtre minimal).
- [ ] T5-S03 Séparer clairement config tool vs config site (format + migration + doc).
- [ ] T5-S04 Option pour retirer les templates embarqués du tool (décision + plan de migration).

## T6 — Webette UI (beta)
- [ ] T6-S01 POC serveur + build + logs (API locale minimale).
- [ ] T6-S02 Alpha: build/serve/stop + gestion process + status.
- [ ] T6-S03 UI minimale (boutons + logs + lien local).
- [ ] T6-S04 Packaging/exécutable multi‑OS (alpha).
- [ ] T6-S05 Éditeur de config + persistance (beta).

## T7 — Starters & hub
- [ ] T7-S01 Starter blog pour la beta (structure + assets + README).
- [ ] T7-S02 Format de distribution starters (zip + métadonnées).
- [ ] T7-S03 Site `hub.webette.org` listant starters/plugins.

## T8 — Documentation & démo
- [ ] T8-S01 Terminer le site de doc “EN COURS” (Concept + Features core).
- [ ] T8-S02 Corriger les liens du site de démo une fois la doc en ligne.

## Pending stories
- T2-S06 — Reason: integration should be a plugin; deferred until plugin path is ready — Remaining: define plugin scope/mapping and implement opt-in behavior — Owner: User/Pilot — Resume condition: plugin system is available or a dedicated plugin story is scheduled.
