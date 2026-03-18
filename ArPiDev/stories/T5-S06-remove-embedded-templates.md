# T5-S06 — Retirer les templates embarqués du tool

Created: 2026-03-17
Closed: 2026-03-18
Acceptance: User

Status: Done

## Goal

Supprimer complètement les templates embarqués du tool et toute la logique de fallback associée. Webette est un moteur : les sites apportent leurs propres templates. Si un site n'a pas de dossier templates, le build échoue avec un message clair. Aucune rétro-compatibilité ou béquille.

---

## Contexte / état actuel (recon)

### Ce qui est embarqué aujourd'hui

`templates/` à la racine du tool : 10 fichiers `.hbs` (wrapper, layouts, partials). Utilisés comme fallback silencieux quand un site n'a pas ses propres templates.

### `website-example` n'est pas impacté

`website-example/_templates/` contient déjà ses propres templates complets. Aucune migration nécessaire.

### Où `toolTemplatesRoot` est utilisé (recon complète)

| Fichier | Usage |
|---|---|
| `src/core/template.ts` | calcule `toolTemplatesRoot` via `fileURLToPath`, charge partials/layouts tool en premier, fallback wrapper/layout sur tool |
| `src/core/templates/resolve-file.ts` | résolution fichier-par-fichier avec fallback tool (`source: "site" \| "tool"`) |
| `src/core/scan/raw-scan.ts` | `listStructureRootRaw()` et `listRootIndexRaw()` utilisent `path.basename(toolTemplatesRoot)` pour **exclure le dossier templates du scan** |
| `src/core/scan/index.ts` | passe `templatesRoot` comme `toolTemplatesRoot` aux deux fonctions ci-dessus |
| `src/core/build/render.ts` | appelle `resolveTemplatesRoots()` |
| `src/core/serve.ts` | appelle `resolveTemplatesRoots()` |
| `src/core/build.ts` | appelle `createTemplateRenderer()` |

### Point d'attention : exclusion du scan

`raw-scan.ts` exclut le dossier templates du scan des collections en lisant `path.basename(toolTemplatesRoot)`. Après suppression du concept tool, cette exclusion doit lire le nom du dossier templates **du site** (depuis `site.config.templates` ou la valeur par défaut `"templates"`).

---

## In scope

- **Supprimer `templates/`** à la racine du tool (10 fichiers `.hbs`).
- **`src/core/template.ts`** :
  - Supprimer tout ce qui touche à `toolRoot`, `toolTemplatesRoot`, `source`, `effectiveRoot`.
  - `TemplatesRoots` : ne garder que `siteTemplatesRoot` et `hasSiteTemplates` (+ ce qui est encore utile aux appelants).
  - `resolveTemplatesRoots()` : simplifier — calcule `siteTemplatesRoot` uniquement ; si le dossier n'existe pas → throw erreur claire avec le chemin attendu.
  - `createTemplateRenderer()` : supprimer le double chargement tool + site. Charger uniquement les partials/layouts du site. Résolution wrapper/layout : site uniquement.
  - Supprimer l'import `fileURLToPath` s'il n'est plus utilisé.
- **`src/core/templates/resolve-file.ts`** :
  - `ResolvedTemplateFile` : supprimer `source`.
  - `TemplateFileResolver` options : supprimer `toolTemplatesRoot`.
  - `triedPaths()`, `resolve()` : site uniquement.
  - `logResolved()` : simplifier le calcul de `logBase` (toujours `rootDir`).
- **`src/core/scan/raw-scan.ts`** :
  - `listStructureRootRaw()` et `listRootIndexRaw()` : renommer le param `toolTemplatesRoot` → `siteTemplatesRoot` ; logique d'exclusion inchangée.
- **`src/core/scan/index.ts`** : mettre à jour l'appel pour passer la valeur correcte (`siteTemplatesRoot` depuis `site.config.templates` ou la valeur par défaut).
- **`docs/templates.md`** : supprimer toutes les mentions du fallback tool, simplifier la section "Where templates come from". Ajouter : si aucun dossier templates trouvé → erreur de build avec le chemin attendu.
- **`docs/webette.tool.md`** : supprimer toute mention des templates embarqués.

## Out of scope

- Changer le format `webette.config.ts` côté utilisateur.
- Modifier `WebetteEnv.templates` dans `env.ts` — `templates.root` et `templates.default.*` restent comme valeurs de convention (noms par défaut que les sites peuvent surcharger).
- Toucher à `website-example` (déjà autonome).
- Modifier le Web UI.

---

## Done when

- [x] `templates/` (racine tool) supprimé.
- [x] `TemplatesRoots` ne contient plus `toolTemplatesRoot`, `toolRoot`, `source`, `effectiveRoot`.
- [x] `resolveTemplatesRoots()` ne calcule plus de `toolTemplatesRoot` ; throw erreur claire si `siteTemplatesRoot` absent.
- [x] `createTemplateRenderer()` ne charge plus de partials/layouts depuis le tool.
- [x] `resolve-file.ts` : plus de `source`, plus de fallback tool.
- [x] `raw-scan.ts` : param renommé `siteTemplatesRoot`, comportement d'exclusion identique.
- [x] `bunx tsc --noEmit` ✅
- [x] `bun run build -v website-example` ✅ — rendu identique.
- [x] Test manuel sur un site sans dossier templates → erreur claire avec le chemin attendu.

---

## Execution brief

1. **Supprimer `templates/`** (racine tool) — 10 fichiers `.hbs`.
2. **`src/core/template.ts`** :
   - Retirer `toolRoot`, `toolTemplatesRoot`, `source`, `effectiveRoot` de `TemplatesRoots`.
   - `resolveTemplatesRoots()` : calculer `siteTemplatesRoot` uniquement → si `!hasSiteTemplates` → `throw new Error("webette: no templates folder found at <path>")`.
   - `createTemplateRenderer()` : supprimer les deux appels `registerLayouts/registerPartials` sur `toolTemplatesRoot` ; supprimer les candidats tool dans `wrapperCandidates` et `layoutCandidates` ; simplifier les logs.
3. **`src/core/templates/resolve-file.ts`** :
   - Retirer `source` de `ResolvedTemplateFile`.
   - Retirer `toolTemplatesRoot` des options et de `triedPaths`.
   - `resolve()` : site uniquement.
   - `logResolved()` : `logBase` = toujours `rootDir`.
4. **`src/core/scan/raw-scan.ts`** : renommer `toolTemplatesRoot` → `siteTemplatesRoot` dans les deux fonctions et leurs signatures.
5. **`src/core/scan/index.ts`** : passer la valeur correcte (depuis `site.config.templates` ou la valeur par défaut).
6. **Docs** : `docs/templates.md` + `docs/webette.tool.md`.

## Checks to run

- `bunx tsc --noEmit` — aucune erreur TypeScript
- `bun run build -v website-example` — build OK, rendu identique

## Evidence expected

- Build `website-example` passe sans erreur.
- Test manuel sur un site sans dossier templates : message d'erreur clair avec le chemin attendu.
- `tsc` propre.

---

## Commit proposal

Title: `refactor(templates): remove tool embedded templates and fallback logic`

Description:
- Delete `templates/` from tool root; sites must provide their own templates folder
- Simplify `template.ts` and `resolve-file.ts` to site-only resolution; throw a clear error when no site templates folder is found
- Rename `toolTemplatesRoot` → `siteTemplatesRoot` in `raw-scan.ts` scan exclusion logic
- Update `docs/templates.md` to reflect the engine-only model

Scope(s):
- `templates`

Why these scopes:
- All changes are within template resolution, the embedded template files, and their documentation; no impact on content model or build pipeline logic

---

## Pilot exchange

- 2026-03-17 — Pilot — Story discutée et décidée avec l'utilisateur : webette est un moteur, les sites apportent leurs templates. Pas de rétro-compatibilité. `website-example` déjà autonome (`_templates/` complet). Recon complète sur les 7 sites d'usage de `toolTemplatesRoot` — point d'attention : `raw-scan.ts` utilise le nom du dossier templates pour l'exclure du scan des collections (simple renommage, logique inchangée).

## Dev log

- 2026-03-18 — Dev — Exécution complète.
  - `templates/` (10 fichiers .hbs) supprimé.
  - `template.ts` : `TemplatesRoots` réduit à `{ siteTemplatesRoot, hasSiteTemplates }` ; `resolveTemplatesRoots()` throw `"webette: no templates folder found at <path>"` si absent ; `createTemplateRenderer()` charge uniquement le site ; import `fileURLToPath` retiré ; logs simplifiés (sans `source`).
  - `resolve-file.ts` : `ResolvedTemplateFile.source` retiré ; `toolTemplatesRoot` retiré de `triedPaths` et `resolve` ; `logResolved` utilise toujours `rootDir` comme base.
  - `raw-scan.ts` : param `toolTemplatesRoot` → `siteTemplatesRoot` dans `listStructureRootRaw` et `listRootIndexRaw`, logique d'exclusion inchangée.
  - `scan/index.ts` : passe `resolvedSiteTemplatesRoot` (depuis `resolveTemplatesConfig`) aux deux fonctions de scan.
  - `serve.ts` : `effectiveRoot` → `siteTemplatesRoot` pour le watch.
  - `locales/{fr,en}/logs.json` : `template.resolved` sans `{source}` ; messages de "fallback tool" mis à jour pour refléter le nouveau comportement.
  - `docs/templates.md` : section "Where templates come from" et "Default wrapper + layout" mises à jour — plus de mention de fallback tool.
  - `bunx tsc --noEmit` ✅ | `bun run build website-example` ✅ (rendu identique).
  - Note : les warnings pré-build dans `build.ts` (`template.siteRootMissing`, etc.) sont hors scope de cette story — leurs messages de locale ont été corrigés pour ne plus mentionner de fallback.
- 2026-03-18 — Dev — Correction post-test : la clé `error.unexpected` manquait dans les deux locales, l'erreur était donc affichée sans son message. Ajout de `"error.unexpected": "Erreur inattendue : {error}"` (fr) et `"Unexpected error: {error}"` (en). Test confirmé : `webette: no templates folder found at <path>` s'affiche correctement.
- 2026-03-18 — Dev — Correction lisibilité CLI : l'erreur `error.unexpected` wrappait le message avec le préfixe "Error:" et perdait la localisation. Ajout de `WebetteError` (marqueur "déjà loggé") dans `template.ts` ; `resolveTemplatesRoots` logue `template.noTemplatesFolder` via le logger puis throw `WebetteError` ; `cli.ts` ignore le re-log pour `WebetteError`. Nouvelle clé `template.noTemplatesFolder` ajoutée dans les deux locales. Résultat : `Dossier de templates introuvable : <path>` — une ligne, traduite, sans préfixe "Error:".
- 2026-03-18 — User — Validation. Story fermée.
