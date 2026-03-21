# T6-S08 — Plugin loader : consolider les chemins de chargement, robustifier le parsing README

Created: 2026-03-21 16h20m00s
Closed: 2026-03-21 16h40m00s
Acceptance: User

Status: Done, Validated

## Rationale
Le README.md est rendu obligatoire pour chaque plugin. Cela stabilise la structure des plugins et rend visible les metadata essentielles (version, licence, auteur). C'est aussi le contrat de distribution : le README définit comment créer et distribuer un plugin webette pour la beta. Un plugin sans README est ignoré avec un warning explicite.

## Goal
Unifier les deux chemins de chargement de plugins (pluginsDir / pluginPaths) en un pipeline unique, rendre le README obligatoire, et robustifier le parsing metadata.

## In scope
- Introduire des types locaux (`PluginDescriptor`, `PluginMetadata`) pour remplacer les `any`
- Robustifier `parsePluginMetadata` : regex case-insensitive, logger au lieu de catch silencieux
- README obligatoire : un plugin sans README.md est ignoré avec un warning
- Ajouter `resolveDescriptorsFromPaths` pour le chemin array (avec vérification README)
- Réécrire `loadPlugins` comme un pipeline unifié (descripteurs → import → metadata → LoadedPlugin)
- Ajouter `resolvePluginSources` pour simplifier la discrimination de config dans `build/plugins.ts`
- Ajouter logger à `importPlugin`, `parsePluginMetadata`, `scanPluginsDirectory`
- Valider les champs obligatoires du README (name, version, author, license) — plugin ignoré si incomplet
- Ajouter les clés i18n pour les nouveaux warnings

## Out of scope
- Modifier le système de hooks (`runner.ts`, `types.ts`)
- Changer les formats de config supportés dans `webette.config.ts`
- Ajouter des tests automatisés

## Execution brief
1. Ajouter `PluginDescriptor` et `PluginMetadata` interfaces dans `loader.ts`
2. Robustifier `parsePluginMetadata` : type strict, regex `i`, logger
3. Retyper `scanPluginsDirectory` avec `PluginDescriptor[]`, README obligatoire (warn + skip si absent), logger
4. Créer `resolveDescriptorsFromPaths` pour le chemin array
5. Réécrire `loadPlugins` en pipeline unifié avec logger
6. Ajouter logger à `importPlugin`
7. Créer `resolvePluginSources` exporté
8. Simplifier le call site dans `build/plugins.ts`
9. Ajouter les clés i18n

## Files/areas likely involved
- `src/plugins/loader.ts` — fichier principal
- `src/core/build/plugins.ts` — call site
- `locales/en/logs.json` + `locales/fr/logs.json` — clés i18n

## Checks to run
- `bun run build website-example` — les 3 plugins doivent se charger avec metadata
- `bun run serve -v website-example` — le site doit fonctionner

## Evidence expected
- Build clean, plugins chargés avec metadata
- Logs de chargement visibles
- Plus de `any` dans `loader.ts`
- Plus de chaîne de casts dans `build/plugins.ts`

## Done when
- Pipeline unifié dans `loadPlugins` (un seul loop d'enrichissement)
- `any` supprimés de `loader.ts`
- `parsePluginMetadata` case-insensitive avec logger
- README obligatoire : plugins sans README ignorés avec warning
- Champs obligatoires validés (name, version, author, license) : plugin ignoré si incomplet
- `build/plugins.ts` utilise `resolvePluginSources` sans casts
- Clés i18n ajoutées
- Pas de régression sur `website-example`

## Commit proposal
Title: `refactor(plugins): consolidate loader paths and robustify README parsing`
Description:
- Unify pluginsDir and pluginPaths loading into a single descriptor-based pipeline.
- Replace any types with PluginDescriptor and PluginMetadata interfaces.
- Make README metadata parsing case-insensitive and add logger warnings on failures.
- Make README.md mandatory for plugins (warn and skip if missing).
- Validate required metadata fields (name, version, author, license) and skip plugins with incomplete metadata.
- Add resolvePluginSources helper to simplify config discrimination in build/plugins.ts.
Scope(s):
- plugins
Why these scopes:
- All changes are confined to the plugin loading system and its call site.

## Pilot exchange
- 2026-03-21 16h30m00s — User -> Pilot — README doit être obligatoire pour les plugins. Rationale : stabiliser la structure des plugins, rendre les metadata (version, licence) visibles, et poser le contrat de distribution pour la beta (comment créer/distribuer un plugin).

## Dev log
- 2026-03-21 16h25m00s — Change: Réécriture complète de `src/plugins/loader.ts` en pipeline unifié
  Why this way:
  - Observed issue: deux chemins de chargement divergents (pluginsDir vs pluginPaths), `any` types, regex case-sensitive, erreurs silencieuses, chaîne de casts complexe dans le call site.
  - Root cause: le chemin array (legacy) avait été ajouté sans aligner sur le chemin directory (plus récent), et les types n'avaient pas été resserrés.
  - Chosen fix:
    - Introduit `PluginDescriptor` et `PluginMetadata` interfaces (remplace tous les `any`).
    - Les deux chemins produisent des `PluginDescriptor[]`, un seul loop unifié les importe et enrichit.
    - README rendu obligatoire (décision user) : plugins sans README ignorés avec warning `build.pluginMissingReadme`.
    - `parsePluginMetadata` : regex case-insensitive (flag `i`), logger sur erreur au lieu de catch silencieux.
    - `scanPluginsDirectory` : retypage `PluginDescriptor[]`, warning si README absent, warning si erreur lecture dir.
    - `importPlugin` : logger sur échec d'import et export invalide.
    - Ajout de `resolvePluginSources` pour simplifier la discrimination config dans `build/plugins.ts` (supprime la chaîne de casts).
  - Tradeoff: `resolveDescriptorsFromPaths` fait un `fs.access` par plugin pour chercher le README — acceptable car le nombre de plugins est petit.
  - Evidence: `bun run build website-example` → build clean, 3 plugins chargés (demo, toc, test-generate-pages). `bun run serve -v website-example` → site fonctionnel, 0 erreur console.
  Commands/tests:
    - `bun run build website-example` — ✅ Build terminé
    - Preview server — ✅ Site OK, 0 erreur console

- 2026-03-21 16h28m00s — Change: Ajout des clés i18n
  Why this way:
  - Observed issue: les nouveaux warnings du loader n'avaient pas de traduction.
  - Chosen fix: ajout de 5 clés dans `locales/en/logs.json` et `locales/fr/logs.json` : `build.pluginImportFailed`, `build.pluginImportInvalidExport`, `build.pluginReadmeParseError`, `build.pluginScanDirError`, `build.pluginMissingReadme`.
  - Evidence: build clean après ajout.

- 2026-03-21 16h32m00s — Change: Validation des champs obligatoires du README
  Why this way:
  - Observed issue: le plugin `test-generate-pages` avait un README sans les champs metadata attendus (`**Name**:`, `**Author**:`, etc.) et se chargeait quand même silencieusement.
  - Root cause: `parsePluginMetadata` retournait `{}` sans erreur, et le pipeline continuait avec des metadata vides.
  - Chosen fix:
    - Ajout de `REQUIRED_METADATA_FIELDS` = `["name", "version", "author", "license"]`.
    - Après parsing, vérification que tous les champs requis sont présents. Si manquants → warning `build.pluginMetadataIncomplete` avec la liste des champs manquants + plugin ignoré.
    - Corrigé le README de `test-generate-pages` pour ajouter l'entête metadata manquante.
    - Ajout de la clé i18n `build.pluginMetadataIncomplete` (en + fr).
  - Tradeoff: les 4 champs sont tous obligatoires — c'est le contrat de distribution pour la beta.
  - Evidence: `bun run build website-example` → 3 plugins chargés, build clean.
  Commands/tests: `bun run build website-example` — ✅ Build terminé
