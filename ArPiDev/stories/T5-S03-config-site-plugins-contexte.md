# T5-S03 — Passer la config site aux plugins via le contexte

**Story ID**: T5-S03
**Parent**: T5 — Plugins & configuration (beta)
**Status**: Done, Validated
**Closed**: 2026-03-10
**Active**: no
**Created**: 2026-03-10

---

## Goal

Faire en sorte que chaque plugin reçoive proprement la configuration du site via le contexte, sans avoir à lire le fichier de config manuellement.

Quatre champs cibles dans `PluginContext` :
- `webetteConfig` — config complète (toutes les sections de `webette.config.ts`)
- `siteConfig` — section `site` uniquement
- `pluginConfig` — section `pluginConfig` (map `pluginId → config`)
- `thisPluginConfig` — config de **ce** plugin spécifiquement

---

## Contexte / état actuel (recon)

1. **Bug critique** : `pluginConfig` est présent dans `webette.config.ts` mais n'est **jamais parsé** dans `src/core/config.ts`. `site.config.pluginConfig` est toujours `undefined`. Le plugin TOC contourne ce bug en lisant le fichier config à la main avec des regex dans `loadConfig()`.

2. **`ctx.env.pluginConfig`** utilisé dans `extendTemplates` du TOC : `ctx.env` est l'env outil (pas la config utilisateur) — accès incorrect.

3. **`webetteConfig` non stocké** : les sections `images/audio/video/markdown/sorting` sont mergées dans `site.site` lors du `createSite()`. Pour reconstruire le config complet, il faut stocker les sections brutes avant le merge.

4. **`thisPluginConfig`** existe implicitement dans `runner.ts` (`ctx.pluginConfig?.[plugin.pluginId]`) mais n'est pas exposé comme champ nommé dans `PluginContext`.

---

## In scope

- Ajouter le parsing de `pluginConfig` dans `src/core/config.ts` (extraction + stockage dans `site.config`)
- Stocker le config complet brut dans `site.config.rawConfig` (avant merge des sections dans `site.site`)
- Mettre à jour `PluginContext` (`src/plugins/types.ts`) avec les quatre champs : `webetteConfig`, `siteConfig`, `pluginConfig`, `thisPluginConfig`
- Câbler ces champs dans `build.ts` (`pluginContextBase`) et `runner.ts` (par plugin)
- Mettre à jour le plugin TOC (`website-example/_plugins/toc/toc.js`) :
  - Supprimer `loadConfig()` et son import `readFile`
  - Utiliser `ctx.thisPluginConfig` dans `transformEntry`
  - Corriger `extendTemplates` : utiliser `ctx.thisPluginConfig` au lieu de `ctx.env.pluginConfig?.toc`

## Out of scope

- Validation du schéma de `pluginConfig`
- Changer le format ou le nom `pluginConfig` dans `webette.config.ts`
- Migrer le plugin demo (il n'utilise pas de config spécifique)
- Internationalisation ou doc publique

---

## Done when

- [ ] `pluginConfig` est parsé depuis `webette.config.ts` et disponible dans `site.config.pluginConfig`
- [ ] `site.config.rawConfig` stocke les sections brutes (avant merge) pour reconstruire `webetteConfig`
- [ ] `PluginContext` expose `webetteConfig`, `siteConfig`, `pluginConfig`, `thisPluginConfig`
- [ ] `pluginContextBase` dans `build.ts` est correctement câblé pour les quatre champs
- [ ] `runner.ts` popule `thisPluginConfig` pour chaque plugin à partir de `pluginConfig[plugin.pluginId]`
- [ ] Le plugin TOC supprime `loadConfig()` et utilise `ctx.thisPluginConfig`
- [ ] `extendTemplates` du TOC utilise `ctx.thisPluginConfig` (plus `ctx.env.pluginConfig`)
- [ ] `bun run build website-example` passe sans erreurs ni warnings TypeScript
- [ ] Le plugin TOC se comporte identiquement avant/après (forAllEntries, minLevel, maxLevel lus depuis la vraie config)

---

## Execution brief

### Étape 1 — `src/core/config.ts`

a. Ajouter `pluginConfig?: Record<string, unknown>` à `WebetteConfigFile`.

b. Dans `loadConfigFile()`, extraire `pluginConfig` depuis `raw` :
```ts
const pluginConfig =
  raw.pluginConfig && typeof raw.pluginConfig === 'object' && !Array.isArray(raw.pluginConfig)
    ? { ...raw.pluginConfig as Record<string, unknown> }
    : undefined;
```

c. Stocker les sections brutes dans `rawConfig` **avant** le merge dans `siteSection` :
```ts
const rawConfig: Record<string, unknown> = {
  site: config.site,
  collections: config.collections,
  templates: config.templates,
  images: config.images,
  audio: config.audio,
  video: config.video,
  markdown: config.markdown,
  sorting: config.sorting,
  plugins: config.plugins,
  pluginConfig: config.pluginConfig,
};
```

d. Dans `createSite()`, ajouter à `site.config` :
```ts
config: {
  collections: collectionsConfig,
  ...(plugins ? { plugins } : {}),
  ...(templatesConfig ? { templates: templatesConfig } : {}),
  ...(config.pluginConfig ? { pluginConfig: config.pluginConfig } : {}),
  rawConfig,
},
```

### Étape 2 — `src/core/model.ts`

Ajouter `rawConfig` à `Site.config` :
```ts
config?: {
  collections?: Record<string, unknown>;
  plugins?: string[] | { dir: string };
  templates?: Record<string, unknown>;
  pluginConfig?: Record<string, unknown>;
  rawConfig?: Record<string, unknown>; // ← new
};
```

### Étape 3 — `src/plugins/types.ts`

Ajouter les deux nouveaux champs à `PluginContext` :
```ts
webetteConfig?: Record<string, unknown>; // Full webette.config.ts
thisPluginConfig?: Record<string, unknown>; // Config of this plugin only
```
(Garder `siteConfig` et `pluginConfig` existants.)

### Étape 4 — `src/core/build.ts`

Mettre à jour `pluginContextBase` :
```ts
siteConfig: site.site,
pluginConfig: site.config?.pluginConfig,
webetteConfig: site.config?.rawConfig,
// thisPluginConfig est undefined ici, sera défini par plugin dans runner.ts
```

### Étape 5 — `src/plugins/runner.ts`

Pour chaque hook qui crée un `pluginCtx`, ajouter :
```ts
thisPluginConfig: ctx.pluginConfig?.[plugin.pluginId] as Record<string, unknown> | undefined,
```
(L'ancienne ligne `pluginConfig: ctx.pluginConfig?.[plugin.pluginId] as ...` dans les `pluginCtx` de chaque hook est à **supprimer** et remplacer par `thisPluginConfig`. `pluginConfig` dans le contexte reste la **map complète** héritée du parent — c'est le design voulu, pas une contrainte de compat.)

> Attention : dans le `pluginCtx` de chaque hook, `pluginConfig` doit rester la **map complète** (pour accès cross-plugin si besoin), et `thisPluginConfig` est le slice pour ce plugin.

### Étape 6 — `website-example/_plugins/toc/toc.js`

a. Supprimer `loadConfig()` et ses imports (`readFile` utilisé uniquement par elle — vérifier si `readFile` est encore utilisé ailleurs dans le fichier).

b. Dans `transformEntry` :
```js
async transformEntry(entry, ctx) {
  const config = ctx.thisPluginConfig || {};
  const forAllEntries = config.forAllEntries === true;
  // ...reste inchangé
}
```

c. Dans `extendTemplates` :
```js
async extendTemplates(handlebars, ctx) {
  let config = ctx.thisPluginConfig || {};
  // ...supprimer la ligne : let config = ctx.env.pluginConfig?.toc || {};
}
```

---

## Files/areas likely involved

- `src/core/config.ts` — parsing `pluginConfig` + stockage `rawConfig`
- `src/core/model.ts` — type `Site.config.rawConfig`
- `src/plugins/types.ts` — type `PluginContext` (`webetteConfig`, `thisPluginConfig`)
- `src/core/build.ts` — câblage `pluginContextBase`
- `src/plugins/runner.ts` — `thisPluginConfig` par plugin dans chaque hook
- `website-example/_plugins/toc/toc.js` — suppression `loadConfig()`, usage `ctx.thisPluginConfig`

---

## Checks to run

1. `bunx tsc --noEmit` — zéro erreur TypeScript
2. `bun run build website-example` — build propre, zéro warning
3. Vérifier dans les logs que le plugin TOC se charge et que `forAllEntries: false` (config réelle) est bien lu
4. Vérifier que les pages avec `toc.webt` ont un TOC dans le rendu final

---

## Evidence expected

- Build réussi sur `website-example` sans modification de comportement
- Confirmation (log ou inspection) que `ctx.thisPluginConfig` contient bien `{ forAllEntries: false, minLevel: 2, maxLevel: 4 }` pour le plugin TOC
- Zéro erreur TypeScript (`bunx tsc --noEmit` propre)
- Suppression de la fonction `loadConfig()` dans `toc.js` visible dans le diff

---

## Constraints and traps

- **`pluginConfig` dans `runner.ts`** : dans chaque `pluginCtx`, **ne pas remplacer** `pluginConfig` (la map complète) — **ajouter** `thisPluginConfig` à côté. Certains plugins pourraient vouloir accéder à la config d'un autre plugin.
- **`rawConfig` dans model.ts** : champ optionnel, pas un breaking change.
- **Import `readFile` dans `toc.js`** : vérifier si `readFile` est encore utilisé dans `extendTemplates` (lecture des partials/CSS) avant de supprimer l'import — il l'est, donc ne pas le supprimer.
- **TypeScript strict** : `rawConfig` de type `Record<string, unknown>` — les valeurs `undefined` des sections absentes sont acceptables (utiliser un filtre si besoin).
- **Ordre du config dans `site.config`** : ne pas supprimer `SiteModelTransformer` usage — ces champs optionnels sont préservés par le builder existant.

---

## Dev log

### Implémentation (2026-03-10)

**Changements et rationale :**

1. **`src/core/config.ts`** — parsing `pluginConfig` + stockage `rawConfig`
   - Ajout de `pluginConfig?: Record<string, unknown>` à `WebetteConfigFile`
   - Extraction de `pluginConfig` dans `loadConfigFile()` (guard objet non-array)
   - Suppression du bloc de re-parsing `plugins` dans `createSite()` — `config.plugins` est déjà la valeur typée sortie de `loadConfigFile()`
   - Construction de `rawConfig` depuis les sections brutes avant leur merge dans `siteSection`
   - Ajout de `pluginConfig` et `rawConfig` dans `site.config`

2. **`src/core/model.ts`** — type `Site.config`
   - Ajout de `rawConfig?: Record<string, unknown>` (champ optionnel, non breaking)

3. **`src/plugins/types.ts`** — `PluginContext`
   - Ajout de `webetteConfig` et `thisPluginConfig`
   - Commentaires clarifiés pour les quatre champs

4. **`src/core/build.ts`** — `pluginContextBase`
   - `webetteConfig: site.config?.rawConfig`
   - `siteConfig: site.site` (inchangé)
   - `pluginConfig: site.config?.pluginConfig` (était un cast erroné, maintenant direct)

5. **`src/plugins/runner.ts`** — `pluginCtx` par hook
   - `pluginConfig` garde la map complète (hérité de `ctx` via spread)
   - Ajout de `thisPluginConfig: ctx.pluginConfig?.[plugin.pluginId]` dans les trois hooks lifecycle (`onInit`, `onScan`, `onResolved`)
   - `webetteConfig` hérité automatiquement via `...ctx`

6. **`website-example/_plugins/toc/toc.js`** — suppression du hack
   - Suppression de `loadConfig()` et de ses 34 lignes de lecture/regex du fichier de config
   - `transformEntry` : `const config = ctx.thisPluginConfig || {}`
   - `extendTemplates` : `let config = ctx.thisPluginConfig || {}` (remplace `ctx.env.pluginConfig?.toc`)
   - Import `readFile` conservé (toujours utilisé pour les partials et le CSS)

**Checks :**
- `bunx tsc --noEmit` : ✅ zéro erreur
- `bun run build website-example` : ✅ build propre
  - Warnings préexistants non liés à la story : `resolve.video.copyFailed`, `build.icons.icoFailed`, lien vers brouillon
  - Plugin TOC initialisé (`toc.pluginInitialized` visible dans les logs)
  - Plugin demo toujours fonctionnel (`plugin.demo.enriched`)

**Correction post-validation (2026-03-10) — `thisPluginConfig` manquant dans transform hooks**

- **Symptôme** : le TOC affichait h1-h6 au lieu de h2-h4 (config réelle)
- **Cause** : `thisPluginConfig` n'était ajouté que dans les hooks lifecycle (`runOnInit`, `runOnScan`, `runOnResolved`). Les hooks `runTransformBlocks`, `runTransformEntry`, `runExtendTemplates` ne créaient pas de `pluginCtx` explicite avec ce champ — `ctx.thisPluginConfig` était `undefined`, le plugin tombait sur `{}` puis sur les defaults h1/h6.
- **Fix** : ajout de `thisPluginConfig: ctx.pluginConfig?.[plugin.pluginId]` dans les trois hooks restants.
- **Check** : `bunx tsc --noEmit` ✅ + `bun run build website-example` ✅

**Correction defaults TOC (2026-03-10)**

- **Symptôme** : sans config explicite, le TOC affichait h1-h6 alors que le README documente `minLevel: 2, maxLevel: 4` comme defaults.
- **Fix** : `generateToc` dans `toc.js` — `const { minLevel = 2, maxLevel = 4 } = config || {}`.
- **Check** : build ✅ + serve validé par l'utilisateur ✅

---

## Pilot exchange

**À documenter (ArPiDoc) :**
- `PluginContext` expose désormais quatre champs de config : `webetteConfig` (config complète), `siteConfig` (section `site`), `pluginConfig` (map de tous les plugins), `thisPluginConfig` (config de ce plugin)
- La section `pluginConfig` de `webette.config.ts` est maintenant lue et transmise automatiquement — les plugins n'ont plus à lire le fichier de config manuellement
- Un plugin doit utiliser `ctx.thisPluginConfig` pour accéder à sa propre config, et peut accéder à `ctx.pluginConfig[autreId]` pour celle d'un autre plugin si besoin
- Les defaults du plugin TOC sont `minLevel: 2, maxLevel: 4` (alignés avec le README)

---

## Commit proposal

Title: feat(plugins): pass full site config to plugins via context

Description:
- Parse `pluginConfig` from `webette.config.ts` (was silently ignored)
- Store full raw config in `site.config.rawConfig` before section merging
- Add `webetteConfig`, `thisPluginConfig` to `PluginContext` alongside existing `siteConfig` and `pluginConfig`
- Wire all four fields in `pluginContextBase` (build.ts) and in every plugin hook (runner.ts)
- Remove `loadConfig()` workaround from TOC plugin (manual regex reading of config file)
- Fix TOC plugin `extendTemplates` using `ctx.env.pluginConfig` (wrong — tool env, not user config)
- Fix default heading levels in TOC plugin to match documented defaults (minLevel: 2, maxLevel: 4)

Scope: plugins, core/config, core/model
