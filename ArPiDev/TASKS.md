# TASKS

Active story: —

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
- [x] T5-S01 Plugin TOC (spec + plugin minimal + doc d'usage).
- [x] T5-S02 Chargement des plugins automatique dans le fichier de config en précisant seulement le dossier où les dossiers des plugins se trouvent
- [x] T5-S03 Faire en sorte que Webette passe proprement la configuration du site aux plugins via le contexte (webetteConfig = toute la config, siteConfig = section site, pluginConfig = section plugin, thisPluginConfig = config de ce plugin spécifiquement)
- [x] T5-S04 Tags pour entries (modèle + rendu/filtre minimal).
- [ ] T5-S04-b Tags cliquables + pages de tags statiques (config + génération build-time). Story: T5-S04-b-tags-pages-statiques.md [Ready, pas encore démarrée]
- [ ] T5-S05 Séparer clairement config tool vs config site (format + migration + doc).
- [ ] T5-S06 Option pour retirer les templates embarqués du tool (décision + plan de migration).

## T6 — Refacto pre-beta

> Workflow suggéré : après validation Dev de chaque story, lancer `/simplify` avant le commit pour détecter duplication résiduelle ou qualité manquée. À utiliser avec jugement (ne pas laisser `/simplify` élargir le scope au-delà de la story).

### Risques beta (priorité haute)
- [ ] T6-S01 Shared utils : centraliser parseBoolean/normalizeClass dupliqués dans postprocess markdown (markdown-links.ts + markdown-images.ts + navigation).
- [ ] T6-S02 HandlebarsContext typé : supprimer les `as any` dans helpers.ts et créer un type strict pour le contexte passé aux templates.
- [ ] T6-S03 Config env validation : centraliser la validation de webette.config.ts (schéma + erreurs explicites à la place des silences).
- [ ] T6-S04a Navigation resolver — parser : extraire la logique de lecture/interprétation du fichier navigation.webt (parseNavigationNameLine, parseItemLine, boucle stack-based…) vers navigation-parser.ts.
- [ ] T6-S04b Navigation resolver — builder/filters : extraire la logique de visibilité/inclusion et la construction des nœuds vers navigation-filters.ts + navigation-builder.ts ; navigation.ts ne garde que l'orchestration.

### Confort dev (priorité normale)
- [ ] T6-S05 Build orchestration : extraire les étapes de build() en fonctions nommées pour réduire la fonction de 620 lignes.
- [ ] T6-S06 Sorting : typer SortConfig strictement, dédupliquer findCustomSortingForCollection/Entry.
- [ ] T6-S07 Plugin loader : consolider les deux chemins de chargement (pluginsDir + pluginPaths), robustifier le parsing metadata du README.
- [ ] T6-S08 Nommage : audit et harmonisation des verbes (normalizeXyz, resolve vs create) + dédupliquer splitRouteSegments.

### Structure repo (avant beta publique)
- [ ] T6-S09 Cadrage monorepo (Pilot) : décider la structure cible (engine / app / website / releases), plan de migration, contraintes Bun workspaces, stratégie releases pour Tangled. [PILOT ONLY]
- [ ] T6-S10 Migration monorepo : exécuter la restructuration selon le plan T6-S09 (déplacer engine, configurer workspaces Bun, vérifier imports/build/CI).

## T7 — Webette UI (beta)

> Note : explorer ElectroBun comme base pour l'app desktop avant de démarrer cette tâche.

- [ ] T7-S01 POC serveur + build + logs (API locale minimale).
- [ ] T7-S02 Alpha: build/serve/stop + gestion process + status.
- [ ] T7-S03 UI minimale (boutons + logs + lien local).
- [ ] T7-S04 Packaging/exécutable multi‑OS (alpha).
- [ ] T7-S05 Éditeur de config + persistance (beta).

## T8 — Starters & hub

> Note : prévoir la stratégie de distribution pour Tangled (pas de GitHub Releases) — dossier `releases/` dans le monorepo ou repo dédié à décider en T6-S09.

- [ ] T8-S01 Starter blog pour la beta (structure + assets + README).
- [ ] T8-S02 Format de distribution starters (zip + métadonnées).
- [ ] T8-S03 Site `hub.webette.org` listant starters/plugins.

## T9 — Documentation & démo
- [ ] T9-S01 Terminer le site de doc “EN COURS” (Concept + Features core).
- [ ] T9-S02 Corriger les liens du site de démo une fois la doc en ligne.

## Pending stories
- T2-S06 — Reason: integration should be a plugin; deferred until plugin path is ready — Remaining: define plugin scope/mapping and implement opt-in behavior — Owner: User/Pilot — Resume condition: plugin system is available or a dedicated plugin story is scheduled.
