# T6-S01 — Shared utils : centraliser parseBoolean / normalizeClassList

Created: 2026-03-18
Closed: 2026-03-18
Acceptance: User

Status: Done, Validated

## Goal
Éliminer les trois copies locales de `parseBoolean` (et l'équivalent `normalizeClassValue` dans markdown-links) en les déplaçant dans un fichier utilitaire partagé neutre, puis en mettant à jour tous les importeurs.

## Context / recon
Duplications identifiées :

| Fonction | Fichier | Type |
|---|---|---|
| `parseBoolean(value: unknown)` | `src/core/navigation/utils.ts:18` | exportée |
| `parseBoolean(raw: string \| undefined)` | `src/core/postprocess/markdown-images.ts:47` | locale |
| `parseBoolean(raw: string \| undefined)` | `src/core/postprocess/markdown-links.ts:67` | closure locale dans `rewriteEntryBlocks` |
| `normalizeClassValue(value: unknown): string[]` | `src/core/postprocess/markdown-links.ts:53` | closure locale dans `rewriteEntryBlocks` |

La version canonique de `parseBoolean` dans `navigation/utils.ts` accepte `unknown` (plus générale). Les versions postprocess acceptent `string | undefined` et sont fonctionnellement identiques.

`normalizeClassValue` n'existe qu'à un seul endroit mais est candidate à partage (pattern utilitaire générique, pas de dépendance domaine).

Il existe déjà `src/utils/` (`naming.ts`, `fs.ts`, `path.ts`, `load-module.ts`) — c'est le bon emplacement neutre. `navigation/utils.ts` est trop ancré dans le domaine navigation pour être la home canonique des parsers génériques.

## In scope
- Créer `src/utils/parse.ts` avec `parseBoolean` et `normalizeClassList`
- Mettre à jour `navigation/utils.ts` : remplacer la définition locale par un import depuis `src/utils/parse.ts`
- Mettre à jour `markdown-images.ts` : supprimer la fonction locale, importer depuis `src/utils/parse.ts`
- Mettre à jour `markdown-links.ts` : supprimer les closures locales `parseBoolean` + `normalizeClassValue`, importer depuis `src/utils/parse.ts`
- Renommer `normalizeClassValue` → `normalizeClassList` dans `parse.ts` (nom plus explicite) ; adapter l'appel dans `markdown-links.ts`

## Out of scope
- Rétro-compatibilité : aucune (T6 est un refacto interne pre-beta, pas de public API à préserver)
- Tout autre refactoring dans ces fichiers
- Créer de nouvelles abstractions au-delà des deux fonctions ciblées
- Modifier les signatures publiques ou le comportement observable

## Execution brief
1. **Créer `src/utils/parse.ts`** avec :
   - `parseBoolean(value: unknown): boolean | undefined` — version `unknown` (canonique, sur-ensemble des deux signatures existantes)
   - `normalizeClassList(value: unknown): string[]` — extrait de `markdown-links.ts`, identique à `normalizeClassValue`

2. **Mettre à jour `src/core/navigation/utils.ts`** :
   - Supprimer la définition de `parseBoolean`
   - Importer `parseBoolean` depuis `../../utils/parse`
   - Vérifier les importeurs existants (`navigation.ts` l.14, `menu.ts` l.11) — les pointer directement vers `src/utils/parse` ou laisser la re-export depuis `navigation/utils.ts` selon ce qui est plus propre

3. **Mettre à jour `src/core/postprocess/markdown-images.ts`** :
   - Supprimer la fonction locale `parseBoolean` + les constantes `truthy`/`falsy` associées (ll.42-53)
   - Importer `parseBoolean` depuis `../../../utils/parse`

4. **Mettre à jour `src/core/postprocess/markdown-links.ts`** :
   - Supprimer les closures locales `parseBoolean`, `normalizeClassValue`, `truthy`, `falsy` dans `rewriteEntryBlocks` (ll.53-73)
   - Importer `parseBoolean` et `normalizeClassList` depuis `../../../utils/parse`
   - Remplacer les appels `normalizeClassValue(...)` → `normalizeClassList(...)`

## Files / areas involved
- **Créer** : `src/utils/parse.ts`
- **Modifier** : `src/core/navigation/utils.ts`
- **Modifier** : `src/core/postprocess/markdown-images.ts`
- **Modifier** : `src/core/postprocess/markdown-links.ts`
- **Vérifier imports** : `src/core/resolve/resolvers/navigation.ts`, `src/core/templates/menu.ts`

## Constraints and traps
- `parseBoolean` dans `navigation/utils.ts` accepte `unknown` ; dans les fichiers postprocess elle accepte `string | undefined`. La version `unknown` est un sur-ensemble valide — pas de changement de comportement.
- Dans `markdown-links.ts`, `parseBoolean` et `normalizeClassValue` sont définies **à l'intérieur** de la closure `rewriteEntryBlocks` — les supprimer de cette closure, pas juste les dédupliquer au niveau module.
- Ne pas supprimer la re-export de `parseBoolean` depuis `navigation/utils.ts` avant d'avoir vérifié tous ses importeurs directs.

## Done when
- [x] `src/utils/parse.ts` existe avec `parseBoolean` et `normalizeClassList` exportées
- [x] Aucune définition locale de `parseBoolean` ou `normalizeClassValue` ne subsiste dans `markdown-images.ts`, `markdown-links.ts`, ni `navigation/utils.ts`
- [x] `bunx tsc --noEmit` passe sans erreur
- [x] `bun run build website-example` passe sans erreur ni régression de rendu

## Checks to run
- `bunx tsc --noEmit` — vérifie zéro erreur TypeScript
- `bun run build -v website-example` — build complet de référence, rendu identique à avant

## Evidence expected
- Contenu de `src/utils/parse.ts`
- Diff des fichiers modifiés (avant/après pour chaque)
- Résultat `bunx tsc --noEmit` et `bun run build -v website-example` sans erreur

## Pending reason

## Remaining work

## Resume condition

## Commit proposal
Title: `refactor(core): centralize parseBoolean and normalizeClassList in src/utils/parse`
Description:
- Create `src/utils/parse.ts` with canonical `parseBoolean` (accepts `unknown`) and `normalizeClassList`.
- Remove local `parseBoolean` + `truthy`/`falsy` from `markdown-images.ts` and the inner closure of `markdown-links.ts`; import from shared utils.
- Remove local `normalizeClassValue` and `normalizeRelValue` closures from `markdown-links.ts` (both identical to `normalizeClassList`); remove orphaned `splitList`; replace all call sites with `normalizeClassList`.
- `navigation/utils.ts` re-exports `parseBoolean` from `src/utils/parse` — no change required for downstream importers (`navigation.ts`, `menu.ts`).
Scope(s):
- `core`
Why these scopes:
- Change is internal to `src/core/` and `src/utils/`; no public API, config, or template impact.

## Pilot exchange

## Dev log
- 2026-03-18 — Change: créé `src/utils/parse.ts` ; supprimé définitions locales dans `markdown-images.ts`, `markdown-links.ts`, `navigation/utils.ts` ; mis à jour chemins d'import.
  Why this way:
  - Observed issue: `parseBoolean` défini 3 fois (navigation/utils, markdown-images, markdown-links), `normalizeClassValue` défini localement dans une closure.
  - Root cause: pas de fichier utils partagé neutre, chaque module avait sa propre copie.
  - Chosen fix: créer `src/utils/parse.ts` comme home canonique ; `navigation/utils.ts` re-exporte pour préserver les importeurs existants sans les toucher.
  - Tradeoff: re-export dans `navigation/utils.ts` plutôt que mise à jour des importeurs `navigation.ts`/`menu.ts` — évite de toucher des fichiers hors scope, charge minimale.
  - Evidence: `bunx tsc --noEmit` ✅ (aucune erreur) ; `bun run build -v website-example` ✅ (build terminé, warnings habituels inchangés, aucune régression).
