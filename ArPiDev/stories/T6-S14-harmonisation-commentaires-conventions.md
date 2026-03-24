# T6-S14 — Harmonisation commentaires & conventions

Created: 2026-03-24 10h00m00s
Closed: 2026-03-25
Acceptance: User

Status: Done, Validated

## Goal

Appliquer les principes Clean Code aux commentaires de tout `src/`, migrer les conventions de nommage vers le site de documentation, et supprimer tout fichier de convention du repo engine.

## Context

Philosophie directrice : **Clean Code** (Robert C. Martin). Les commentaires ne compensent pas du mauvais code — ils n'existent que quand le code seul ne suffit pas.

Principes appliqués :
- **Le code s'explique lui-même** : bon nommage > commentaire. Si un commentaire paraphrase le code, c'est le commentaire qui est de trop.
- **Pourquoi, pas quoi** : un commentaire utile explique l'intention, une contrainte, un piège, une conséquence — jamais ce que le code fait déjà lisiblement.
- **Supprimer le bruit** : commentaires redondants, code commenté (dead code), commentaires décoratifs sans valeur.
- **Headers de module** : obligatoires sur chaque fichier `.ts`. Doivent décrire brièvement le rôle du module (1 phrase utile). Si un header ne fait que paraphraser le nom du fichier, le réécrire pour apporter du contexte — ne jamais le supprimer.
- **Commentaires d'avertissement/conséquence** : utiles, à garder.
- **TODO** : temporaires uniquement, pas de TODO permanent.

État actuel (recon) :
- 98 fichiers `.ts`, 100% ont un header `/** */` — bon état global
- ~236 commentaires inline `//` dans 61 fichiers — certains potentiellement redondants
- ~4 fichiers avec du code commenté à nettoyer
- 0 TODO/FIXME (bon signe)
- Section separators `// ──` dans 5 fichiers navigation/types
- `src/utils/CONVENTIONS.md` existe (verb naming table) — doit migrer vers le site de doc

## In scope

### Nettoyage Clean Code dans `src/` (tous les `.ts`)
- **Supprimer les commentaires redondants** : ceux qui paraphrasent le code ou répètent le nom de la fonction/variable
- **Supprimer le code commenté** (dead code) dans les ~4 fichiers identifiés
- **Améliorer les headers redondants** : si le header ne fait que reformuler le nom du fichier (ex: `/** Sitemap generation. */` sur `sitemap.ts`), le réécrire pour apporter du contexte utile — le header reste obligatoire sur chaque fichier
- **Conserver les commentaires utiles** : ceux qui expliquent le pourquoi, les contraintes, les pièges, les conséquences, les décisions d'architecture
- **Harmoniser le style** des commentaires conservés (cohérence de format)
- **Renommer** si un commentaire peut être remplacé par un meilleur nom de variable/fonction (Clean Code : refactorer plutôt que commenter)

### Migration conventions → site de doc
- Créer une page conventions dans `webette-documentation/05 internals/05 conventions/` couvrant :
  - Philosophie commentaires (Clean Code appliqué à Webette)
  - Conventions de nommage des fonctions (verb prefixes : normalize, resolve, build, create, find, load, scan, apply, register, parse)
  - Quand commenter et quand ne pas commenter
- Migrer le contenu de `src/utils/CONVENTIONS.md` dans cette page
- Supprimer `src/utils/CONVENTIONS.md` du repo engine

## Out of scope

- Modifier la logique ou le comportement du code
- Ajouter des commentaires là où il n'y en a pas (Clean Code : pas de commentaires obligatoires)
- Ajouter des docstrings JSDoc sur les fonctions individuelles
- Renommages massifs de fonctions/variables (seuls les renommages qui remplacent un commentaire redondant sont in-scope, et uniquement si le changement est local et sans risque)
- Toucher aux fichiers hors `src/` (templates, config, etc.)

## Files/areas likely involved

- `src/**/*.ts` — tous les fichiers pour l'audit Clean Code
- `src/utils/CONVENTIONS.md` — source à migrer puis supprimer
- `webette-documentation/05 internals/` — destination de la page conventions
- Fichiers avec code commenté identifiés : `src/core/postprocess/markdown-links.ts`, `src/core/serve.ts`, `src/core/templates/menu.ts`, `src/core/export/history.ts`

## Constraints and traps

- **Zéro changement de comportement** — les modifications sont cosmétiques (commentaires) ou documentaires (site de doc)
- **Ne pas sur-supprimer** : les commentaires d'architecture, d'avertissement, de conséquence et de "pourquoi" restent. Le jugement est nécessaire.
- **Renommages prudents** : si un renommage remplace un commentaire, vérifier que tous les consommateurs sont mis à jour et que le build passe
- La page de doc doit être en anglais (cohérent avec le site de doc existant)
- Vérifier que le site de doc build correctement après ajout de la page

## Execution brief

1. **Passe Clean Code** : parcourir tous les fichiers `src/**/*.ts`. Pour chaque fichier :
   - Supprimer les commentaires qui paraphrasent le code
   - Supprimer le code commenté (dead code)
   - Évaluer les headers : garder ceux qui apportent du contexte utile, supprimer ceux qui sont redondants avec le nom de fichier
   - Si un commentaire peut être remplacé par un meilleur nommage, renommer (prudemment)
   - Conserver les commentaires why/warning/consequence/architecture
2. **Créer la page doc** : `webette-documentation/05 internals/05 conventions/01 conventions.md`
   - Philosophie Clean Code appliquée
   - Table des verb prefixes (migré de CONVENTIONS.md)
   - Guide "quand commenter"
3. **Supprimer** `src/utils/CONVENTIONS.md`
4. **Vérifier** : build des deux sites

## Checks to run

- `bun run build website-example` — zéro régression sur le moteur
- `bun run build webette-documentation` — le site de doc build sans erreur et la nouvelle page est générée
- Vérifier que `src/utils/CONVENTIONS.md` n'existe plus après migration
- Vérifier l'absence de code commenté résiduel dans `src/`

## Evidence expected

- Liste des fichiers modifiés avec nature du changement (commentaire supprimé / renommage / header retiré)
- Nombre de commentaires supprimés vs conservés (ratio approximatif)
- Page conventions visible dans `_public/` du site de doc
- Build clean des deux sites
- Diff montrant la suppression de `src/utils/CONVENTIONS.md`

## Done when

- Tous les commentaires dans `src/` suivent les principes Clean Code (pas de bruit, pas de paraphrase, pas de dead code)
- Les commentaires utiles (why/warning/architecture) sont préservés
- La page conventions existe dans le site de doc
- `src/utils/CONVENTIONS.md` est supprimé
- Les deux builds passent sans erreur

## Pending reason

## Remaining work

## Resume condition

## Commit proposal

Title: `refactor(core): apply Clean Code comment conventions across src/`
Description:
- Remove ~125 redundant comments that paraphrased code, restated function names, or added no value across ~40 files in src/.
- Rewrite ~10 file headers that merely restated the filename to provide useful module context.
- Rewrite site-model-transformer.ts header from promotional prose to a concise description.
- Migrate verb naming conventions from src/utils/CONVENTIONS.md to webette-documentation/05 internals/05 conventions/.
- Delete src/utils/CONVENTIONS.md from the engine repo (conventions now live in the doc site).
- Create comprehensive conventions page covering comment philosophy (Clean Code), function naming verb prefixes, and when to comment.
Scope(s):
- core
Why these scopes:
- Changes span the entire src/ directory (core engine) and touch every subsystem. The primary scope `core` best represents the cross-cutting nature of this refactoring.

## Pilot exchange

## Dev log

- 2026-03-25 00h00m00s — Change: Clean Code comment pass on all 98 .ts files in src/
  Why this way:
  - Observed issue: Many comments paraphrased the code (function names, variable names, obvious control flow), violating Clean Code principles.
  - Root cause: Comments added during initial development as thinking-out-loud, never cleaned up.
  - Chosen fix: Systematic audit in 4 parallel batches, removing ~125 redundant comments, rewriting ~10 weak headers, preserving all "why"/warning/architecture comments.
  - Tradeoff: Kept section separators (// ── Section ──) in navigation/types files as useful navigation aids rather than removing them.
  - Evidence: `bun run build -v website-example` — builds successfully, `bun run build webette-documentation` — builds successfully with conventions page at /internals/conventions/.

- 2026-03-25 00h05m00s — Change: Created conventions page in webette-documentation and deleted src/utils/CONVENTIONS.md
  Why this way:
  - Observed issue: T6-S14 requires no .md convention files in the engine repo.
  - Root cause: CONVENTIONS.md was created in T6-S09 inside src/utils/ for developer reference.
  - Chosen fix: Migrated verb naming table + added Clean Code comment philosophy + "when to comment" guide into `webette-documentation/05 internals/05 conventions/01 index.md`.
  - Evidence: Page generated at webette-documentation/_public/internals/conventions/index.html. CONVENTIONS.md confirmed deleted.
  Commands/tests: `bun run build website-example` ✅, `bun run build webette-documentation` ✅, `ls webette-documentation/_public/internals/conventions/` → index.html present.
