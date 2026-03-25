# T6-S16 — Audit nommage fonctions

Created: 2026-03-25 14h30m00s
Closed: 2026-03-25 23h58m00s
Acceptance: User

Status: Done, Validated

## Goal

Harmoniser les noms de fonctions exportées dans `src/` avec les verb prefixes documentés : étendre la liste approuvée avec des préfixes secondaires légitimes, puis renommer les fonctions réellement incohérentes.

## Context

Recon Pilot : 262 fonctions exportées, ~79 (30 %) utilisent des préfixes hors liste. Parmi celles-ci, beaucoup suivent des conventions universelles (`is*`, `run*`, `render*`, `write*`, `read*`) qui méritent d'être approuvées plutôt que forcées dans les 10 préfixes d'origine.

Décision validée avec l'user : étendre la doc plutôt que tout remapper.

## In scope

1. **Étendre la doc de conventions** (`webette-documentation/05 internals/05 conventions/01 index.md`) :
   - Ajouter une section "Préfixes secondaires approuvés" avec : `is`, `run`, `render`, `write`, `read`, `list`, `match`, `collect`, `enrich`
   - Documenter leur sémantique (1 ligne chacun)

2. **Renommer les fonctions non conformes restantes** (~20-30 fonctions) :
   - `get*` → `find*` ou `resolve*` selon la sémantique
   - `clean*`, `copy*`, `derive*`, `detect*`, `ensure*`, `escape*`, `filter*`, `format*`, `limit*`, `order*`, `pick*`, `protect*`, `prune*`, `remove*`, `rewrite*`, `rm*`, `setup*`, `should*`, `slugify*`, `sort*`, `split*`, `strip*`, `to*`, `template*`, `count*`, `serve*` → remapper vers un préfixe approuvé (primaire ou secondaire) ou justifier un ajout

3. **Mettre à jour tous les call sites** après chaque renommage.

## Out of scope

- Fonctions privées / non-exportées (conventions internes libres)
- Renommer les fonctions déjà conformes aux 10 préfixes primaires
- Renommer les fonctions `is*`, `run*`, `render*`, `write*`, `read*`, `list*`, `match*`, `collect*`, `enrich*` (elles deviennent conformes par extension de la doc)
- Changements de comportement ou refactoring structurel

## Execution brief

1. Mettre à jour la page de conventions dans le site de doc : ajouter les préfixes secondaires avec sémantique.
2. Lister toutes les fonctions exportées restant non conformes après extension (exclure les ~60 fonctions couvertes par les nouveaux préfixes).
3. Pour chaque fonction non conforme : choisir le préfixe cible, renommer, mettre à jour les imports/call sites.
4. Vérifier la compilation TypeScript (`bun run build` ou `bunx tsc --noEmit`).
5. Vérifier le build du site exemple (`bun run . build` sur `website-example`).

## Files/areas likely involved

- `webette-documentation/05 internals/05 conventions/01 index.md` (doc)
- `src/core/scan/raw-scan.ts` (classify, sort)
- `src/core/scan/utils.ts` (sort)
- `src/core/tag-filter.ts` (filter, collect, entry*)
- `src/utils/path.ts` (to*, ensure*, strip*, escape*)
- `src/plugins/runner.ts` (déjà `run*` → conforme après extension)
- `src/core/build/utils/` (count*, format*, get*)
- Tous les fichiers importants dans `src/` qui appellent les fonctions renommées

## Constraints and traps

- Les renommages doivent être atomiques : renommer + mettre à jour tous les usages avant de passer au suivant.
- Certaines fonctions utilitaires courtes (`slugify`, `escape`) peuvent rester telles quelles si aucun préfixe approuvé ne convient — dans ce cas, les ajouter comme exceptions documentées ou comme préfixe secondaire supplémentaire.
- Ne pas casser le build : vérifier `tsc` après chaque lot de renommages.

## Checks to run

- `bunx tsc --noEmit` — compilation sans erreur après renommages
- `bun run . build` dans `website-example/` — build du site sans régression
- Grep des anciens noms de fonctions — aucune référence résiduelle

## Evidence expected

- Liste des fonctions renommées (ancien → nouveau nom)
- Liste des préfixes secondaires ajoutés à la doc
- Compilation TypeScript propre
- Build `website-example` sans erreur

## Done when

- La doc de conventions inclut les préfixes secondaires approuvés avec sémantique
- Toutes les fonctions exportées dans `src/` utilisent un préfixe approuvé (primaire ou secondaire)
- Les fonctions qui ne rentrent dans aucun préfixe sont documentées comme exceptions
- `tsc --noEmit` passe
- Build `website-example` sans régression

## Pending reason

## Remaining work

## Resume condition

## Commit proposal
Title: refactor(core): harmonize function naming with approved verb prefixes
Description:
- Extend naming conventions doc with secondary approved prefixes (is, run, render, write, read, list, match, collect, enrich)
- Rename ~20-30 non-compliant exported functions to approved prefixes
- Update all call sites and imports across src/
Scope(s):
- core
Why these scopes:
- Renaming spans the entire src/ tree; core is the primary impacted scope per commit-scopes policy

## Pilot exchange

## Dev log
 
- 2026-03-25 14h45m00s — Change: Extended conventions doc with 9 secondary prefixes
  Why this way:
  - Observed issue: 30% of exported functions used prefixes not in the approved list, but many follow universal conventions (is*, run*, render*, write*, read*, list*, match*, collect*, enrich*)
  - Chosen fix: Add these as "Secondary approved prefixes" rather than force-renaming ~60 functions
  - Evidence: Doc updated at `webette-documentation/05 internals/05 conventions/01 index.md`
 
- 2026-03-25 15h00m00s — Change: Renamed 28 non-compliant functions across src/
  Why this way:
  - Root cause: After secondary prefix extension, ~28 functions still used non-approved prefixes (get*, clean*, slugify, should*, filter*, extract*, detect*, sort*, classify*, derive*, strip*, format*, pick*, split*, template*)
  - Chosen fix: Remap each to the most semantically accurate approved prefix
  - Tradeoff: Chose `normalizeTargetName` for the local function in targets.ts to avoid name collision with the imported `normalizeName`
 
  Complete rename list:
  | Old name | New name | File |
  |---|---|---|
  | cleanName | normalizeName | utils/naming.ts |
  | slugify | normalizeSlug | utils/naming.ts |
  | orderKey | parseOrderKey | utils/naming.ts |
  | limitSlugWords | normalizeSlugWords | utils/naming.ts |
  | toPosix | normalizePosixPath | utils/path.ts |
  | ensureLeadingSlash | normalizeLeadingSlash | utils/path.ts |
  | stripRouteSlashes | normalizeRouteSlashes | utils/path.ts |
  | parentCollectionPathKey | resolveParentPathKey | utils/path.ts |
  | escapeExtForRegex | normalizeExtForRegex | utils/path.ts |
  | pickString | parseString | utils/parse.ts |
  | shouldIncludeCollection | isIncludedCollection | utils/navigation.ts |
  | shouldIncludeEntry | isIncludedEntry | utils/navigation.ts |
  | entryMatchesTags | matchEntryTags | core/tag-filter.ts |
  | filterEntriesByTags | findEntriesByTags | core/tag-filter.ts |
  | getAllTags | collectAllTags | core/tag-filter.ts |
  | getCollectionTags | collectCollectionTags | core/tag-filter.ts |
  | getSiteTags | collectSiteTags | core/tag-filter.ts |
  | pickImageSource | resolveImageSource | core/templates/image-utils.ts |
  | getPrevNextEntry | findPrevNextEntry | core/build/utils/prev-next.ts |
  | extractIndexFolders | collectIndexFolders | core/build/utils/index-folders.ts |
  | templateBaseName | parseTemplateName | core/build/types.ts |
  | splitRouteSegments | parseRouteSegments | core/resolve/route-hints.ts |
  | getResolver | findResolver | core/resolve/registry.ts |
  | detectBlockType | resolveBlockType | core/scan/detect-block-type.ts |
  | sortByName | applySortByName | core/scan/utils.ts |
  | classifyFolderOutsideEntry | resolveFolderOutsideEntry | core/scan/raw-scan.ts |
  | deriveFlatRawViewsFromStructure | buildFlatRawViews | core/scan/derived-views.ts |
  | stripDot | normalizeExtNoDot | core/block-types/image/paths.ts |
  | formatToExtension | normalizeFormatExtension | core/block-types/image/paths.ts |
  | getVersion | loadVersion | version.ts |
 
  Documented exceptions: `t` (i18n), `escapeHtml` (web security), `countBlocks` (standard utility)
 
  Evidence:
  - tsc --noEmit: only pre-existing errors (output.ts Locale, html.ts Processor, icons.ts SharpModule, tag-filter.ts model import) — no new errors
  - website-example build: ✅ Build terminé
  - grep old names in src/: 0 stale references (only Handlebars helper registration strings kept as-is)
  
- 2026-03-25 — Previous attempt reverted: all 28 renames were rolled back due to incomplete TS error verification. Baseline established: 7 pre-existing TS errors confirmed on clean codebase (output.ts ×2, html.ts ×2, icons.ts ×2, tag-filter.ts ×1).
