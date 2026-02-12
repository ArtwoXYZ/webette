# T2-S05 — Social headers (config + templates par defaut)

Created: 2026-02-12 17h14m17s
Closed:
Acceptance: User

Status: Active

## Context
Les templates par defaut n'ajoutent pas de balises sociales (Open Graph/Twitter), ce qui degrade les apercus lors du partage.

## Rationale
Un socle de meta sociales configurable au niveau site limite les overrides templates et rend les pages partageables par defaut.

## Goal
Ajouter une configuration `site.social` pour produire des headers sociaux dans les templates par defaut.

## In scope
- Definir `site.social` avec un mode simple:
  - `injectHead?: boolean` (defaut: `true`)
  - `image?: string` (image sociale globale du site, unique pour toutes les pages)
  - `titleTemplate?: string`
  - `descriptionTemplate?: string`
  - `defaultDescription?: string`
  - `excerptFromFirstTextBlock?: boolean` (defaut: `false`)
  - `excerptMaxWords?: number` (defaut: `30`)
  - `excerptSuffix?: string` (defaut: `…`)
- Variables disponibles dans `titleTemplate` et `descriptionTemplate`:
  - `{{siteTitle}}`, `{{pageTitle}}`, `{{pageType}}`, `{{siteDescription}}`, `{{pageDescription}}`, `{{pageExcerpt}}`, `{{pageUrl}}`
- Definir un fallback deterministic, avec minimum de config utilisateur:
  - `pageTitle`: titre de page (entry/collection/index) si dispo, sinon `site.title`
  - `pageDescription`: `entry.description` ou `collection.description` si dispo
  - `pageExcerpt`: extrait du premier block `text/markdown` seulement si `excerptFromFirstTextBlock=true`, limite par `excerptMaxWords`, suffixe `excerptSuffix`
  - `description finale` (ordre strict):
    - 1) `pageDescription` (description.webt item)
    - 2) `pageExcerpt` (si active et disponible)
    - 3) `site.social.defaultDescription`
    - 4) `site.description`
    - 5) omission de la balise si rien n'est disponible
  - `image`: `site.social.image` (global uniquement)
  - `twitter:card`: `summary_large_image` si image presente, sinon `summary`
- Injecter les balises suivantes dans le `<head>` des templates par defaut:
  - General metadata: `author`, `description`
  - Open Graph: `og:type`, `og:title`, `og:description`, `og:url`, `og:image`, `og:site_name`
  - Twitter: `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
  - Canonical: `<link rel="canonical">`
- Respecter les overrides existants de page si deja disponibles via le modele, sans casser le rendu actuel.
- Ne jamais injecter de balise vide.
- Validation manuelle sur `website-example`.

## Out of scope
- Generation automatique d'images OG dediees.
- Image sociale specifique par entry/collection (pas d'override par item dans cette story).
- Champs sociaux avances (locale alternate, video, galeries multiples).
- Modification/suppression automatique des balises dans des templates custom utilisateur.
- Configuration d'un nom de fichier special pour override social par dossier.

## Documentation impact
- To document: nouvelle config `site.social` + comportement des fallbacks et balises emises.

## Ready when
- Goal est un seul resultat clair.
- In scope / Out of scope sont explicites.
- Done when est testable.
- Acceptance owner est defini.
- Rationale est presente.

## Done when
- Les balises Open Graph et Twitter ci-dessus sont injectees quand `site.social.injectHead` n'est pas `false`.
- Les balises general metadata (`author`, `description`) sont injectees quand disponibles, sans balise vide.
- Si `site.social.injectHead = false`, aucune balise sociale n'est injectee.
- La configuration minimale fonctionne avec tres peu de champs saisis (fallbacks actifs).
- Le fallback description respecte l'ordre valide: `description.webt item` -> `excerpt premier block (si active)` -> `site.social.defaultDescription` -> `site.description`.
- Le mode excerpt applique bien une limite en nombre de mots + suffixe configurable.
- Les valeurs fallback sont deterministes quand un champ manque.
- Le rendu reste inchange si `site.social` est absent, sauf fallback implicite non-invasif.
- Validation manuelle faite sur `website-example` avec plusieurs builds et configurations distinctes.
- Le Dev doit tester une matrice de configs (pas un seul cas), documenter les cas executes, et expliciter la methode retenue pour couvrir les parametres `site.social` avec un minimum de redondance.

## Pending reason
- None (story not pending).

## Remaining work
- User validation only (acceptance check).

## Resume condition
- Not applicable.

## Commit proposal
Title: feat(templates): add configurable social head tags with deterministic fallbacks
Description:
- Add `site.social` support in social head generation with `injectHead`, global image, title/description templates, deterministic fallback chain, and canonical/OG/Twitter tags.
- Implement optional excerpt fallback from first text/markdown block (`excerptFromFirstTextBlock`, `excerptMaxWords`, `excerptSuffix`) and keep empty tags suppressed.
- Add explicit HTML section comments in injected head output to separate canonical, Facebook, and Twitter metadata blocks.
- Add a general metadata section (`author`, `description`) using existing site/page fallback data, with no extra required user config.
- Add an explicit `<!-- Icons -->` section comment in `iconsHead` generated output (icons injector), before favicon/app icon tags.
- Refactor icons head markup generation into a template-focused module to separate HTML composition from icon asset generation side effects.
- Change the default icons output directory from `_assets/icon` to `assets/icon`.
- Wire social head rendering into default and example wrappers via a dedicated helper.
- Validate via a multi-build config matrix on `website-example` covering no-social, global-image, excerpt-only, inject-off, and item-description precedence cases.
Scope(s):
- templates
Why these scopes:
- Primary impact is template head rendering behavior and metadata generation for rendered pages.

## Pilot exchange
- 2026-02-12 17h14m17s — Pilot -> User — Story creee apres validation de T2-S04; en attente de validation du contenu de cette story.
- 2026-02-12 17h35m00s — Pilot -> User — Scope raffine selon discussion: image sociale globale uniquement, templates a variables, fallback fort, toggle `injectHead`, pas d'override par item dans cette story.
- 2026-02-12 18h02m00s — Pilot -> User — Fallback description finalise: `description.webt item` -> `excerpt premier block (optionnel)` -> `social.defaultDescription` -> `site.description`.
- 2026-02-12 18h08m00s — Pilot -> User — Critere de validation renforce: le Dev devra executer plusieurs builds avec differentes configs pour valider la couverture des parametres et documenter la methode de test.
- 2026-02-12 18h07m08s — Pilot -> User — Story content validated by user; status set to `To Do, Validated`.
- 2026-02-12 18h19m05s — Dev -> Pilot — To document:
  - Nouvelle config `site.social` (`injectHead`, `image`, `titleTemplate`, `descriptionTemplate`, `defaultDescription`, `excerptFromFirstTextBlock`, `excerptMaxWords`, `excerptSuffix`).
  - Balises injectees en templates par defaut: canonical + Open Graph + Twitter.
  - Fallback description applique: `description.webt item` -> excerpt premier block (optionnel) -> `site.social.defaultDescription` -> `site.description`.
  - `twitter:card` fallback: `summary_large_image` si image, sinon `summary`.
  - Aucune balise sociale injectee si `site.social` absent ou `site.social.injectHead=false`.

## Dev log
- 2026-02-12 18h12m29s — Start implementation after validation: status moved to `Active`; target is social head generation with config fallbacks and multi-config build matrix validation.
- 2026-02-12 18h19m05s — Implemented social metadata head generation (`src/core/templates/social-head.ts`) + helper wiring (`src/core/templates/helpers.ts`) + wrapper injection (`templates/wrapper/wrapper.hbs`, `website-example/_templates/wrapper/wrapper.hbs`). Why this way: observed issue -> default templates had no social meta and required manual per-site head overrides; root cause -> no centralized social metadata renderer with deterministic fallback logic in the template pipeline; chosen fix -> add a dedicated social-head builder (config parsing, fallback resolution, excerpt extraction, canonical/OG/Twitter emission) exposed through one helper used by wrappers; why this option -> keeps behavior centralized, avoids per-template duplication, and supports minimal user config with explicit opt-out (`injectHead`); evidence -> multi-build matrix passed (`case1` no-social no injection, `case2` global image + default description, `case3` excerpt fallback with word limit/suffix, `case4` injectHead false, `case5` item description priority). Commands/tests: `bun run build website-example` (baseline); `/tmp/webette_social_matrix.sh` (5 config scenarios, all passed).
- 2026-02-12 18h28m06s — User requested a concrete config change on `website-example`; story moved back to `Active` to apply the requested `site.social` test setup with the provided image.
- 2026-02-12 18h28m28s — Applied requested example config in `website-example/webette.config.ts` (`site.social.image = "_templates/assets/social.png"` + social defaults/templates) and rebuilt the example site. Why this way: observed issue -> user needed a ready-to-run social config with the newly added `social.png`; root cause -> config was not yet present in the example site file; chosen fix -> add a complete `site.social` block directly in the example config with minimal-setup defaults; why this option -> fastest path to test real output with user-provided asset while keeping deterministic fallback behavior; evidence -> build completed successfully and generated site output without errors (`✅ Build terminé`). Commands/tests: `bun run build website-example`.
- 2026-02-12 18h35m27s — Added explicit HTML section comments inside injected social head output (`Canonical metadata`, `Facebook metadata`, `Twitter metadata`) in `src/core/templates/social-head.ts`, then rebuilt and verified generated HTML. Why this way: observed issue -> user asked to separate injected social metadata parts for readability in generated `<head>`; root cause -> metadata tags were injected as one continuous block without explicit section markers; chosen fix -> emit section-level HTML comments before each metadata group during social head rendering; why this option -> keeps wrapper templates unchanged and centralizes formatting rules in one renderer used by default templates; evidence -> built output contains all three comments in rendered page head (`website-example/_public/playground/introduction/index.html`). Commands/tests: `bun run build website-example`; `grep -n "Canonical metadata\\|Facebook metadata\\|Twitter metadata" website-example/_public/playground/introduction/index.html`.
- 2026-02-12 18h55m17s — Added an explicit `<!-- Icons -->` comment before `iconsHead` injection in default wrappers (`templates/wrapper/wrapper.hbs`, `website-example/_templates/wrapper/wrapper.hbs`) and rebuilt to validate. Why this way: observed issue -> user requested a readable HTML section marker for icon metadata similar to the social metadata grouping; root cause -> favicon/app icon tags were injected without a dedicated visual section marker in wrapper head templates; chosen fix -> add a fixed wrapper-level comment immediately before `{{{iconsHead}}}`; why this option -> minimal, deterministic, and keeps icon generation logic unchanged while improving generated-head readability; evidence -> generated pages now include the Icons section marker before icon tags (e.g. `website-example/_public/playground/introduction/index.html`). Commands/tests: `bun run build website-example`; `grep -n "Icons\\|Canonical metadata\\|Facebook metadata\\|Twitter metadata" website-example/_public/playground/introduction/index.html`.
- 2026-02-12 18h57m48s — Adjusted Icons comment placement after user feedback: removed wrapper-level `<!-- Icons -->` comments and moved the marker into the icons injection pipeline (`src/core/build/icons.ts`), so it is emitted by `iconsHead` itself. Why this way: observed issue -> user requested the comment to come from the icon injection code path (not wrapper templates); root cause -> previous implementation placed the marker in wrapper templates, which did not satisfy the requested ownership/placement; chosen fix -> prepend `<!-- Icons -->` in generated `headHtml` inside `buildIcons`, then remove wrapper comments; why this option -> keeps wrappers clean and ensures the section marker is coupled to icon-tag emission wherever `iconsHead` is used; evidence -> build succeeds and rendered head keeps the Icons marker before icon tags. Commands/tests: `bun run build website-example`; `grep -n "Icons\\|apple-touch-icon\\|canonical\\|Facebook metadata\\|Twitter metadata" website-example/_public/playground/introduction/index.html`.
- 2026-02-12 19h05m12s — Refactored icons head HTML composition into `src/core/templates/icons-head.ts` and updated `src/core/build/icons.ts` to delegate markup generation while keeping file generation in build. Why this way: observed issue -> architecture mismatch (`build/icons.ts` mixed filesystem side effects and `<head>` markup assembly) made placement inconsistent with `social-head` rendering concerns; root cause -> icon tag construction was embedded directly in the build step; chosen fix -> extract pure head-tag rendering to a template-focused module and keep `build/icons.ts` responsible for icon artifact generation + pipeline orchestration only; why this option -> clarifies boundaries (build = produce assets, templates = compose HTML), lowers coupling, and avoids behavior changes; evidence -> build output still includes icons + social metadata sections and build succeeds end-to-end. Commands/tests: `bun run build website-example`; verify generated head in `website-example/_public/playground/introduction/index.html`.
- 2026-02-12 19h13m46s — Added a new `General metadata` section in `src/core/templates/social-head.ts` with `<meta name="author">` (from `site.author`) and `<meta name="description">` (from existing resolved/fallback description), emitted before canonical/OG/Twitter and never empty. Why this way: observed issue -> user requested standard non-social metadata tags in addition to social/canonical sections; root cause -> current head generation only emitted canonical + OG + Twitter groups; chosen fix -> extend the existing centralized social-head renderer with a dedicated general metadata group reusing established description fallback logic; why this option -> no extra required config, deterministic output ordering, and one place to maintain all head metadata rules; evidence -> generated pages include `General metadata`, `author`, and `description` before canonical/social tags. Commands/tests: `bun run src/cli.ts build website-example`; `bun run build website-example`; `grep -n "General metadata\\|name=\\\"author\\\"\\|name=\\\"description\\\"" website-example/_public/playground/introduction/index.html`.
- 2026-02-12 19h26m23s — Changed the default icons output directory from `_assets/icon` to `assets/icon` in `src/core/build/icons.ts` (no config required from users unless they override `site.icons.outputDir`). Why this way: observed issue -> user requested generated icons to land in `assets/icon` by default; root cause -> default constant used `_assets/icon`, causing default links/files under `/_assets/icon`; chosen fix -> update `DEFAULT_OUTPUT_DIR` to `assets/icon` while preserving explicit `icons.outputDir` overrides; why this option -> minimal behavioral change with backwards compatibility for users who already set a custom output dir; evidence -> generated icon files now land under `website-example/_public/assets/icon` and rendered tags use `/assets/icon/...` with no remaining `/_assets/icon` references. Commands/tests: `bun run build website-example`; `grep -n "/assets/icon\\|/_assets/icon" website-example/_public/playground/introduction/index.html`; `grep -R -n "/_assets/icon" website-example/_public`.
