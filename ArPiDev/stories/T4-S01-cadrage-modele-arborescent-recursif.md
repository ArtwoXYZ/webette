# T4-S01 — Cadrage modèle arborescent récursif (Pilot/Archi)

Created: 2026-02-26 18h17m14s
Closed: 2026-02-26 18h55m50s
Acceptance: User

Status: Done, Validated

## Context
Le modèle actuel repose principalement sur une lecture par profondeur (`root > collections de premier niveau > entries > blocks`). Une nouvelle direction produit a été décidée: rendre la structure Webette plus fidèle à la structure réelle du dossier, en autorisant des entries à la racine et des collections imbriquées.

## Rationale
Ce cadrage est nécessaire avant toute implémentation pour éviter un refactor diffus (scan, routes, index, helpers, templates) sans règles stables. L’ancienne idée `collection.webt` pour sous-collections (story dédiée) devient redondante avec cette approche et doit être remplacée par un chantier plus global.

## Goal
Produire un cadrage exécutable de la refonte du modèle arborescent récursif (règles de classification + invariants + warnings + découpage des stories d’implémentation), avec un objectif explicite de non-régression de rendu sur `website-example`, avant démarrage Dev.

## In scope
- Story de cadrage Pilot/Archi (pas une story d’implémentation Dev).
- Formaliser les règles minimales de classification des dossiers:
  - `root` = dossier racine du site (point de lancement `build` / `serve`).
  - `collection` = dossier qui contient des sous-dossiers et ne contient pas de blocks.
  - `entry` = dossier qui contient des blocks.
  - `folder block` = comportement déjà défini; un dossier situé à l’intérieur d’une entry.
- Formaliser les arbitrages déjà décidés:
  - dossiers vides hors entry: ignorés avec warning non bloquant;
  - compat rétro: pas un objectif (outil pas encore public);
  - fichiers racine non utiles au système de base: ignorés (pas “vus” par Webette).
- Formaliser l’invariant de refonte: malgré le changement de modèle interne, `website-example` doit conserver le même rendu final attendu (non-régression visuelle/fonctionnelle cible).
- Identifier les impacts macro (scan/modèle, routing/index, rendu/helpers/templates).
- Mettre à jour `TASKS.md` avec un nouveau chantier `T4` dédié et suppression du scope devenu obsolète (`collection.webt` sous-collections comme story isolée).
- Préparer les stories d’implémentation suivantes (`T4-S02` à `T4-S05`) avec frontières claires dans `TASKS.md`.

## Out of scope
- Implémenter la refonte (scan, routes, rendu, templates).
- Modifier le code de production.
- Ajouter des règles avancées pour tous les cas edge markdown ou plugins.
- Réécrire `SPEC.md` sauf besoin explicite ultérieur.

## Files/areas likely involved
- `src/core/model.ts` — modèle `Site/Collection/Entry` actuellement centré sur `site.collections[]` (non récursif).
- `src/core/scan/index.ts` — scan actuel en passes séparées `listCollectionsRaw -> listEntriesRaw -> listBlocksRaw` avec hypothèse “collections = dossiers de premier niveau”.
- `src/core/routes.ts` — génération de routes basée sur `collection -> entries -> blocks`.
- `src/core/build/index-folders.ts` — extraction des index custom root/collection depuis `site.collections[].entries`.
- `src/core/build/render.ts` — rendu des pages et index via boucles sur `site.collections`.
- `src/core/build/prev-next.ts` — navigation prev/next “within same collection”.
- `src/core/templates/menu.ts` et `src/core/resolve/resolvers/navigation.ts` — navigation/helper `menu` et `navigation.webt` bâtis sur un arbre `collections -> entries`.
- `src/core/targets.ts` et `src/core/resolve/resolvers/reference.ts` — matching `collection/entry/block` et références cross-entry.
- `src/core/build/drafts.ts`, `src/core/build/prune.ts`, `src/core/export/write-model.ts` — multiples boucles et exports supposant un modèle plat par collection.
- `website-example/**` — référence de non-régression de rendu.

## Constraints and traps
- Le changement est “structurel” mais doit préserver le rendu `website-example`; le risque principal est une divergence de routes/index/navigation plutôt qu’un simple bug de scan.
- Le modèle actuel est largement consommé en lecture (`site.collections -> collection.entries`), donc une refonte du scan seule ne suffit pas.
- `prev/next` est défini “dans la collection”; il faudra préserver ce comportement (ou le formaliser autrement) pour garder la parité de rendu/navigation.
- Les indexes custom (`root` / `collection`) sont extraits à partir d’entries marquées `isIndex`; la refonte ne doit pas casser cette mécanique.
- Les helpers/templates (`menu`, `navigation.webt`) exposent une forme de données attendue par `website-example`; une migration interne du modèle ne doit pas forcer un changement de templates pour obtenir le même rendu.

## Working spec (classification + invariants, draft)
- `root` (cas spécial)
  - Le `root` est le dossier site passé à `build` / `serve`.
  - Le `root` n’est ni une `collection`, ni une `entry`.
  - Les fichiers racine non utiles au système de base sont ignorés (non pris en compte par Webette).
- Classification des dossiers (hors `root`)
  - `entry` = dossier qui contient des blocks.
  - `collection` = dossier qui contient des sous-dossiers et ne contient pas de blocks.
  - `folder block` = définition existante conservée; dossier situé à l’intérieur d’une `entry`.
- Invariant de disjonction
  - Un dossier ne peut pas être à la fois `collection` et `entry`.
  - La présence d’au moins un block dans un dossier le classe en `entry`.
  - Si ce dossier contient aussi des sous-dossiers, ces sous-dossiers sont traités comme `folder blocks` (car ils sont dans une `entry`).
- Dossiers vides
  - Un dossier vide hors `entry` est ignoré.
  - Webette émet un warning informatif non bloquant (sans échec du build/serve).
- Fichiers racine
  - Les fichiers racine non utilisés par le système de base sont ignorés.
  - Ils ne participent ni au modèle de contenu, ni au routing, ni au rendu.
- Compatibilité
  - Pas d’objectif de compat rétro externe (outil non public).
  - L’ancienne structure “collections de premier niveau -> entries” reste un cas valide du nouveau modèle.
- Non-régression de rendu (invariant de chantier)
  - `website-example` doit garder le même rendu final attendu malgré la refonte interne.
  - Parité visée: pages générées, routes publiques, index et navigation observables.
  - Le modèle exporté (`_model`) peut évoluer structurellement si nécessaire; la priorité de validation reste le rendu/site généré.

## Validation strategy (website-example, draft)
- Principe
  - La refonte est acceptée seulement si `website-example` garde le même comportement visible (rendu final attendu), même si le modèle interne change.
- Référence de comparaison (à produire au début des stories Dev)
  - Build de référence sur `website-example` avant changement (snapshot local de contrôle).
  - Build après changement sur le même dossier et avec les mêmes options.
- Ce qui doit rester stable (cible de comparaison)
  - Routes publiques générées (pages d’entries + indexes + `404.html`).
  - Présence des pages attendues et absence de régressions évidentes (pages manquantes / routes déplacées).
  - Rendu HTML observé des pages clés de `website-example` (au minimum root index, un index de collection, plusieurs entries représentatives).
  - Navigation visible (`menu` / `navigation.webt`) et liens prev/next sur pages d’entry existantes.
- Ce qui peut évoluer sans bloquer la refonte
  - Structure interne de `_model` exporté si nécessaire pour supporter le nouveau modèle récursif.
  - Logs internes de scan (tant que les warnings attendus restent non bloquants et compréhensibles).
- Stratégie par story Dev
  - `T4-S02` (scan/classification): vérifier d’abord par export modèle et logs de scan; ne pas viser encore la parité HTML complète.
  - `T4-S03` (routing/index): comparer routes/pages générées sur `website-example`.
  - `T4-S04` (rendu/helpers): comparer sorties HTML/pages clés et navigation visible.
  - `T4-S05` (validation finale): exécuter la comparaison de non-régression de bout en bout et documenter les écarts éventuels (ou confirmer parité).
- Preuves attendues dans les stories Dev
  - Commandes exactes exécutées.
  - Résumé des comparaisons (routes/pages HTML/navigation).
  - Liste des écarts observés + décision (bug à corriger vs changement acceptable).

## Remaining ambiguities / assumptions (current)
- Dossiers contenant uniquement des fichiers méta Webette (`name.webt`, `description.webt`, `unlisted.webt`, etc.) et des sous-dossiers: hypothèse actuelle = `collection` (car pas de blocks).
- Dossiers contenant uniquement des fichiers méta Webette et aucun sous-dossier: hypothèse actuelle = ignorés avec warning informatif non bloquant (même logique que dossier vide du point de vue contenu).
- Le comportement prev/next reste “dans la collection logique courante” (pas de changement produit visé pendant la refonte).

## Execution brief
- Recon ciblée des zones de code impactées (scan/modèle/routing/index/helpers/templates) pour éviter un découpage “à l’aveugle”.
- Rédiger la spec minimale de classification et les invariants opérationnels de la refonte.
- Rendre explicite la stratégie de validation de non-régression sur `website-example` (à porter par les stories Dev `T4-S02` à `T4-S05`).
- Lister explicitement les ambiguïtés restantes (si présentes) et proposer l’arbitrage dans la story.
- Mettre à jour `TASKS.md` (nouveau `T4`, renumérotation des tâches suivantes, suppression du doublon conceptuel).
- Renuméroter la story plugin TOC en `T5-S01` pour conserver la cohérence du plan.
- Ancrer le découpage Dev sur les dépendances réelles observées (scan seul insuffisant; impacts routing/render/navigation/export).

## Checks to run
- `rg -n "^## T[4-8] —|T4-S0|T5-S0" ArPiDev/TASKS.md` — vérifier la cohérence du replan et des IDs.
- `ls -1 ArPiDev/stories | rg "^(T4-S01|T5-S01)-"` — vérifier la présence des stories attendues après renumérotation.
- `rg -n "site\\.collections\\?\\? \\[\\]|for \\(const collection of site\\.collections" src/core src/plugins` — repérer les consommateurs du modèle plat à couvrir dans le découpage.
- `rg -n "listCollectionsRaw|listEntriesRaw|listBlocksRaw|scanSite" src/core/scan/index.ts` — vérifier l’hypothèse de scan actuel (collections top-level -> entries -> blocks).
- Relecture manuelle de la story `T4-S01` — vérifier que règles, arbitrages et out-of-scope sont explicites.

## Evidence expected
- `TASKS.md` montre le nouveau chantier `T4` (refonte arborescente) avant plugin TOC.
- La story TOC existe en `T5-S01` et reste intacte sur le fond (hors renumérotation).
- La story `T4-S01` décrit clairement les règles de classification et les arbitrages déjà validés par l’utilisateur.
- La story `T4-S01` décrit explicitement l’objectif de non-régression de rendu sur `website-example`.
- La story `T4-S01` documente les zones de code impactées et les pièges de non-régression (routing/index/navigation/templates).
- La story `T4-S01` contient une stratégie de validation par étapes (`T4-S02` à `T4-S05`) pour `website-example`.
- Aucun code produit n’est modifié.

## Done when
- La story `T4-S01` de cadrage (Pilot/Archi) est rédigée et prête à validation utilisateur.
- `TASKS.md` reflète le nouveau macro-plan (`T4` refonte arborescente, décalage des tâches suivantes, suppression de l’ancienne story `collection.webt`).
- La story plugin TOC est renumérotée en `T5-S01`.
- Les frontières des stories d’implémentation `T4-S02` à `T4-S05` sont lisibles dans `TASKS.md`.
- Les arbitrages explicitement décidés par l’utilisateur (warnings dossiers vides, ignore root non utile, pas de compat rétro) sont consignés.
- L’objectif de non-régression de rendu sur `website-example` est consigné comme invariant de chantier.
- Les dépendances de la refonte (scan + consommateurs du modèle plat) sont identifiées à un niveau suffisant pour lancer les stories Dev sans guesswork.
- Les hypothèses restantes (métadonnées-only folders, prev/next) sont explicites et non bloquantes.

## Pending reason
- 

## Remaining work
- 

## Resume condition
- 

## Commit proposal
Title: chore(docs): replan T4 around recursive content-tree refactor
Description:
- Reorganize `TASKS.md` to introduce a dedicated T4 refactor track for recursive collections/entries and move plugin TOC to `T5-S01`.
- Capture the new architecture direction and `website-example` non-regression target in `DECISIONS.md`.
- Add and validate Pilot/Archi story `T4-S01` with classification rules, invariants, risks, and phased validation strategy.
Scope(s):
- docs
Why these scopes:
- This story changes planning/process artefacts (`ArPiDev/*`) and architecture decisions documentation, without modifying production code.

## Pilot exchange
- 2026-02-26 18h17m14s — Pilot -> User — Story créée pour cadrer la refonte du modèle arborescent avant tout travail Dev; plugin TOC décalé après ce chantier.
- 2026-02-26 18h17m14s — User -> Pilot — Exigence ajoutée: malgré la refonte, `website-example` est censé garder le même rendu; à intégrer dans `TASKS` et dans le cadrage de story.
- 2026-02-26 18h17m14s — Pilot -> User — Recon code effectuée: le modèle actuel est plat (`site.collections[].entries`) et de nombreux modules en dépendent (`scan`, `routes`, `render`, `menu/navigation`, `targets/reference`, `drafts/prune/export`). Le découpage `T4-S02..S05` est maintenu avec parité de rendu `website-example` comme invariant.
- 2026-02-26 18h17m14s — Pilot -> User — Ajout d’une stratégie de validation de non-régression `website-example` par étape (scan/export -> routes/index -> rendu/navigation -> validation finale) et clarification des hypothèses restantes non bloquantes.
- 2026-02-26 18h55m50s — User -> Pilot — Validation du cadrage `T4-S01`, y compris les hypothèses restantes.

## Dev log
- (non applicable pour cette story Pilot/Archi; implémentation prévue dans `T4-S02+`)
