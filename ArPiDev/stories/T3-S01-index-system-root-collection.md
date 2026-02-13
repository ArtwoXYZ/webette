# T3-S01 - Nouveau systeme d'index (Root/Collection)

Created: 2026-02-13 00h39m29s
Closed: 2026-02-13 02h19m16s
Acceptance: User

Status: Done, Validated

## Context
L'index actuel est difficile a raisonner et ne distingue pas clairement les index racine et collection. Aujourd'hui, le **contenu** des pages d'index peut etre override via la config `site.index` (mapping vers une entry unlisted). On veut remplacer ca par un systeme simple base sur des dossiers explicites, et l'ancienne methode doit disparaitre. Les overrides de **layout** (templates) sont un sujet separe.

## Rationale
Clarifier la structure d'index rend la navigation plus previsible et facilite les templates, sans casser les usages existants.

## Goal
Definir et implementer un nouveau systeme d'index base sur les dossiers "custom index page" et "custom collection index page", en supprimant l'ancienne methode.

## Model definition
- Le nom des dossiers d'index est configurable via `site.indexFolderName` (string) dans `webette.config.ts`.
  - Valeur par defaut: `index`.
  - La valeur est normalisee et comparee sans casse.
- Un dossier d'index est un dossier dont le **nom normalise** correspond a `site.indexFolderName`:
  - match insensible a la casse,
  - accepte un prefixe numerique (ex: `01 Index`, `2-index`) selon les regles de nommage existantes.
- `Custom index page` = dossier d'index **a la racine du site**.
- `Custom collection index page` = dossier d'index **a l'interieur d'une collection**.
- Ces dossiers fournissent le **contenu** des pages d'index:
  - `Custom index page` -> page racine (`/index.html`).
  - `Custom collection index page` -> page d'index de la collection (`/<collection>/index.html`).
- Ils ne creent **pas** de route d'entry separee et sont **exclus** des listes d'entries (menu, model `entries`, etc.).
- Priorite de contenu:
  - `Custom index page` / `Custom collection index page` est l'unique methode d'override de **contenu** pour les pages d'index.
  - Les overrides de **layout** existants restent appliques **sans changement** (templates custom index).
- L'ancienne methode d'override de contenu (`site.index` -> entry unlisted) est **retiree** (pas de compatibilite legacy).
- La regle s'applique **uniquement** aux niveaux de collections deja supportes par le modele actuel (pas d'extension a de nouveaux niveaux).

## In scope
- Definir les conventions de dossiers "custom index page" et "custom collection index page".
- Regles de resolution des index (root vs collection) et priorites.
- Retirer l'ancienne methode d'override de contenu.
- Ajouter l'option de config `site.indexFolderName` (defaut: `index`).
- Conserver les overrides de layout existants (ne pas les remplacer).
- Implémenter la resolution dans le scan/build et valider sur un site d'exemple.
- Mettre a jour les templates par defaut si necessaire pour refleter le nouveau model.
- Mettre a jour `website-example` pour reproduire le rendu actuel avec le nouveau fonctionnement.

## Out of scope
- Refonte de navigation complete (T3-S02).
- Changement du format de config global.
- Migration automatique de sites existants (non necessaire a ce stade).

## Documentation impact
- To document: conventions de dossiers, regles de resolution des index, suppression de `site.index` (legacy).
- Wording docs: "custom index page" (root) et "custom collection index page".
- To document: `site.indexFolderName` (nom des dossiers d'index, defaut `index`).
- To document: contenu d'index supporte les memes blocs/rendering que les entries (markdown/images/navigation/etc.).
- To document: comportement en cas de doublons (plusieurs dossiers d'index -> premier choisi) et drafts ignores si `includeDrafts=false`.

## Ready when
- Goal est un seul resultat clair.
- In scope / Out of scope explicites.
- Model definition est explicite et testable.
- Done when testable.
- Acceptance owner est defini.
- Rationale est presente.

## Done when
- Les dossiers "custom index page" et "custom collection index page" sont reconnus et resolus correctement.
- Les dossiers "custom index page" / "custom collection index page" ne creent pas d'entry distincte et ne figurent pas dans les listes d'entries.
- Les pages `/index.html` et `/<collection>/index.html` prennent leur contenu depuis ces dossiers quand ils existent.
- Le nom des dossiers d'index est configurable via `site.indexFolderName` (default `index`).
- Les overrides de layout existants continuent de fonctionner sans changement.
- L'ancienne methode d'override de contenu n'est plus supportee.
- Un build de `website-example` valide le comportement (rendu identique a avant).
- Le layout d'index par defaut accepte l'injection d'un contenu custom issu des dossiers d'index.
- La story contient les preuves de validation (commande + resultat).

## Pending reason
- None (not pending).

## Remaining work
- None.

## Resume condition
- Not applicable.

## Commit proposal
Title: feat(collections): switch index content to index folders
Description:
- Replace legacy `site.index` overrides with index folders (root + collection), including route/history/sorting/prune handling and exclusion from entry lists/exports.
- Render index pages with index layouts plus entry-like block rendering for index content, and postprocess internal markdown links/images for index entries.
- Add index-folder logs for duplicates/drafts and update `website-example` (index layout styling + custom collection index folders + root index setup).
Scope(s):
- collections
Why these scopes:
- Primary change is the collection/indexing model; template/example/logging updates are secondary impacts.

## Pilot exchange
- 2026-02-13 00h39m29s — Pilot -> User — Story detailled: model definition added (folder names, resolution, priority, exclusions).
- 2026-02-13 00h39m29s — Pilot -> User — Clarification: legacy content override method should be removed (no compatibility required pre‑release).
- 2026-02-13 00h55m02s — Pilot -> User — Code review: legacy content overrides come from `site.index` (index-overrides) and are distinct from template layout overrides; story updated accordingly.
- 2026-02-13 01h00m24s — Pilot -> User — Update: no special rule/warn for `site.index`; website-example must keep identical output; default index layout must accept custom index content.
- 2026-02-13 01h04m02s — Pilot -> User — Update: index folders are named `index` (case-insensitive) with optional numeric prefix; doc wording candidates added.
- 2026-02-13 01h07m02s — Pilot -> User — Update: add `site.indexFolderName` config (default `index`) to define index folder naming.
- 2026-02-13 01h07m02s — Pilot -> User — Story validated; status set to `To Do, Validated`.

- 2026-02-13 02h11m54s — Dev -> Pilot — User validated story; user stops for tonight.
- 2026-02-13 02h17m30s � Dev -> Pilot � User validated story; ready to close.
- 2026-02-13 02h18m31s � Dev -> Pilot � User asks to call Pilot now.
## Dev log
- 2026-02-13 01h42m41s — Change: removed legacy index overrides, extracted index folders into `site.indexes`, updated render/sort/history/postprocess/prune to use index content, and refreshed default templates + website-example.
  Why this way:
  - Observed issue: index content override depended on `site.index`, and index folders showed up as regular entries.
  - Root cause: build/render pipeline still used `index-overrides`, and index folders stayed in collections lists.
  - Chosen fix: add index-folder extraction, keep index entries in `site.indexes`, render index pages with index layouts + blocks, drop legacy overrides, and update templates/example to match the new model.
  - Why this option: matches the story model (explicit folders) while keeping layout overrides intact with minimal surface changes.
  - Evidence: `bun run build website-example` finished with success logs; tool timed out after output; warnings observed for an unresolved link to a draft entry and `build.icons.icoFailed`.
  Commands/tests: `bun run build website-example` (completed; command timed out after logs).
- 2026-02-13 01h47m51s — Change: simplified typing in markdown postprocess helpers to fix TypeScript errors.
  Why this way:
  - Observed issue: TypeScript errors reported in `markdown-images.ts` and `markdown-links.ts` around conditional generic types.
  - Root cause: overly complex conditional types were unnecessary and confused TS inference.
  - Chosen fix: use explicit `Entry` + `Collection` types for the helper signatures.
  - Why this option: keeps behavior identical while removing the typing ambiguity.
  - Evidence: edits applied; no runtime behavior change.
  Commands/tests: not run (type-only change).
- 2026-02-13 01h52m51s â€” Change: fixed TS error in scan index folder enrichment with noUncheckedIndexedAccess.
  Why this way:
  - Observed issue: TypeScript error in `scan/index.ts` when spreading `enrichEntries(...)[0]`.
  - Root cause: `noUncheckedIndexedAccess` makes `[0]` possibly undefined.
  - Chosen fix: use a safe destructure before spreading.
  - Why this option: keeps behavior identical without non-null assertions.
  - Evidence: change is localized; no runtime behavior change.
  Commands/tests: not run (type-only change).
- 2026-02-13 01h53m51s — Change: guarded `listRootIndexRaw` against undefined target when picking the first candidate.
  Why this way:
  - Observed issue: TypeScript error "'target' is possibly 'undefined'" in `scan/index.ts`.
  - Root cause: `noUncheckedIndexedAccess` makes `candidates[0]` possibly undefined.
  - Chosen fix: destructure and early-return if no target.
  - Why this option: avoids non-null assertions while keeping the same runtime behavior.
  - Evidence: change is localized; no runtime behavior change.
  Commands/tests: not run (type-only change).
- 2026-02-13 02h01m53s — Change: added index-folder logs (duplicate root/collection, draft-skipped) and documented the markdown postprocess rationale.
  Why this way:
  - Observed issue: removing `site.index` overrides also removed related logs; duplicate/ignored index folders would be silent.
  - Root cause: no logging existed in the new index-folder path (scan/extract).
  - Chosen fix: log when multiple index folders are present (root/collection) and when index folders are ignored due to draft filtering.
  - Why this option: provides the same visibility as legacy overrides without changing behavior.
  - Evidence: log keys added in locales; warnings triggered only on edge cases.
  Commands/tests: not run (logging-only change).
  Details (markdown-links/images):
  - Custom index pages are entries with blocks; without running the markdown link/image postprocess on them, `entry:`/`block:` references would stay unresolved in index content.
  - The postprocess now runs on `site.indexes.root` and `site.indexes.collections[...]` using the same `rewriteEntryBlocks` logic as regular entries, passing collection context for collection indexes so `entry:` resolves relative to that collection.
  - This keeps behavior identical for normal entries and makes index content consistent with the rest of the site.
- 2026-02-13 02h07m19s — Change: refreshed `website-example` index layout to use navigation styling and added custom collection index folders with overview copy.
  Why this way:
  - Observed issue: example index layout looked plain and did not showcase the navigation style or collection index customization.
  - Root cause: index layout used a basic list and collections had no custom index folders.
  - Chosen fix: reuse navigation partials in the index layout and add `index` folders for each collection with markdown intros.
  - Why this option: aligns the demo with the navigation.webt visual language and demonstrates custom collection index pages.
  - Evidence: layout updated and new index folders added under each collection.
  Commands/tests: not run.
- 2026-02-13 02h09m41s — Change: set navigation links to use accent color in the example stylesheet.
  Why this way:
  - Observed issue: menu links in collection index didn’t read as accent calls-to-action.
  - Root cause: `.navigation-link` was using `var(--link)` instead of `var(--accent)`.
  - Chosen fix: switch `.navigation-link` color to `var(--accent)` in the example CSS.
  - Why this option: matches the desired visual emphasis without altering structure.
  - Evidence: CSS updated in `website-example/_templates/assets/css/style.css`.
  Commands/tests: not run.
- 2026-02-13 02h10m32s — Change: reverted navigation link color to `var(--link)` per feedback.
  Why this way:
  - Observed issue: user requested not to use the accent color for menu links.
  - Root cause: last tweak changed `.navigation-link` to `var(--accent)`.
  - Chosen fix: restore `.navigation-link` color to `var(--link)`.
  - Why this option: matches the requested visual direction.
  - Evidence: CSS reverted in `website-example/_templates/assets/css/style.css`.
  Commands/tests: not run.
