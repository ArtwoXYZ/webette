# TASKS

- [ ] T2-S04 Generer les favicons/icones (config + build + templates par defaut).
- [ ] T2-S05 Ajouter les headers sociaux (config + templates par defaut).

## T1 — Stabiliser l’existant (build/serve)
- [x] T1-S01 Fix EBUSY en `serve` Windows lors du nettoyage de `_public` (suppression fiable).
- [x] T1-S02 Injecter le live reload automatiquement en `serve` (sans action template).
- [x] T1-S03 Helper menu/index: définir l’API + implémenter dans templates par défaut.
- [x] T1-S04 Gestion des fichiers supprimés/outputs orphelins en mode `serve` (parité avec build).

## T2 — Petits gains rapides
- [x] T2-S01 Option pour décaler les titres Markdown (h1→h2, etc.).
- [x] T2-S02 Option de tri asc/desc des entries/collections.
- [x] T2-S03 Option de tri par dates (création/maj).
- [ ] T2-S04 Generer les favicons/icones (config + build + templates par defaut).
- [ ] T2-S05 Ajouter les headers sociaux (config + templates par defaut).
- [ ] T2-S06 Integrer Standard.site (Lexicon ATproto) : decision + POC d'integration.

## T3 — Navigation & index refonte
- [ ] T3-S01 Nouveau système d’index (dossiers “Root Index” / “Collection Index”) en conservant les overrides de layout existants (peut remplacer les overrides de contenu, pas les layouts).
- [ ] T3-S02 Unifier navigation.webt + helper menu/index (auto list + exclusions + classes).
- [ ] T3-S03 Clarifier la config d’index personnalisés (root/collection) et documenter.
- [ ] T3-S04 Blocs cross-entry (référencer vidéo/image/asset d’une autre entrée).

## T4 — Évolution structurelle (modèle & config)
- [ ] T4-S01 Plugin TOC (spec + plugin minimal + doc d’usage).
- [ ] T4-S02 Tags pour entries (modèle + rendu/filtre minimal).
- [ ] T4-S03 `collection.webt` pour sous‑collections/niveaux infinis (scan + routes + index).
- [ ] T4-S04 Séparer clairement config tool vs config site (format + migration + doc).
- [ ] T4-S05 Option pour retirer les templates embarqués du tool (décision + plan de migration).

## T5 — Webette UI (beta)
- [ ] T5-S01 POC serveur + build + logs (API locale minimale).
- [ ] T5-S02 Alpha: build/serve/stop + gestion process + status.
- [ ] T5-S03 UI minimale (boutons + logs + lien local).
- [ ] T5-S04 Packaging/exécutable multi‑OS (alpha).
- [ ] T5-S05 Éditeur de config + persistance (beta).

## T6 — Starters & hub
- [ ] T6-S01 Starter blog pour la beta (structure + assets + README).
- [ ] T6-S02 Format de distribution starters (zip + métadonnées).
- [ ] T6-S03 Site `hub.webette.org` listant starters/plugins.

## T7 — Documentation & démo
- [ ] T7-S01 Terminer le site de doc “EN COURS” (Concept + Features core).
- [ ] T7-S02 Corriger les liens du site de démo une fois la doc en ligne.
