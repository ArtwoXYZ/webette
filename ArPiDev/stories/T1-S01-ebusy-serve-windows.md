# Story: T1-S01 — Fix EBUSY en serve Windows (_public cleanup)

Status: Active  
Created: 2026-02-05  
Acceptance: User

## Context
En mode `serve` sous Windows, des erreurs EBUSY apparaissent lors de la suppression/cleanup de `_public`, bloquant ou ralentissant les rebuilds.

## Ready when
- Reproduced or reasoned fix path identified (filesystem semantics Windows/Bun).
- Suppression/cleanup de `_public` en `serve` ne déclenche plus d’EBUSY (tests manuels Windows ou simulation).
- Le watch/rebuild reste fonctionnel et non régressif sur macOS/Linux.
- Logs clairs en cas d’erreur restante (niveau warn) sans crash.

## Tasks
- Auditer la séquence de cleanup `_public` en `serve` (rm, prune, expected outputs).
- Adapter la stratégie pour Windows (retry/backoff ou rename-before-delete, verrouillage minimal).
- Vérifier que le debounce/rebuild ne lance pas de rm concurrent.
- Tester localement (ou via CI simulée) et documenter le changement dans les logs/messages.

## Done when
- Le run `serve` sur Windows ne produit plus d’EBUSY lors du nettoyage de `_public`.
- Aucun plantage, rebuilds successifs OK, comportement inchangé sur autres OS.
- Story annotée avec le résultat des tests et éventuels contournements restants.

## Dev log
- 2026-02-05 19h30m00s — Forcé `overwrite` en mode liveReload/serve à `replace-files` pour éviter les suppressions complètes de `_public` qui déclenchent EBUSY sous Windows; change limité à `src/core/build.ts`, pas d’impact sur `build` hors serve. Commandes: aucune (raisonnement statique, pas de Windows à disposition pour test).
- 2026-02-05 19h35m00s — Validation Windows encore nécessaire (pas de machine Windows disponible ici). Demande de test utilisateur à prévoir.
- 2026-02-05 19h38m00s — Ajout d’une action de suivi: prévoir une passe de test sur Windows (serve + rebuilds) dès qu’une machine Windows est dispo; sinon, reporter au prochain créneau Windows.
