# T5-S04-b — Tags cliquables + pages de tags statiques

**Story ID**: T5-S04-b
**Parent**: T5 — Plugins & configuration (beta)
**Status**: Done, Validated
**Active**: no
**Created**: 2026-03-14
**Closed**: 2026-03-15

---

## Goal

Rendre les tags cliquables dans les templates entry et générer des pages de tags statiques au build. Quatre types de pages générées, chacun activable/désactivable indépendamment via config. Tout activé par défaut.

---

## Contexte / état actuel (recon)

1. **Tags implémentés** (T5-S04) : `tag.webt` → `Entry.tags?: string[]` → JSON export → Handlebars. Rendus comme `<span class="tag">` non cliquables.

2. **Pattern de génération de pages** (`src/core/build/render.ts`) :
   - `renderSite()` itère les collections et entries, appelle `mkdir` + `writeIfChanged` + `templateRenderer`
   - Les pages "non-entry" (index root, index collection, 404) suivent le même pattern — cas direct à reproduire pour les pages de tags
   - Ajout : nouveau fichier dédié `src/core/build/tag-pages.ts` exposant `renderTagPages()`, appelée depuis `build.ts` après `renderSite()`

3. **Config** (`src/core/config.ts` + `src/core/model.ts`) :
   - `WebetteConfigFile` (interface locale dans `config.ts`) liste les sections top-level lues depuis le fichier utilisateur
   - `Site.config` (interface dans `model.ts`) stocke les sections parsées disponibles à l'exécution — shape actuelle :
     ```ts
     config?: {
       collections?: Record<string, unknown>
       plugins?: string[] | { dir: string }
       templates?: Record<string, unknown>
       pluginConfig?: Record<string, unknown>
       rawConfig?: Record<string, unknown>   // config complète avant merge
     }
     ```
   - **`tags` doit être ajouté aux deux interfaces** : `WebetteConfigFile` (lecture) et `Site.config` (stockage)
   - Pattern de lecture dans `loadConfigFile()` : extraction + spread — voir `pluginConfig` comme modèle exact
   - Dans `build.ts`, accès via `site.config?.pluginConfig` (ligne ~266) — même pattern pour `site.config?.tags`
   - `readTagsConfig()` à définir dans `build.ts` (fonction locale privée, pas exportée)

4. **Templates disponibles** : `templateRenderer` est passé à `renderSite()` — mêmes helpers Handlebars disponibles (dont `getCollectionTags`, `getSiteTags`, `filterByTag`)

5. **Routes cibles** :
   - `/tag/` → liste de tous les tags du site
   - `/tag/{nom}/` → entrées taguées `nom` (toutes collections)
   - `/{collection}/tag/` → liste des tags de la collection
   - `/{collection}/tag/{nom}/` → entrées de la collection taguées `nom`

6. **Fonctions tag disponibles** (`src/core/tags/filter.ts`) : `getSiteTags`, `getCollectionTags`, `filterEntriesByTags`, `collectAllEntries` — à réutiliser directement.

---

## In scope

- Nouvelle section `tags` dans `webette.config.ts` (config + parsing)
- Génération des 4 types de pages de tags au build
- Deux nouveaux templates par défaut : `tag-index.hbs` et `tag-page.hbs`
- Mise à jour des templates entry (`post.hbs`, `entry.hbs`) : `<span>` → `<a href>` si pages activées, sinon `<span>` inchangé — conditionnel via `tagPagesEnabled` dans le contexte de rendu
- Mise à jour du website-example : `tag-index.hbs` et `tag-page.hbs` custom + config `tags`

## Out of scope

- Tags dans le sitemap
- Pagination des pages de tags
- Tags dans les index RSS/Atom
- Styles avancés des pages de tags (au-delà du minimum fonctionnel)

---

## Config cible

Nouvelle section `tags` dans `webette.config.ts` :

```ts
tags?: {
  enabled?: boolean           // active/désactive le système de tags — default: true
  generatePages?: boolean     // active/désactive toute génération de pages — default: true
  pages?: {
    siteIndex?: boolean       // génère /tag/ — default: true
    siteTag?: boolean         // génère /tag/{nom}/ — default: true
    collectionIndex?: boolean // génère /{collection}/tag/ — default: true
    collectionTag?: boolean   // génère /{collection}/tag/{nom}/ — default: true
  }
}
```

Tout absent = tout activé. Chaque clé `false` désactive son type de page.

---

## Done when

- [x] Section `tags` parsée depuis `webette.config.ts` et disponible dans `site.config.tags`
- [x] Génération de `/tag/index.html` (liste des tags du site) si `pages.siteIndex !== false`
- [x] Génération de `/tag/{nom}/index.html` (entrées filtrées, toutes collections) si `pages.siteTag !== false`
- [x] Génération de `/{collection}/tag/index.html` si `pages.collectionIndex !== false`
- [x] Génération de `/{collection}/tag/{nom}/index.html` si `pages.collectionTag !== false`
- [x] Templates par défaut `tag-index.hbs` et `tag-page.hbs` dans `templates/layout/`
- [x] Templates custom `tag-index.hbs` et `tag-page.hbs` dans `website-example/_templates/layout/`
- [x] `<span class="tag">` → `<a class="tag" href="...">` dans `post.hbs` et `entry.hbs` si `tagPagesEnabled` est `true` dans le contexte, sinon `<span>` inchangé
- [x] `tagPagesEnabled` ajouté à `renderBaseContext` dans `build.ts` (booléen dérivé de `tagsConfig`)
- [x] `bunx tsc --noEmit` ✅
- [x] `bun run build website-example` ✅ — pages de tags présentes dans `_public/tag/` et `_public/{collection}/tag/`
- [x] Navigation tag → page de tags fonctionnelle dans le browser (serve)

---

## Execution brief

### Étape 1 — Config (`src/core/config.ts` + `src/core/model.ts`)

**1a. `WebetteConfigFile` dans `config.ts`** — ajouter `tags?: Record<string, unknown>`.

**1b. `Site.config` dans `model.ts`** — ajouter `tags?: Record<string, unknown>` à l'interface :
```ts
config?: {
  // ... champs existants ...
  tags?: Record<string, unknown>;  // raw tags config from webette.config.ts
}
```

**1c. `loadConfigFile()` dans `config.ts`** — extraire `tags` (même pattern que `pluginConfig`) :
```ts
const tags =
  raw.tags && typeof raw.tags === 'object' && !Array.isArray(raw.tags)
    ? { ...(raw.tags as Record<string, unknown>) }
    : undefined;
```

**1d.** Inclure `tags` dans `rawConfig` et dans `site.config` (même position que `pluginConfig`).

**1e. `readTagsConfig()` dans `build.ts`** — fonction locale (non exportée), à définir avant la construction de `renderBaseContext` :
```ts
function readTagsConfig(raw?: Record<string, unknown>) {
  const enabled = raw?.enabled !== false
  const generatePages = enabled && raw?.generatePages !== false
  const pages = (raw?.pages ?? {}) as Record<string, unknown>
  return {
    enabled,
    generatePages,
    anyPageEnabled:  generatePages,
    siteIndex:       generatePages && pages.siteIndex !== false,
    siteTag:         generatePages && pages.siteTag !== false,
    collectionIndex: generatePages && pages.collectionIndex !== false,
    collectionTag:   generatePages && pages.collectionTag !== false,
  }
}
```

Appel dans `build()` : `const tagsConfig = readTagsConfig(site.config?.tags)`

---

### Étape 2 — Génération des pages (`src/core/build/tag-pages.ts`)

Nouveau fichier, calqué sur le pattern de `render.ts`. Signature :

```ts
export async function renderTagPages(options: {
  outputDir: string
  site: ResolvedSite
  tagsConfig: ReturnType<typeof readTagsConfig>
  templateRenderer: HandlebarsRenderer
  renderBaseContext: RenderBaseContext
  writeIfChanged: (path: string, content: string) => Promise<boolean>
  formatHtml: (html: string, path: string) => Promise<string>
  logger: Logger
}): Promise<number>  // retourne le nombre de pages générées
```

Logique interne :
1. Collecter toutes les entries via `collectAllEntries(site.collections, site.rootEntries)`
2. Si `siteIndex` : render `/tag/index.html` avec context `{ tags: getSiteTags(...), ... }`
3. Si `siteTag` : pour chaque tag → render `/tag/{slug}/index.html` avec context `{ tag, entries: filterEntriesByTags(...) }`
4. Si `collectionIndex` : pour chaque collection → render `/{collection}/tag/index.html`
5. Si `collectionTag` : pour chaque (collection, tag) → render `/{collection}/tag/{slug}/index.html`

Slugification du nom de tag pour l'URL : `tag.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')`

---

### Étape 3 — Intégration dans `build.ts`

**3a. Ajouter `tagPagesEnabled` à `renderBaseContext`** (après le calcul de `tagsConfig`) :
```ts
const renderBaseContext = {
  // ... champs existants ...
  tagPagesEnabled: tagsConfig.anyPageEnabled,
}
```

**3b.** Après `renderSite()`, appeler `renderTagPages` si des pages sont à générer :
```ts
if (tagsConfig.anyPageEnabled) {
  await renderTagPages({
    outputDir,
    site: sortedSite,
    tagsConfig,
    templateRenderer,
    renderBaseContext,
    writeIfChanged,
    formatHtml,
    logger: scoped,
  })
}
```

---

### Étape 4 — Templates par défaut (`templates/layout/`)

**`tag-index.hbs`** — liste des tags (site ou collection) :
```hbs
<main>
  <article>
    <header class="index-header">
      <h1>{{#if collection}}Tags — {{displayName collection}}{{else}}All tags{{/if}}</h1>
    </header>
    <section class="tag-list">
      {{#each tags}}
        <a class="tag" href="{{tagRoute this ../collection}}">{{this}}</a>
      {{/each}}
    </section>
  </article>
</main>
{{> footer}}
```

**`tag-page.hbs`** — liste d'entrées filtrées pour un tag :
```hbs
<main>
  <article>
    <header class="index-header">
      <h1>{{#if collection}}{{displayName collection}} — {{/if}}#{{tag}}</h1>
    </header>
    <section class="navigation">
      {{#each entries}}
        <a href="{{route}}">{{name}}</a>
      {{/each}}
    </section>
  </article>
</main>
{{> footer}}
```

> Note : un helper `tagRoute` sera nécessaire pour construire l'URL de chaque tag depuis le contexte (scoped collection ou global). À ajouter dans `helpers.ts`.

---

### Étape 5 — Mise à jour des templates entry

`tagPagesEnabled` est disponible dans tous les contextes de rendu (entry, index, tag-page) via `renderBaseContext`.

Dans `post.hbs` et `website-example/_templates/layout/entry.hbs`, remplacer :
```hbs
<span class="tag">{{this}}</span>
```
par :
```hbs
{{#if ../tagPagesEnabled}}
  <a class="tag" href="/tag/{{slugifyTag this}}">{{this}}</a>
{{else}}
  <span class="tag">{{this}}</span>
{{/if}}
```

> Le helper `slugifyTag` à ajouter dans `helpers.ts` (logique centralisée ici, réutilisée par `tag-pages.ts`). Implémentation : `tag.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')`

---

### Étape 6 — website-example

- Ajouter `tags: { enabled: true }` dans `website-example/webette.config.ts` (optionnel si tout est par défaut, mais explicite pour la doc)
- Créer `website-example/_templates/layout/tag-index.hbs` et `tag-page.hbs` avec le style du site

---

## Points d'attention

- **Orphan pruning** : les pages `/tag/...` générées doivent être dans `protectedDirs` pour ne pas être supprimées par `pruneOrphans()`. Ajouter le préfixe `tag/` à la liste des dossiers protégés si `tagsConfig.siteIndex || tagsConfig.siteTag`.
- **Collections sans tags** : si une collection n'a aucune entry taguée, ne pas générer sa page `/tag/` pour éviter des pages vides.
- **Tags avec espaces** : slugification à centraliser (un seul endroit) entre la génération d'URL et les hrefs dans les templates.
- **`generateIndex: false`** : si l'utilisateur a désactivé les index de collection, les pages `/{collection}/tag/` doivent-elles être générées quand même ? Décision conseillée : oui, indépendantes de `generateIndex`.

---

## Dev Log

### 2026-03-15 — Implémentation complète

**Étape 1 — Config**
- `WebetteConfigFile` (config.ts) : ajout `tags?: Record<string, unknown>` — même pattern que `pluginConfig`.
- `Site.config` (model.ts) : ajout `tags?: Record<string, unknown>` — stockage côté runtime.
- `loadConfigFile()` (config.ts) : extraction `tags` + inclusion dans `rawConfig` et `site.config`.
- `readTagsConfig()` (build.ts) : fonction locale non exportée — calcule `enabled`, `generatePages`, `anyPageEnabled`, et les 4 flags de page. Appelée juste après `createSite()`.

**Étape 2 — `src/core/build/tag-pages.ts` (nouveau fichier)**
- `slugifyTag` ajouté dans `tags/filter.ts` (source de vérité partagée entre `tag-pages.ts` et les helpers Handlebars).
- `renderTagPages()` suit le même pattern que `renderSite()` : `mkdir` + `writeIfChanged` + `formatHtml`.
- Collections sans entrées taguées sont skippées pour éviter des pages vides (`/{collection}/tag/`).
- `TAG_INDEX_LAYOUT = 'tag-index'` et `TAG_PAGE_LAYOUT = 'tag-page'` comme constantes pour clarté.

**Étape 3 — Intégration build.ts**
- Import de `renderTagPages`.
- `tagPagesEnabled: tagsConfig.anyPageEnabled` ajouté à `renderBaseContext`.
- `renderTagPages` appelé conditionnellement après `renderSite()`.
- Protection orphan pruning via `registerExpectedDir('tag')` et `registerExpectedDir('{collection}/tag')` par collection — nécessaire car `protectedDirs` ne couvre que `index.html` direct, pas les sous-arborescences. *Diagnostic* : premier build montrait les pages supprimées car `protectedDirs.add(...)` n'enregistre que `tag/index.html`, pas `tag/demo/index.html`. Corrigé en utilisant `pluginExpected.addExpectedDir` (préfixe `expectedPrefixes`).

**Étape 4 — Templates par défaut**
- `templates/layout/tag-index.hbs` : liste des tags avec `tagRoute` pour les URLs.
- `templates/layout/tag-page.hbs` : liste des entrées filtrées avec `displayName`.
- Helpers `slugifyTag` et `tagRoute` ajoutés dans `helpers.ts` — importent `slugifyTagUtil` de `tags/filter.ts`.
- `tagRoute` : detects si le 2e argument est un objet collection (vs options Handlebars) pour switcher entre `/tag/{slug}/` et `/{collection}/tag/{slug}/`.

**Étape 5 — Templates entry**
- `templates/layout/post.hbs` et `website-example/_templates/layout/entry.hbs` : `<span class="tag">` → `<a class="tag" href="{{tagRoute this}}">` conditionnel via `../tagPagesEnabled`.
- Correction initiale : j'avais utilisé `href="/tag/{{slugifyTag this}}"` (sans trailing slash) — remplacé par `{{tagRoute this}}` pour cohérence avec les URLs générées.

**Étape 6 — website-example**
- `webette.config.ts` : ajout `tags: { enabled: true }`.
- `_templates/layout/tag-index.hbs` : liste cliquable dans `<div class="entry-tags">` avec classes du site.
- `_templates/layout/tag-page.hbs` : liste d'entrées avec `<ul class="navigation-list">` (structure manuelle — `navigation-items` attend des objets avec `kind`, incompatible avec `Entry[]` bruts).

**Checks**
- `bunx tsc --noEmit` : ✅ (deux runs, avant et après correction trailing slash)
- `bun run build website-example` : ✅ — pages générées dans `_public/tag/` et `_public/{collection}/tag/`
- Tags cliquables vérifiés dans `playground/introduction/index.html` : `href="/tag/getting-started/"` ✅

### 2026-03-15 — Points A, B, C (scope étendu)

**Point A — Consolidation slugify**
- `slugifyTag` supprimé de `tags/filter.ts` (était : lowercase + `\s+` → `-` + `[^a-z0-9-]` → `''`).
- `tag-pages.ts` et `helpers.ts` (Handlebars helpers `slugifyTag` et `tagRoute`) rebranchés sur `slugify` de `utils/naming.ts` — plus robuste : normalisation NFD, accents gérés, fallback `"untitled"`.
- Import `slugify` dans `helpers.ts` corrigé : `../../utils/naming` (le fichier est dans `src/core/templates/`, pas `src/core/`).

**Point B — Centralisation `stripRouteSlashes`**
- `stripRouteSlashes(route: string): string` ajouté dans `src/utils/path.ts`.
- Utilisé à la place du pattern `route.replace(/^\/+/, '').replace(/\/+$/, '')` dans : `render.ts` (2 contextes, 2 occurrences collection), `prune.ts` (entry + collection), `tag-pages.ts` (collection route), `icons.ts` (output dir), `helpers.ts` (asset helper + tagRoute), `build.ts` (orphan protection collection loop).
- Occurrences restantes intentionnellement non migrées : `utils/path.ts` (la définition elle-même), `build.ts:207` (`assetsBase` leading-only), `block-types/{image,audio,video}/paths.ts` (leading-only, contexte output path) — celles-ci n'utilisent qu'un seul côté et ne sont pas de la normalisation de route.

**Point C — Warning collision route 'tag'**
- Vérification ajoutée dans `build.ts` après `applySorting()`, conditionnelle à `tagsConfig.anyPageEnabled`.
- Itère les collections (slug collision) et leurs entrées (slug collision au niveau entry), ainsi que `rootEntries`.
- `SYSTEM_SLUGS = ['tag']` — liste extensible pour futures routes système.
- Warning via `scoped.warn('build.tags.routeCollision', { kind, slug, collection? })`.
- Décision : warning uniquement (pas de re-slugification automatique), le user corrige manuellement.

**Checks finaux**
- `bunx tsc --noEmit` : ✅
- `bun run build website-example` : ✅ — pages de tags présentes, aucun warning collision sur le website-example

---

## Pilot exchange

- 2026-03-14 — Pilot -> Dev — Story créée depuis les specs capturées dans le Pilot exchange de T5-S04. Recon faite sur `render.ts`, `config.ts`, `build.ts`. Points d'attention documentés ci-dessus (orphan pruning, collections vides, slugification centralisée).

- 2026-03-15 — Pilot — Documentation à produire lors de la clôture de cette story :

  **1. Config `tags` (référence utilisateur)**
  - Documenter la section `tags` dans `webette.config.ts` : toutes les clés, leurs types, leurs valeurs par défaut, et le comportement quand la section est absente (tout activé).
  - Préciser que `enabled: false` désactive tout le système (rendu + génération de pages), tandis que `generatePages: false` désactive uniquement la génération mais conserve l'affichage des tags dans les entries.
  - Documenter chaque clé `pages.*` (siteIndex, siteTag, collectionIndex, collectionTag) avec l'URL générée correspondante.

  **2. Routes générées (référence utilisateur)**
  - Tableau des 4 types de pages avec URL pattern, condition d'activation, et contenu rendu.
  - Préciser la règle de slugification des noms de tags dans les URLs (`toLowerCase`, espaces → `-`, caractères spéciaux supprimés).
  - Préciser que les pages `/{collection}/tag/` sont indépendantes de `generateIndex` de la collection.

  **3. Templates `tag-index.hbs` et `tag-page.hbs` (référence développeur)**
  - Documenter les variables de contexte disponibles dans chaque template :
    - `tag-index.hbs` : `tags` (string[]), `collection` (présent si scoped, absent si site-level), `displayName`, `tagRoute`, helpers standard.
    - `tag-page.hbs` : `tag` (string), `entries` (Entry[]), `collection` (présent si scoped), helpers standard.
  - Documenter comment surcharger ces templates via `_templates/layout/tag-index.hbs` et `_templates/layout/tag-page.hbs`.

  **4. Helpers Handlebars ajoutés (référence développeur)**
  - `slugifyTag <tag>` : transforme un tag en slug URL-safe (même logique que la génération de routes).
  - `tagRoute <tag> [collection]` : retourne l'URL de la page de tag correspondante (`/tag/{slug}/` ou `/{collection}/tag/{slug}/`).

  **5. Variable de contexte `tagPagesEnabled` (référence développeur)**
  - Disponible dans tous les contextes de rendu (entry, index, tag-page) via `renderBaseContext`.
  - Usage : conditionner le rendu des tags en `<a>` vs `<span>` dans les templates custom.
  - Exemple de pattern dans les templates entry (comme dans `post.hbs` après migration).

  **6. Comportement orphan pruning**
  - Préciser que le dossier `tag/` dans `_public/` est protégé de la suppression automatique quand les pages de tags sont activées (même comportement que les autres dossiers système).

- 2026-03-15 — Pilot -> Dev — Les 3 points entrent dans le scope de cette story. Plan d'exécution :
  - **A** : supprimer `slugifyTag` de `tags/filter.ts`, rebrancher `tag-pages.ts` et `helpers.ts` sur `slugify` de `utils/naming.ts`.
  - **B** : ajouter `stripRouteSlashes(route)` dans `utils/path.ts` ; utiliser dans le nouveau code + fichiers à forte occurrence (render.ts, prune.ts, icons.ts, helpers.ts, build.ts).
  - **C** : warning dans `build.ts` après résolution du site si collision slug/route avec les routes système `/tag/` ou `/{collection}/tag/`. Warning uniquement, pas de re-slug.

- 2026-03-15 — User review — Trois corrections demandées après review du Point C + deux nouveaux comportements :

  **1. i18n** — Les warnings de collision utilisaient `console.warn` direct au lieu du logger interne. Corrigé : toutes les émissions passent par `scoped.warn(key, params)` avec clés ajoutées dans `locales/en/logs.json` et `locales/fr/logs.json`.

  **2. `scopedLinks`** — Nouvelle option `tags.scopedLinks` (default `true`). Quand activée, les liens tag dans les templates entry pointent vers `/{collection}/tag/{slug}/` plutôt que `/tag/{slug}/`. Implémenté via `tagScopeByCollection` dans `renderBaseContext` et lecture de `options.data.root` dans le helper `tagRoute`. La détection de l'objet options Handlebars se fait via `'hash' in v && 'data' in v` (et non `'fn' in v` qui n'existe que pour les block helpers). `scopedLinks` forcé à `false` si `collectionTag` est désactivé pour éviter des liens morts.

  **3. Skip pages vides** — Si aucune entry du site n'a de tag, `renderTagPages` retourne `0` immédiatement sans générer quoi que ce soit. `tag-pages.ts` : récupère `allTags` via `getAllTags(allEntries)` en tête de fonction ; sortie anticipée si `allTags.length === 0`. La collection-level skip existait déjà (`if (!collectionTags.length) continue`).

  **4. Auto-rename collisions** — Au lieu d'un warning uniquement, renommage automatique des slugs en conflit avec les routes système. Nouveau fichier `src/core/build/resolve-system-slugs.ts` : `SYSTEM_SLUGS = ['tag']`, `findUniqueSlug(base, taken)` (appende `-0`, `-1`, … jusqu'à unicité), `resolveSystemSlugCollisions(site, logger)` (retourne un nouveau `Site` avec les slugs renommés + routes recalculées). Appelé dans `build.ts` après `applySorting()` → `finalSite`. Warnings émis via `scoped.warn('build.tags.slugRenamed', ...)` et `scoped.warn('build.tags.slugRenamedInCollection', ...)`.

  **Checks**
  - `bunx tsc --noEmit` : ✅
  - `bun run build website-example` : ✅
  - Browser verify (`bun run serve website-example`) : navigation tag → page de tags ✅

- 2026-03-15 — Bug fix — **Routes entries non rebasées après renommage collection** : quand une collection est renommée (`tag` → `tag-0`), ses entries non-collisionnantes étaient retournées inchangées avec leurs routes originales (`/tag/…`). Fix dans `resolve-system-slugs.ts` : flag `collectionRenamed` — si vrai, toutes les entries sont rebasées sur `/${colRoute}/${entrySlug}/` même si leur propre slug ne collisionne pas. Vérifié : `localhost:4173/tag-0/test/` ✅

- 2026-03-15 — Dev -> Pilot — Observations soulevées par l'utilisateur après review, 3 sujets à décider :

  **A. Slugify dupliqué** — `slugifyTag` dans `tags/filter.ts` est probablement redondant avec un utilitaire slug déjà présent dans la codebase. Il faudrait auditer (`src/` grep `slug`) et consolider en un seul `slugify` générique réutilisable par les tags, les routes, les collections/entries. → Décision Pilot : nouvelle story T6 ou issue de dette ?

  **B. Normalisation de route dupliquée** — Le pattern `route.replace(/^\/+/, '').replace(/\/+$/, '')` est répété à plusieurs endroits (build.ts ligne 710, render.ts, prune.ts, etc.). Même chose pour la construction de `routeRelative`. Un helper `normalizeRouteSegment(route)` centralisé éviterait la duplication. → Candidat T6.

  **C. Collision de nom "tag"** — Si une collection ou une entrée est nommée `tag`, son slug/route `/tag/` entre en conflit avec les pages de tags système. Le build produirait des fichiers contradictoires sans avertissement. Deux niveaux possibles : (1) warning uniquement au build (détecte et log, le user corrige manuellement) ; (2) re-slugification automatique + warning (plus robuste, plus complexe). → Décision Pilot : périmètre + quelle approche + dans quelle story ?
