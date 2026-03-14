# T5-S04-b — Tags cliquables + pages de tags statiques

**Story ID**: T5-S04-b
**Parent**: T5 — Plugins & configuration (beta)
**Status**: Ready
**Active**: no
**Created**: 2026-03-14
**Closed**: —

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

- [ ] Section `tags` parsée depuis `webette.config.ts` et disponible dans `site.config.tags`
- [ ] Génération de `/tag/index.html` (liste des tags du site) si `pages.siteIndex !== false`
- [ ] Génération de `/tag/{nom}/index.html` (entrées filtrées, toutes collections) si `pages.siteTag !== false`
- [ ] Génération de `/{collection}/tag/index.html` si `pages.collectionIndex !== false`
- [ ] Génération de `/{collection}/tag/{nom}/index.html` si `pages.collectionTag !== false`
- [ ] Templates par défaut `tag-index.hbs` et `tag-page.hbs` dans `templates/layout/`
- [ ] Templates custom `tag-index.hbs` et `tag-page.hbs` dans `website-example/_templates/layout/`
- [ ] `<span class="tag">` → `<a class="tag" href="...">` dans `post.hbs` et `entry.hbs` si `tagPagesEnabled` est `true` dans le contexte, sinon `<span>` inchangé
- [ ] `tagPagesEnabled` ajouté à `renderBaseContext` dans `build.ts` (booléen dérivé de `tagsConfig`)
- [ ] `bunx tsc --noEmit` ✅
- [ ] `bun run build website-example` ✅ — pages de tags présentes dans `_public/tag/` et `_public/{collection}/tag/`
- [ ] Navigation tag → page de tags fonctionnelle dans le browser (serve)

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

_(à remplir lors de l'exécution)_

---

## Pilot exchange

- 2026-03-14 — Pilot -> Dev — Story créée depuis les specs capturées dans le Pilot exchange de T5-S04. Recon faite sur `render.ts`, `config.ts`, `build.ts`. Points d'attention documentés ci-dessus (orphan pruning, collections vides, slugification centralisée).
