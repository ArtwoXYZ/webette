# T2-S04 - Favicons & icons

Created: 2026-02-09 00h15m21s
Closed:
Acceptance: User

Status: Active

## Context
Les templates par defaut ne generent pas de favicons/icones et forcent l'utilisateur a tout gerer a la main.

## Rationale
Une generation d'icones via le moteur images + des tags par defaut rendent les sites utilisables sans override.

## Goal
Ajouter une config site pour generer les favicons/icones et les rendre dans les templates par defaut.

## In scope
- Ajouter des champs de config au niveau `site`:
  - `site.icons`: `{ source, outputDir?, themeColor?, themeColorLight?, themeColorDark?, tileColor?, injectHead?, colorScheme? }`
    - `outputDir` par defaut: `/_assets/icon/`.
    - `themeColor` par defaut: `#ffffff` (sert aussi pour `msapplication-TileColor` si `tileColor` absent).
    - `themeColorLight` / `themeColorDark` optionnels pour emettre deux balises `meta name="theme-color"` avec media queries.
    - `colorScheme` optionnel (ex: `"light dark"`) pour `meta name="color-scheme"`.
    - `injectHead` (defaut: true) permet de desactiver l'injection si l'utilisateur a deja ses tags dans un layout custom.
  - `site.icons.source` peut etre:
    - une string (image globale par defaut), ou
    - un objet avec variantes:
      - `source.default`, `source.lightmode`, `source.darkmode` (alias acceptes: `light`/`dark`)
      - `source.app` (app icons) : string ou objet `{ default, lightmode, darkmode }`
      - `source.apple`, `source.android`, `source.ms`, `source.favicon` : string ou objet `{ default, lightmode, darkmode }`
    - Regle de precedence (du plus specifique au plus general):
      - pour un groupe `X` (apple/android/ms/favicon/app) en mode `darkmode`:
        `source.X.darkmode` -> `source.app.darkmode` -> `source.darkmode` -> `source.X.default` -> `source.app.default` -> `source.default` -> `source` (string)
      - pour `lightmode`: meme ordre en remplacant `.darkmode` par `.lightmode`
      - si aucun mode light/dark fourni: utiliser la variante `default` la plus specifique disponible.
- Generer les fichiers suivants via le moteur images (si dispo), dans `/_assets/icon/`:
  - `apple-icon.png`, `apple-icon-precomposed.png`
  - `apple-icon-57x57.png`, `apple-icon-60x60.png`, `apple-icon-72x72.png`, `apple-icon-76x76.png`
  - `apple-icon-114x114.png`, `apple-icon-120x120.png`, `apple-icon-144x144.png`, `apple-icon-152x152.png`, `apple-icon-180x180.png`
  - `android-icon-36x36.png`, `android-icon-48x48.png`, `android-icon-72x72.png`, `android-icon-96x96.png`, `android-icon-144x144.png`, `android-icon-192x192.png`
  - `ms-icon-70x70.png`, `ms-icon-144x144.png`, `ms-icon-150x150.png`, `ms-icon-310x310.png`
  - `favicon-16x16.png`, `favicon-32x32.png`, `favicon-96x96.png`, `favicon.ico`
- si `source.favicon.lightmode` / `source.favicon.darkmode` (ou fallback light/dark global/app):
    - `favicon-16x16-light.png`, `favicon-32x32-light.png`, `favicon-96x96-light.png`
    - `favicon-16x16-dark.png`, `favicon-32x32-dark.png`, `favicon-96x96-dark.png`
  - `manifest.json`, `browserconfig.xml`
  - `favicon.ico` est genere en best-effort: si le moteur ne supporte pas l'export ico, warning + skip.
- Injecter les tags suivants dans le `<head>` des templates par defaut (si `icons.injectHead`):
  - Apple icons: `<link rel="apple-touch-icon" sizes="...">`
  - Favicons: `<link rel="icon" type="image/png" sizes="...">`
  - Favicons light/dark: `<link rel="icon" type="image/png" sizes="..." media="(prefers-color-scheme: light|dark)">` si une source light/dark est fournie (niveau favicon/app/global)
  - Manifest: `<link rel="manifest" href="/_assets/icon/manifest.json">`
  - MS: `<meta name="msapplication-TileColor">`, `<meta name="msapplication-TileImage">`, `<meta name="theme-color">`
  - Dark mode: `<meta name="theme-color" media="(prefers-color-scheme: light|dark)">` si `themeColorLight`/`themeColorDark`.
  - Color scheme: `<meta name="color-scheme">` si `icons.colorScheme`.
- Si le moteur images est indisponible: warning + pas de generation, et ne pas injecter les tags d'icones.
- Si l'image source n'est pas carree: la rendre carree en la centrant dans un canvas (padding transparent), puis appliquer les redimensionnements.
- Ne jamais modifier/supprimer les tags d'icones dans les templates custom utilisateur.

## Out of scope
- Headers sociaux (Open Graph / Twitter).
- Champs sociaux avances (locale, video, multiple images).
- Modification ou suppression des tags dans les templates custom utilisateur.

## Ready when
- Champs de config `site.icons` et sorties exactes listees.
- Priorites des valeurs (fallbacks) explicites.
- Done when testable.
- Acceptance owner defini.
- Rationale presente.

## Done when
- Les assets d'icones sont generes dans `/_assets/icon/` (si moteur images dispo).
- Les tags sont rendus dans les templates par defaut quand la config est presente et `injectHead` n'est pas desactive.
- Aucune injection d'icones si `injectHead` est false.
- Validation manuelle sur `website-example` (head genere + fichiers presents).

## Blocker

## Remaining work

## Reopen when

## To Document
- Config: `site.icons` dans `webette.config.ts` (niveau `site`).
  - Champs: `source`, `outputDir`, `injectHead`, `themeColor`, `themeColorLight`, `themeColorDark`, `tileColor`, `colorScheme`.
  - `outputDir` par defaut: `/_assets/icon/` (normalise sans slash de debut/fin). Base publique: `/${outputDir}`.
  - `injectHead` (defaut: true) controle l'injection dans le head des templates par defaut.
  - `themeColor` (defaut `#ffffff`) alimente `meta name="theme-color"` et sert de fallback a `tileColor`.
  - `themeColorLight` / `themeColorDark` generent deux `meta name="theme-color"` avec `prefers-color-scheme`.
  - `colorScheme` emet `meta name="color-scheme"` pour le rendu UI des navigateurs.
- `site.icons.source`:
  - string: image globale par defaut.
  - objet: `{ default?, lightmode?, darkmode?, app?, apple?, android?, ms?, favicon? }` (+ alias `light`/`dark`).
  - precedence (du plus specifique au plus general) pour un groupe `X`: `source.X.<mode>` -> `source.app.<mode>` -> `source.<mode>` -> `source.X.default` -> `source.app.default` -> `source.default` -> `source` (string).
  - light/dark: `favicon` genere aussi des fichiers `*-light.png` / `*-dark.png` et des tags `<link rel="icon">` avec media queries.
- Generation & integration:
  - Code: `src/core/build/icons.ts` (generation + head tags).
  - Appel: `src/core/build.ts` pendant le build.
  - Injection head: `templates/wrapper/wrapper.hbs` via `{{{iconsHead}}}`; si `injectHead=false`, `iconsHead` est vide.
  - Les templates custom ne sont jamais modifies automatiquement.
- Fichiers generes (selon sources disponibles): apple/android/ms/favicons + `manifest.json` + `browserconfig.xml`.
  - `manifest.json` est ecrit seulement si des icones android ont ete generees.
  - `browserconfig.xml` est ecrit seulement si des icones MS ont ete generees.
  - `favicon.ico` en best-effort: si `sharp` ne supporte pas l'ICO, warning + skip.
- Moteur images:
  - Utilise `sharp` si present; sinon warning `build.icons.sharpMissing` et aucune generation/tag.
  - Images non carrees: redimensionnement `fit=contain` avec fond transparent (padding).
  - Les outputs generes sont enregistres via `registerExpectedOutput` pour la gestion du pruning.

## Dev log
- 2026-02-09 01h02m20s - Generation des favicons/icones + injection head via `iconsHead` (config `site.icons` avec priorites lightmode/darkmode) + generation manifest/browserconfig; ajout tags dans wrapper par defaut. - Why: activer les favicons/icones sans override et centraliser la logique build. - Commands: `bun run build website-example` (validation avec config `site.icons` temporaire et wrapper exemple, puis revert). 
- 2026-02-09 01h09m09s - Fix des types stricts: `extractVariants` renvoie `undefined` au lieu de `null`. - Why: eviter les erreurs TypeScript sur `SourceGroups`. - Commands: none.
- 2026-02-09 01h12m32s - Validation avec `website-example/_templates/assets/icon.jpg` comme source; generation des icones + tags head verifies, puis revert config/test. - Why: confirmer le pipeline complet sur le site exemple. - Commands: `bun run build website-example`.
- 2026-02-09 02h06m05s - Ajout de commentaires concis dans `icons.ts` (normalisation config, resolution des sources, padding transparent, theme-color). - Why: clarifier le fonctionnement pour la maintenance. - Commands: none.
