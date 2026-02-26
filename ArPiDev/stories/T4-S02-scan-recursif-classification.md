# T4-S02 — Scan récursif + classification des dossiers

Created: 2026-02-26 18h55m50s
Closed: 2026-02-26 19h12m58s
Acceptance: User

Status: Done, Validated

## Context
`T4-S01` a validé la direction d’architecture: passer d’un modèle principalement basé sur la profondeur à une classification récursive (`root` spécial, `collection` vs `entry` selon le contenu du dossier), tout en conservant un objectif de non-régression de rendu sur `website-example`.

Le risque principal est de casser le pipeline en ne modifiant que le scan: de nombreux modules consomment encore un modèle plat `site.collections[].entries`.

## Rationale
Cette story isole la base de la refonte (scan + classification) avant le travail de routing/index et de rendu, mais doit laisser un état de projet fonctionnel pour éviter un “big bang” risqué.

## Goal
Implémenter le scan récursif et la classification `collection`/`entry` (avec warnings définis), en introduisant la base du nouveau modèle sans casser le pipeline actuel, avec preuves via scan/export modèle et smoke checks.

## In scope
- Implémenter la logique de classification des dossiers selon le cadrage `T4-S01`:
  - `entry` = dossier qui contient des blocks;
  - `collection` = dossier avec sous-dossiers et sans blocks;
  - dossiers vides hors `entry` ignorés avec warning informatif non bloquant;
  - fichiers racine non utiles au système de base ignorés.
- Introduire une base de scan récursif côté `src/core/scan/index.ts` (raw scan + classification).
- Adapter le modèle interne / structures intermédiaires si nécessaire pour représenter l’arbre récursif.
- Préserver un contrat exploitable par le pipeline existant (compatibilité temporaire) afin que le projet reste fonctionnel après la story.
- Produire des preuves de classification via export modèle / logs de scan.
- Vérifier un smoke build sur `website-example` (sans exiger encore la validation HTML finale de non-régression, traitée plus tard).

## Out of scope
- Refonte complète du routing et de la génération d’index récursifs (`T4-S03`).
- Adaptation finale du rendu/templates/helpers/prev-next au nouveau modèle (`T4-S04`).
- Validation finale de non-régression HTML sur `website-example` (`T4-S05`).
- Changements de comportement produit non nécessaires à la base de classification.

## Execution brief
- Introduire un scan récursif qui classe les dossiers par contenu (`collection`/`entry`) au lieu de l’hypothèse “top-level collection -> child entry”.
- Conserver temporairement une projection/compatibilité vers les structures attendues par le pipeline existant (au minimum `site.collections[].entries`) pour éviter de casser `build`.
- Implémenter les warnings non bloquants pour dossiers vides hors `entry` et vérifier qu’ils restent informatifs (pas d’échec build/serve).
- Ignorer explicitement les fichiers racine non utiles au système de base sans les injecter dans le modèle de contenu.
- Ajouter/adapter le minimum de logs nécessaires pour diagnostiquer la nouvelle classification en `Dev log`.
- Vérifier la story avec `website-example` + (si nécessaire) un mini fixture local temporaire pour couvrir root entries / nested collections si `website-example` ne couvre pas assez ces cas.

## Checks to run
- `bun run src/cli.ts build website-example --export-model-only --skip-content` — valider scan + export modèle sans dépendre du rendu HTML complet.
- `bun run src/cli.ts build website-example --skip-content` — smoke check pipeline complet (scan -> routes -> render) après adaptation temporaire.
- `rg -n "scan\\.(collectionEmpty|entryEmpty|summary)|index\\.folder" website-example/_logs -g '*.jsonl'` (ou logs équivalents) — vérifier que les logs de scan restent lisibles et non bloquants.
- Relecture ciblée de `_public/_model/site.json` (ou export équivalent) — confirmer l’absence de régression évidente sur collections/entries existants.
- Si mini fixture temporaire utilisé: consigner la structure test + la commande de build/export dans le `Dev log`.

## Evidence expected
- Description claire du choix de compatibilité temporaire (comment la refonte du scan n’a pas cassé le pipeline actuel).
- Preuve que la classification récursive fonctionne sur au moins des cas représentatifs (y compris cas non couverts par `website-example` si fixture temporaire nécessaire).
- Logs montrant que les warnings “dossier vide hors entry” sont informatifs et non bloquants.
- Smoke build `website-example` réussi après la story.
- Liste explicite des limites laissées pour `T4-S03` / `T4-S04`.

## Files/areas likely involved
- `src/core/scan/index.ts`
- `src/core/model.ts` (si ajout de structure intermédiaire / arbre)
- `src/core/routes.ts` (uniquement si adaptation minimale nécessaire au contrat temporaire)
- `src/core/build.ts` (si logs/checkpoints de scan doivent être ajustés)
- Éventuellement `src/core/export/write-model.ts` (si preuve de classification nécessite adaptation mineure d’export)

## Constraints and traps
- Beaucoup de consommateurs supposent `site.collections[].entries`; casser ce contrat trop tôt provoquera des régressions en cascade hors scope.
- `website-example` est une référence de non-régression finale, mais peut ne pas couvrir tous les cas de classification (entries racine / collections imbriquées profondes).
- Le but de cette story n’est pas de “finir” le nouveau modèle côté rendu: documenter proprement ce qui reste pour `T4-S03` / `T4-S04`.
- Garder les changements incrémentaux et traçables dans `Dev log` (ce qui change, pourquoi, quelles preuves).

## Documentation impact
- To document later (T4-S05 / ArPiDoc): règles de classification `collection`/`entry` et warnings sur dossiers vides.
- To document later (T4-S05 / ArPiDoc): comportement d’ignore des fichiers racine non utiles au système de base.

## Ready when
- Le but est unique (scan récursif + classification avec compatibilité temporaire).
- Les frontières avec `T4-S03`, `T4-S04`, `T4-S05` sont explicites.
- Les checks incluent à la fois preuve scan/export et smoke build `website-example`.
- L’exigence “tout doit continuer à fonctionner” est prise en compte dans le contrat de story.

## Done when
- Le scan classe les dossiers selon les règles validées dans `T4-S01`.
- Les dossiers vides hors `entry` sont ignorés avec warning informatif non bloquant.
- Les fichiers racine non utiles au système de base sont ignorés.
- Le pipeline reste fonctionnel après la story (smoke build `website-example` réussi).
- Les preuves scan/export modèle + commandes/résultats sont consignés dans le `Dev log`.
- Les limites restantes pour `T4-S03` et `T4-S04` sont explicitement consignées.

## Pending reason
- 

## Remaining work
- 

## Resume condition
- 

## Commit proposal
Title: feat(collections): add recursive scan classification structure with flat derived projection
Description:
- Add a recursive folder classification scan (`entry` / `collection`) exported as `site.structure`, including ignored-folder reasons for empty and meta-only folders.
- Keep the existing flat `site.collections[].entries` scan/projection intact to preserve build compatibility during the T4 migration phase.
- Validate with `website-example` smoke builds and a dedicated fixture covering root entries, nested collections, and ignored folders.
Scope(s):
- collections
Why these scopes:
- The change introduces a new content-structure scanning/classification capability and derived flat collection projection behavior without changing templates/UI features yet.

## Pilot exchange
- 2026-02-26 18h55m50s — Pilot -> User — Story créée après validation de `T4-S01`. Stratégie choisie: introduire le scan récursif et la classification avec compatibilité temporaire pour garder le projet fonctionnel, puis traiter routing/index (`T4-S03`) et rendu/helpers (`T4-S04`).
- 2026-02-26 19h12m58s — User -> Pilot — Validation de `T4-S02`.

## Dev log
- 2026-02-26 18h55m50s — Kickoff Dev
  Why this way:
  - Observed issue: la refonte de scan touche un pipeline largement dépendant de `site.collections[].entries`.
  - Root cause: le modèle actuel est plat et consommé par `routes`, `render`, `navigation`, `targets`, `drafts`, `export`, etc.
  - Chosen fix: introduire d’abord un scan récursif de classification exporté dans le modèle (base de refonte), tout en conservant la projection actuelle pour garder `build` fonctionnel.
  - Tradeoff: double lecture partielle du filesystem pendant la phase de migration (scan récursif + scan historique) pour minimiser le risque.
  - Evidence: à produire via `website-example` (`--export-model-only`, smoke build) après implémentation.
  Commands/tests: pending
- 2026-02-26 19h07 CET — Change: ajout d’un scan récursif de classification exporté en `site.structure` (phase de migration)
  Why this way:
  - Observed issue: le scan actuel suppose `root -> collections top-level -> entries`, donc il ne peut pas représenter correctement entries racine et collections imbriquées.
  - Root cause: `src/core/scan/index.ts` est structuré autour de `listCollectionsRaw()` puis `listEntriesRaw()`; la classification est implicite par profondeur.
  - Chosen fix: ajouter un second parcours de scan (récursif) qui classe les dossiers hors entry par contenu (`entry` si blocks, `collection` si sous-dossiers sans blocks), et exporter ce résultat dans `site.structure`, tout en gardant la projection plate dérivée pour `site.collections`.
  - Tradeoff: coût de scan temporairement plus élevé et duplication partielle de logique jusqu’à la migration complète (`T4-S03`/`T4-S04`).
  - Evidence: `site.structure` est présent dans l’export de `website-example` et reflète l’arbre scanné.
  Commands/tests:
  - `bun run src/cli.ts build website-example --export-model-only --skip-content` (OK)
  - `rg -n '"structure"|\"kind\": \"root\"|\"ignoredFolders\"' website-example/_public/_model/site.json` (OK, `structure` présent)
- 2026-02-26 19h07 CET — Change: warnings non bloquants pour dossiers ignorés hors entry + preuve sur fixture
  Why this way:
  - Observed issue: `website-example` ne couvre pas explicitement les nouveaux cas (entry racine / collection imbriquée / dossier vide / dossier meta-only).
  - Root cause: la story demande une preuve de classification, mais le site de référence actuel ne suffit pas pour tous les cas de la nouvelle règle.
  - Chosen fix: créer un fixture temporaire local et vérifier l’export modèle (`site.structure`) + les warnings `scan.folderIgnored`.
  - Tradeoff: le fixture révèle volontairement une limite de la phase de migration (la projection plate dérivée `site.collections` reste plate et classe encore certains cas selon l’ancien modèle), laissée pour `T4-S03`/`T4-S04`.
  - Evidence:
    - `site.structure.children` contient une entry racine (`01 Home`).
    - `site.structure` contient une collection imbriquée (`02 Blog/03 Specials`) avec entry enfant.
    - `site.structure.ignoredFolders` contient `03 Empty` (`empty-folder`) et `04 MetaOnly` (`meta-only-folder`).
  Commands/tests:
  - `bun run src/cli.ts build /tmp/webette-t4-s02-fixture --export-model-only --skip-content` (OK)
  - `rg -n '"structure"|\"ignoredFolders\"|\"01 Home\"|\"03 Specials\"|\"03 Empty\"|\"04 MetaOnly\"|\"reason\": \"(empty-folder|meta-only-folder)\"' /tmp/webette-t4-s02-fixture/_public/_model/site.json` (OK)
- 2026-02-26 19h07 CET — Check: smoke build `website-example` conservé fonctionnel (compatibilité temporaire)
  Why this way:
  - Observed issue: le chantier impose que “tout fonctionne encore” pendant la refonte.
  - Root cause: le nouveau scan ne suffit pas, il faut prouver que le pipeline historique (`routes`/`render`) continue à tourner avec la projection existante.
  - Chosen fix: conserver le scan historique en parallèle et valider un smoke build `website-example`.
  - Tradeoff: la correction de la parité complète pour les nouveaux cas de structure est différée; seul `website-example` doit rester stable à ce stade.
  - Evidence: build `website-example` terminé avec succès après les changements de scan.
  Commands/tests:
  - `bun run src/cli.ts build website-example --skip-content` (OK, build terminé)
- 2026-02-26 19h07 CET — Remaining limits for next stories
  Why this way:
  - Observed issue: le fixture temporaire montre que la projection plate dérivée `site.collections` n’interprète pas encore les nouveaux cas selon la classification récursive.
  - Root cause: `listCollectionsRaw` / `listEntriesRaw` (historiques) restent actifs pour préserver la compatibilité du pipeline actuel.
  - Chosen fix: documenter explicitement la limite pour la suite du chantier plutôt que de la corriger hors scope.
  - Tradeoff: duplication temporaire (`site.structure` correct vs `site.collections` plat pendant la phase de migration).
  - Evidence: sur le fixture, `site.structure` classe correctement `01 Home` en entry racine et `03 Empty`/`04 MetaOnly` en dossiers ignorés, tandis que `collections` exporte encore des collections plates vides (`home`, `empty`, `metaonly`).
  Commands/tests:
  - `sed -n '1,320p' /tmp/webette-t4-s02-fixture/_public/_model/site.json` (OK)
- 2026-02-26 19h12 CET — Change: ajout de commentaires ciblés dans le scan récursif (retour utilisateur)
  Why this way:
  - Observed issue: le code de classification / phase de migration était lisible mais manquait de repères sur les règles et le choix de coexistence avec le scan historique.
  - Root cause: refonte implémentée rapidement avec priorité sur la compatibilité temporaire et les preuves de fonctionnement.
  - Chosen fix: ajouter des commentaires courts sur les points non évidents (classification par contenu, priorités de classement, export diagnostic des dossiers ignorés, coexistence temporaire avec le scan historique).
  - Tradeoff: légère augmentation du bruit visuel, limitée aux zones de logique de migration temporaire.
  - Evidence: commentaires ajoutés dans `src/core/scan/index.ts` sans changement de comportement.
  Commands/tests: non relancés (commentaires uniquement)
