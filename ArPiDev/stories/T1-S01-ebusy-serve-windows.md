# T1-S01 — Fix EBUSY en serve Windows (_public cleanup)

Created: 2026-02-05 00h00m00s
Closed: 2026-02-06 16h14m28s
Acceptance: User

Status: Done, Validated

## Context
En mode `serve` sous Windows, des erreurs EBUSY apparaissaient lors de la suppression/cleanup de `_public`, bloquant ou ralentissant les rebuilds.

## Rationale
Sécuriser le nettoyage en mode `serve` était prioritaire pour éviter des blocages locaux et restaurer une boucle de dev fiable sur Windows.

## Goal
Supprimer les erreurs EBUSY en `serve` pendant le nettoyage de `_public` sans régression sur les autres OS.

## In scope
- Auditer la séquence de cleanup `_public` en `serve` (`rm`, prune, expected outputs).
- Adapter la stratégie pour Windows (retry/backoff ou `replace-files` en live).
- Vérifier que le debounce/rebuild ne lance pas de suppression concurrente.
- Tester localement et documenter le résultat.

## Out of scope
- Refonte complète de la stratégie de suppression du mode `build`.
- Changement du modèle de contenu ou des templates.
- Optimisations non liées au problème EBUSY.

## Ready when
- Reproduced or reasoned fix path identified (filesystem semantics Windows/Bun).
- Suppression/cleanup de `_public` en `serve` ne déclenche plus d’EBUSY (tests manuels Windows ou simulation).
- Le watch/rebuild reste fonctionnel et non régressif sur macOS/Linux.
- Logs clairs en cas d’erreur restante (niveau warn) sans crash.

## Done when
- Le run `serve` sur Windows ne produit plus d’EBUSY lors du nettoyage de `_public`.
- Aucun plantage, rebuilds successifs OK, comportement inchangé sur autres OS.
- Story annotée avec le résultat des tests et éventuels contournements restants.

## Pending reason
- None (story completed and validated).

## Remaining work
- None.

## Resume condition
- Not applicable.

## Pilot exchange
- 2026-02-12 16h27m58s — Pilot -> Dev — Administrative migration: required story fields were backfilled to match the current ArPiDev schema.

## Dev log
- 2026-02-05 19h30m00s — Forcé `overwrite` en mode liveReload/serve à `replace-files` pour éviter les suppressions complètes de `_public` qui déclenchent EBUSY sous Windows; change limité à `src/core/build.ts`, pas d’impact sur `build` hors serve. Commandes: aucune (raisonnement statique, pas de Windows à disposition pour test).
- 2026-02-05 19h35m00s — Validation Windows encore nécessaire (pas de machine Windows disponible ici). Demande de test utilisateur à prévoir.
- 2026-02-05 19h38m00s — Ajout d’une action de suivi: prévoir une passe de test sur Windows (serve + rebuilds) dès qu’une machine Windows est dispo; sinon, reporter au prochain créneau Windows.
- 2026-02-06 10h45m00s — Ajout d’un `rmWithRetries` (backoff sur EBUSY/EPERM/ENOTEMPTY), utilisé pour cleanup `_public`/assets et prune avec warn en cas d’échec; en liveReload, on logue sans crasher. Commandes: aucune (raisonnement statique).
- 2026-02-06 15h16m01s — Build local `website-example` OK, prune exécuté sans EBUSY; warnings attendus (ignore.webt + lien interne non résolu). Commandes: `bun run build "C:\\Users\\Artwo\\Documents\\Bun Websites\\webette\\website-example"`.
- 2026-02-06 15h21m02s — Test `serve` sur `website-example copy` avec 2 modifications déclenchant des rebuilds OK, aucun EBUSY observé; logs attendus (ignore.webt). Commandes: `bun run serve "C:\\Users\\Artwo\\Documents\\Bun Websites\\webette\\website-example copy"`.
- 2026-02-06 15h34m19s — Renommage bloqué (Access denied) sur `website-example copy`; attente reboot Zed + confirmation utilisateur du renommage avant toute nouvelle action. Commandes: `Rename-Item -Path "C:\\Users\\Artwo\\Documents\\Bun Websites\\webette\\website-example copy" -NewName "website-example-test"`.
- 2026-02-06 15h48m11s - Revue du fix: `serve` force `overwrite=replace-files` et `rmWithRetries` couvre EBUSY/EPERM/ENOTEMPTY pour cleanup/prune; evite les suppressions completes en live. - Pourquoi: reduire les EBUSY Windows tout en gardant le prune des orphelins. - Commandes: aucune.
- 2026-02-06 16h05m44s — Note: Pilot à consigner la règle “ne pas lancer `serve` sans demande explicite” dans `DECISIONS.md`. — Pourquoi: éviter les verrous/renames en local. — Commandes: aucune.
- 2026-02-06 16h12m21s — Story marquée Done après acceptation utilisateur. — Pourquoi: critères “Done when” validés par l’utilisateur. — Commandes: aucune.
