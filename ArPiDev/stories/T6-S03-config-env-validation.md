# T6-S03 — Config env validation

Created: 2026-03-19 00h00m00s
Closed: 2026-03-19
Acceptance: User

Status: Done, Validated

## Goal
Remplacer tous les silences de chargement/validation de config par des messages explicites passant par le logger Webette — poser les bases d'un CLI propre et cohérent.

## Context

### Vision CLI
Cette story s'inscrit dans une direction plus large : tout message destiné à l'utilisateur doit passer par le logger Webette (scope structuré, i18n, niveaux, persistance JSONL). Les `console.warn` et `catch {}` nus sont des dettes à éliminer.

### Problèmes actuels identifiés

**`src/config/env.ts` (webette.tool.ts)**
- `mergeEnv` : les valeurs invalides (`overwrite: "blah"`, `level: "verbose"`, port non-numérique…) sont silencieusement ignorées — la valeur par défaut est utilisée sans aucun message.
- `getEnv` : en cas d'échec de chargement du fichier, un seul `console.warn` est émis (ligne 236) — hors logger, non-i18n, non-persisté.

**`src/core/config.ts` (webette.config.ts)**
- `loadConfigFile` : le bloc `catch {}` final avale toutes les erreurs (syntaxe invalide, module introuvable) sans aucun log.
- `loadConfigFile` : quand `plugins` est présent mais de format non reconnu (ex. `plugins: "my-plugin"`), il est silencieusement droppé.
- `createSite` : les defaults appliqués (`title`, `lang`) ne génèrent aucun message quand le champ est absent.

### Contrainte : chicken-and-egg pour `env.ts`
Le logger est construit dans `cli.ts` via `createProjectLogger()`, qui appelle lui-même `getEnv()`. Il est donc impossible de logger les warnings de l'env au moment du chargement — le logger n'existe pas encore.

**Solution retenue** : `getEnv()` retourne `{ env: WebetteEnv, warnings: ConfigWarning[] }`. Le CLI crée le logger à partir de l'env valide, puis flushes immédiatement les warnings à travers le logger. Zéro `console.warn` dans le chemin nominal.

Pour `createSite` c'est plus simple : le logger existe déjà quand `build()` l'appelle — on le passe en paramètre.

## In scope
- Changer la signature de `getEnv()` pour retourner `{ env, warnings }` (type `ConfigWarning` à définir).
- Émettre un `ConfigWarning` par valeur invalide détectée dans `mergeEnv` (logLevel, locale, overwritePolicy, champs numériques).
- Émettre un `ConfigWarning` en cas d'échec de chargement de `webette.tool.ts`.
- Adapter `cli.ts` : logger les warnings de l'env via `logger.warn(...)` juste après la création du logger.
- Adapter `createProjectLogger` dans `logger.ts` si besoin (il appelle `getEnv()` en interne — aligner avec la nouvelle signature).
- Ajouter `logger: Logger` en paramètre de `createSite()` dans `src/core/config.ts`.
- Logger via `logger.warn(...)` : échec de chargement de `webette.config.ts`, `plugins` de format non reconnu.
- Ajouter toutes les clés i18n nécessaires dans `locales/en/logs.json` et `locales/fr/logs.json`.
- Vérifier que les call sites de `createSite()` dans `build.ts` et `serve.ts` passent bien le logger.

## Out of scope
- Validation profonde des sections `images`, `audio`, `video`, `markdown`, `sorting`, `collections` (hors périmètre beta).
- Warning quand `title` ou `lang` est absent du site config (cosmétique, pas un risque).
- Refonte du format de config ou migration breaking.
- Tests automatisés.
- Refonte du CLI elle-même (scope futur).

## Files / areas involved
- `src/config/env.ts` — signature `getEnv`, `mergeEnv`, suppression du `console.warn`
- `src/core/config.ts` — `loadConfigFile`, `createSite` (+ param logger)
- `src/cli.ts` — flush des warnings env, passage du logger à createSite (indirect via build/serve)
- `src/logging/logger.ts` — `createProjectLogger` (aligner si nécessaire)
- `src/core/build.ts` — call site de `createSite` (passer le logger)
- `src/core/serve.ts` — call site de `createSite` si présent
- `locales/en/logs.json` et `locales/fr/logs.json` — nouvelles clés

## Clés i18n à ajouter (proposition)
```
"config.tool.loadFailed"       → "Failed to load tool config at {path}: {error}"
"config.tool.invalidValue"     → "Tool config: invalid value for '{field}': {value}. Expected: {expected}. Using default: {default}."
"config.site.loadFailed"       → "Failed to load site config at {path}: {error}. Using empty config."
"config.site.pluginsInvalidFormat" → "Site config: 'plugins' has an unrecognized format (got {type}). Expected: string[] or { dir: string }. Ignored."
```
(+ traductions FR)

## Execution brief
1. Dans `src/config/env.ts` : définir `ConfigWarning { key: string; params: Record<string, unknown> }`, modifier `getEnv()` pour retourner `{ env: WebetteEnv; warnings: ConfigWarning[] }`, collecter les avertissements dans `mergeEnv` au lieu de les silencier, remplacer le `console.warn` de chargement par un warning collecté.
2. Dans `src/logging/logger.ts` : adapter `createProjectLogger` (qui appelle `getEnv()`) pour extraire uniquement l'env — retourner également les warnings ou les ignorer selon l'usage (le CLI flushe lui-même).
3. Dans `src/cli.ts` : après `createProjectLogger`, récupérer les warnings de l'env et appeler `logger.warn(w.key, w.params)` pour chacun.
4. Dans `src/core/config.ts` : ajouter `logger: Logger` en paramètre de `createSite()`, logger les erreurs de `loadConfigFile` et les formats `plugins` invalides via `logger.warn(...)`.
5. Dans `src/core/build.ts` (et `serve.ts`) : passer `logger` à `createSite`.
6. Ajouter les clés i18n dans les deux fichiers de locales.
7. Vérifier que le build normal sur `website-example` ne produit aucun warning nouveau.

## Checks to run
- `bun run build -v website-example` — build propre, aucun warning config.
- Ajouter temporairement `overwrite: "blah"` dans `webette.tool.ts`, relancer `bun run build -v website-example` → warning logger visible (jaune TTY, scope `webette.cli.build`, clé `config.tool.invalidValue`).
- Ajouter temporairement `plugins: "my-plugin"` dans `website-example/webette.config.ts`, relancer `bun run build -v website-example` → warning visible.
- Rendre `webette.tool.ts` syntaxiquement invalide (ex. supprimer un `}`), relancer → warning `config.tool.loadFailed` visible, pas de crash silencieux.

## Evidence expected
- Capture console montrant les warnings avec scope, niveau et message i18n pour chaque cas invalide testé.
- Build normal (`website-example`) sans warnings additionnels.
- Aucun `console.warn` nu résiduel dans `env.ts` pour les chemins couverts.

## Done when
- `getEnv()` retourne `{ env, warnings }` — plus aucun `console.warn` nu dans `env.ts`.
- `createSite()` accepte un `logger` en paramètre et l'utilise pour les erreurs de chargement et les formats invalides.
- Toutes les clés i18n ajoutées en EN et FR.
- Build normal inchangé sur `website-example`.
- Les 4 scénarios de check produisent un warning logger lisible.

## Commit proposal
Title: `refactor(core): route config warnings through the logger`
Description:
- Return structured warnings from `getEnv()` instead of using `console.warn`; flush through logger in CLI after boot.
- Pass logger to `createSite()` and log site config load failures and unrecognized `plugins` format.
- Add i18n keys for all new config warning messages (EN + FR).
Scope(s):
- `core`
Why these scopes:
- Config loading is internal infrastructure; `core` covers both `src/config/` and `src/core/config.ts` per SPEC scope strategy. CLI adaptation is secondary impact.

## Pilot exchange

## Dev log
- 2026-03-19 21h46m00s — Change: implémentation complète T6-S03
  Why this way:
  - Observed issue: 4 points de silence dans le chargement de config — valeurs invalides sans avertissement, `catch {}` nu, `console.warn` hors logger.
  - Root cause: `mergeEnv` ignorait silencieusement les valeurs invalides ; `loadConfigFile` avait un `catch {}` vide ; `getEnv` utilisait `console.warn` directement.
  - Chosen fix:
    - `getEnv()` retourne désormais `{ env, warnings: ConfigWarning[] }`. Les warnings sont collectés dans `mergeEnv` (nouveau param) pour `logLevel`, `locale`, `overwritePolicy`, champs numériques. L'échec de chargement est un warning collecté (plus de `console.warn`).
    - `createProjectLogger` accepte un `precomputedEnv` optionnel pour éviter un double appel à `getEnv()`. Corrige aussi un bug préexistant : les lignes 165/173 utilisaient `env` (module-level = defaultEnv) au lieu de l'env chargé.
    - `cli.ts` : charge `getEnv()` en premier, passe l'env au logger, flushe les warnings via `logger.warn()`.
    - `createSite()` reçoit un `logger: Logger` ; `loadConfigFile` l'utilise pour les erreurs de chargement et le format `plugins` non reconnu.
    - Tous les call sites de `getEnv()` (`build.ts`, `serve.ts`, `scan/index.ts`) déstructurent `{ env: toolEnv }`.
    - 4 clés i18n ajoutées en EN et FR.
  - Tradeoff: les autres callers de `getEnv()` (`build`, `serve`, `scan`) ignorent les warnings — acceptable car le CLI les flushes une fois au boot. Pas de double-warning.
  - Note: quand `webette.tool.ts` est invalide, le warning `config.tool.loadFailed` s'affiche en anglais (locale par défaut) — attendu, puisque la locale configurée provient du même fichier qui a échoué.
  Commands/tests:
  - `bun run build -v website-example` → ✅ Build propre, aucun warning config.
  - `overwrite: 'blah'` dans tool config → warning `config.tool.invalidValue` visible (jaune, scope `webette.cli.build`).
  - `plugins: 'my-plugin'` dans site config → warning `config.site.pluginsInvalidFormat` visible (scope `webette.cli.build.build`).
  - `webette.tool.ts` syntaxiquement invalide → warning `config.tool.loadFailed` visible, pas de crash.
