# T5-S04 — Tags pour entries (modèle + rendu/filtre)

**Story ID**: T5-S04
**Parent**: T5 — Plugins & configuration (beta)
**Status**: Done, Validated
**Active**: no
**Created**: 2026-03-14
**Closed**: 2026-03-14

---

## Goal

Ajouter un système de tags pour les entries : stockage via `tags.webt`, propagation dans le modèle interne, export JSON, affichage dans les templates, API interne réutilisable (helpers Handlebars + exposition sur `PluginContext`).

---

## Contexte / état actuel (recon)

1. **Aucune trace de tags** dans le codebase — c'est une fonctionnalité entièrement nouvelle.

2. **Pattern `.webt` bien établi** dans `src/core/scan/raw-scan.ts` :
   - `readDescriptionFile()` lit `description.webt` (texte brut, `trimEnd()`)
   - `readNameFile()` lit `name.webt` (texte brut, `trim()`)
   - `readIgnoreFile()` lit `ignore.webt` (multi-lignes, une valeur par ligne)
   - `tags.webt` suivra le même pattern que `ignore.webt` : un tag par ligne.

3. **Deux points d'appel dans le scan** (`raw-scan.ts`) :
   - `scanStructureFolderRaw()` (~ligne 248) : lit description + displayName pour les entries dans les collections
   - `listRootIndexRaw()` (~ligne 404) : lit les mêmes champs pour les root entries

4. **Propagation** :
   - `src/core/scan/internal-types.ts` : `RawEntry` a `description?`, `displayName?`, `isDraft?`, `isUnlisted?` → ajouter `tags?`
   - `src/core/scan/enrich.ts` : `enrichEntries()` propage `raw.description`, `raw.displayName` → ajouter `raw.tags`
   - `src/core/model.ts` : `Entry` a les mêmes champs optionnels → ajouter `tags?: string[]`

5. **Export** :
   - `src/core/export/write-model.ts` : `PREFERRED_KEYS` liste les champs exportés → ajouter `"tags"`

6. **Contexte template** (recon `src/core/build/render.ts` + `src/core/build.ts`) :
   - `renderBaseContext` contient `model` (site complet), `site`, `collections` (toutes les collections), `layoutName`, `buildTime`
   - Contexte entry page : `...renderBaseContext` + `entry`, `collection?`, `blocks`, `prevEntry?`, `nextEntry?`
   - `collections` est donc disponible dans **tous** les templates entry/index
   - `model.rootEntries` accessible via `model` pour les root entries
   - `rootEntries` direct : uniquement sur le contexte root index

7. **Templates** :
   - **Défaut** : `templates/layout/post.hbs` — affiche `displayName` + `isDraft` + blocks + `prev-next`
   - **website-example** : `website-example/_templates/layout/entry.hbs` — layout custom ; affiche `isDraft`, blocks, `pluginNote`, `prev-next`. C'est ce template qui produit le HTML visible dans le build de validation.
   - Les deux doivent afficher les tags.

8. **Scope : entries uniquement** pour cette story. Les collections peuvent être étendues ultérieurement.

---

## In scope

### Modèle
- `tags.webt` : un tag par ligne (trim, dédupliqué, lignes vides ignorées)
- `tags?: string[]` sur `RawEntry` (`internal-types.ts`)
- `readTagsFile()` dans `raw-scan.ts`, appelé aux deux points de scan
- `tags` propagé dans `enrich.ts` (`enrichEntries()`)
- `tags?: string[]` sur `Entry` (`model.ts`)
- `"tags"` dans `PREFERRED_KEYS` de `write-model.ts`

### API interne (`src/core/tags/filter.ts`)
- Module pur, importable par les helpers et les plugins
- `normalizeTags(input: string | string[]): string[]` — parse "a,b,c" ou `["a","b"]`, trim, déduplique
- `entryMatchesTags(entry: Entry, tags: string[], mode: TagFilterMode): boolean`
- `filterEntriesByTags(entries: Entry[], options: TagFilterOptions): Entry[]`
- `collectAllEntries(collections: Collection[], rootEntries?: Entry[]): Entry[]` — liste plate de toutes les entries
- `getAllTags(entries: Entry[]): string[]` — tous les tags uniques triés alphabétiquement

Types exportés :
```ts
export type TagFilterMode = 'and' | 'or';
export interface TagFilterOptions {
  tags: string | string[];
  mode?: TagFilterMode; // default: 'or'
}
```

### Helpers Handlebars (`src/core/templates/helpers.ts`)
- **`filterByTag`** : accepte `entries` en premier argument positionnel, options hash `tags` (string ou `string[]`) et `mode` ('and'|'or', défaut 'or')
  - Pour filtrer dans une collection : `{{filterByTag collection.entries tags="design,ux" mode="or"}}`
  - Pour filtrer toutes les entries : `{{filterByTag (collectAllEntries collections) tags="design" mode="and"}}`
- **`collectAllEntries`** : accepte `collections` (positionnel ou depuis `this.collections`) + `model.rootEntries` si disponible dans le contexte ; retourne `Entry[]` à plat

### Exposition sur `PluginContext`
- Ajouter `tags` à `PluginContext` (`src/plugins/types.ts`) :
  ```ts
  tags: {
    filter: (entries: Entry[], options: TagFilterOptions) => Entry[];
    collect: (collections: Collection[], rootEntries?: Entry[]) => Entry[];
    getAllTags: (entries: Entry[]) => string[];
    normalizeTags: (input: string | string[]) => string[];
  }
  ```
- Câbler dans `pluginContextBase` (`src/core/build.ts`) : importer les fonctions de `filter.ts` et construire l'objet `tags`

### Templates
- `templates/layout/post.hbs` : section tags conditionnelle
- `website-example/_templates/layout/entry.hbs` : section tags conditionnelle

### Données de test
- Au moins 3-4 entries dans `website-example` avec des `tags.webt` variés (1 tag, 3 tags, tags partagés entre entries)
- Zéro régression sur `bun run build -v website-example`

## Out of scope

- Tags sur `Collection` ou `RawCollection` (extension future)
- Pages d'index auto-générées par tag (feature séparée)
- Tri par tags
- UI de gestion des tags
- Validation du format des tags (caractères autorisés, longueur max)
- Documentation publique
- Plugin de filtrage dynamique JS (cas d'usage illustratif, non implémenté ici)

---

## Done when

- [x] `readTagsFile(dir)` dans `raw-scan.ts` lit `tags.webt` (un tag par ligne, trim, dédupliqué, retourne `string[] | undefined`)
- [x] `readTagsFile` est appelé dans `scanStructureFolderRaw()` et dans `listRootIndexRaw()`, résultat stocké dans le `RawEntry`
- [x] `RawEntry` dans `internal-types.ts` a `tags?: string[]`
- [x] `Entry` dans `model.ts` a `tags?: string[]`
- [x] `enrichEntries()` dans `enrich.ts` propage `raw.tags` si présent
- [x] `"tags"` est dans `PREFERRED_KEYS` de `write-model.ts`
- [x] `src/core/tags/filter.ts` existe et exporte : `TagFilterMode`, `TagFilterOptions`, `normalizeTags`, `entryMatchesTags`, `filterEntriesByTags`, `collectAllEntries`, `getAllTags`
- [x] Helper `filterByTag` dans `helpers.ts` : accepte `entries` positionnel + hash `tags` + hash `mode`; fonctionne en mode 'and' et 'or'; multi-tags fonctionnel
- [x] Helper `collectAllEntries` dans `helpers.ts` : retourne toutes les entries à plat depuis `collections` + `rootEntries` du contexte si disponibles
- [x] `PluginContext` dans `types.ts` expose `tags.filter`, `tags.collect`, `tags.getAllTags`, `tags.normalizeTags`
- [x] `pluginContextBase` dans `build.ts` câble l'objet `tags` depuis `filter.ts`
- [x] `templates/layout/post.hbs` affiche les tags si l'entry en a (`{{#if entry.tags}}`)
- [x] `website-example/_templates/layout/entry.hbs` affiche les tags si l'entry en a (même pattern)
- [x] Au moins 3-4 entries dans `website-example` ont un `tags.webt` avec des tags variés
- [x] `bunx tsc --noEmit` passe sans erreur
- [x] `bun run build -v website-example` passe sans erreurs TypeScript ni warnings nouveaux
- [x] HTML d'au moins une entry taguée contient `<div class="entry-tags">`
- [x] Export JSON d'une entry taguée contient le champ `tags`

---

## Execution brief

### Étape 1 — `src/core/scan/raw-scan.ts`

Ajouter `readTagsFile()` après `readNameFile()` :

```ts
export async function readTagsFile(dir: string): Promise<string[] | undefined> {
  const tagsPath = path.join(dir, "tags.webt");
  try {
    const content = await readFile(tagsPath, "utf8");
    const tags = [...new Set(
      content.split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0)
    )];
    return tags.length ? tags : undefined;
  } catch {
    return undefined;
  }
}
```

Appeler dans `scanStructureFolderRaw()` (~ligne 248) et `listRootIndexRaw()` (~ligne 404), même pattern que `description`/`displayName`. Ajouter `tags` dans l'objet retourné pour les `RawEntry`.

### Étape 2 — `src/core/scan/internal-types.ts`

Dans `RawEntry`, après `displayName?` :
```ts
tags?: string[];
```

### Étape 3 — `src/core/model.ts`

Dans `Entry`, après `description?` :
```ts
tags?: string[];
```

### Étape 4 — `src/core/scan/enrich.ts`

Dans `enrichEntries()`, après la ligne `displayName` :
```ts
...(raw.tags ? { tags: raw.tags } : {}),
```

### Étape 5 — `src/core/export/write-model.ts`

Dans `PREFERRED_KEYS`, ajouter `"tags"` après `"description"` (cohérence avec les autres métadonnées).

### Étape 6 — `src/core/tags/filter.ts` (nouveau fichier)

```ts
import type { Entry } from '../model';
import type { Collection } from '../model';

export type TagFilterMode = 'and' | 'or';

export interface TagFilterOptions {
  tags: string | string[];
  mode?: TagFilterMode;
}

export function normalizeTags(input: string | string[]): string[] {
  const raw = Array.isArray(input) ? input : input.split(',');
  return [...new Set(raw.map(t => t.trim()).filter(t => t.length > 0))];
}

export function entryMatchesTags(entry: Entry, tags: string[], mode: TagFilterMode): boolean {
  if (!tags.length) return true;
  const entryTags = entry.tags ?? [];
  if (mode === 'and') return tags.every(t => entryTags.includes(t));
  return tags.some(t => entryTags.includes(t));
}

export function filterEntriesByTags(entries: Entry[], options: TagFilterOptions): Entry[] {
  const tags = normalizeTags(options.tags);
  const mode = options.mode ?? 'or';
  if (!tags.length) return entries;
  return entries.filter(e => entryMatchesTags(e, tags, mode));
}

export function collectAllEntries(collections: Collection[], rootEntries?: Entry[]): Entry[] {
  const fromCollections = collections.flatMap(c => c.entries ?? []);
  return rootEntries ? [...(rootEntries), ...fromCollections] : fromCollections;
}

export function getAllTags(entries: Entry[]): string[] {
  const tagSet = new Set<string>();
  for (const entry of entries) {
    for (const tag of entry.tags ?? []) tagSet.add(tag);
  }
  return [...tagSet].sort();
}
```

### Étape 7 — `src/core/templates/helpers.ts`

Importer les fonctions :
```ts
import {
  filterEntriesByTags,
  collectAllEntries as collectAllEntriesUtil,
  type TagFilterMode,
} from '../tags/filter';
```

Enregistrer `filterByTag` :
```ts
Handlebars.registerHelper(
  'filterByTag',
  function (this: Record<string, unknown>, entries: unknown, options: Handlebars.HelperOptions) {
    if (!Array.isArray(entries)) return [];
    const tags = options.hash?.tags ?? '';
    const mode: TagFilterMode = options.hash?.mode === 'and' ? 'and' : 'or';
    return filterEntriesByTags(entries as Entry[], { tags, mode });
  }
);
```

Enregistrer `collectAllEntries` :
```ts
Handlebars.registerHelper(
  'collectAllEntries',
  function (this: Record<string, unknown>, collections?: unknown) {
    const cols = Array.isArray(collections) ? collections :
      Array.isArray(this.collections) ? this.collections : [];
    const rootEntries = Array.isArray((this.model as Record<string, unknown>)?.rootEntries)
      ? (this.model as Record<string, unknown>).rootEntries as Entry[]
      : undefined;
    return collectAllEntriesUtil(cols as Collection[], rootEntries);
  }
);
```

Usages dans les templates :
```hbs
{{! Dans une collection :}}
{{#each (filterByTag collection.entries tags="design,ux" mode="or")}}...{{/each}}

{{! Toutes les entries du site :}}
{{#each (filterByTag (collectAllEntries) tags="design" mode="and")}}...{{/each}}
```

### Étape 8 — `src/plugins/types.ts`

Importer les types et fonctions :
```ts
import type { TagFilterOptions } from '../core/tags/filter';
```

Ajouter dans `PluginContext` :
```ts
tags: {
  filter: (entries: Entry[], options: TagFilterOptions) => Entry[];
  collect: (collections: Collection[], rootEntries?: Entry[]) => Entry[];
  getAllTags: (entries: Entry[]) => string[];
  normalizeTags: (input: string | string[]) => string[];
};
```

### Étape 9 — `src/core/build.ts`

Importer dans `build.ts` :
```ts
import {
  filterEntriesByTags,
  collectAllEntries,
  getAllTags,
  normalizeTags,
} from './tags/filter';
```

Dans `pluginContextBase` (zone ~ligne 255), ajouter :
```ts
tags: {
  filter: filterEntriesByTags,
  collect: collectAllEntries,
  getAllTags,
  normalizeTags,
},
```

### Étape 10a — `templates/layout/post.hbs`

Après `{{displayName entry}}`, avant le bloc `isDraft` :
```hbs
{{#if entry.tags}}
<div class="entry-tags">
  {{#each entry.tags}}<span class="tag">{{this}}</span>{{/each}}
</div>
{{/if}}
```

### Étape 10b — `website-example/_templates/layout/entry.hbs`

Après le bloc `isDraft` (`{{/if}}`), avant `{{{toc}}}` :
```hbs
{{#if entry.tags}}
<div class="entry-tags">
  {{#each entry.tags}}<span class="tag">{{this}}</span>{{/each}}
</div>
{{/if}}
```

### Étape 11 — `website-example/` (données de test)

Ajouter des `tags.webt` dans au moins 3-4 entries existantes :
- Une entry avec 1 tag
- Une entry avec 3 tags
- Au moins 2 entries partageant un même tag (pour tester le filtre)

---

## Files/areas likely involved

- `src/core/scan/raw-scan.ts` — `readTagsFile()` + appels dans scan
- `src/core/scan/internal-types.ts` — `RawEntry.tags`
- `src/core/model.ts` — `Entry.tags`
- `src/core/scan/enrich.ts` — propagation `tags`
- `src/core/export/write-model.ts` — `PREFERRED_KEYS`
- `src/core/tags/filter.ts` — **nouveau fichier** : API interne pure
- `src/core/templates/helpers.ts` — helpers `filterByTag` + `collectAllEntries`
- `src/plugins/types.ts` — `PluginContext.tags`
- `src/core/build.ts` — câblage `pluginContextBase.tags`
- `templates/layout/post.hbs` — affichage tags (template par défaut)
- `website-example/_templates/layout/entry.hbs` — affichage tags (template custom)
- `website-example/` — données de test (3-4 fichiers `tags.webt`)

---

## Checks to run

1. `bunx tsc --noEmit` — zéro erreur TypeScript
2. `bun run build -v website-example` — build propre, zéro warning nouveau
3. Inspecter le HTML d'une entry taguée : `<div class="entry-tags">` visible
4. Inspecter l'export JSON (`_public/`) d'une entry taguée : champ `tags` présent

---

## Evidence expected

- `bunx tsc --noEmit` ✅ zéro erreur
- `bun run build -v website-example` ✅ build propre
- HTML d'au moins une entry contient `<span class="tag">...</span>`
- Export JSON d'une entry contient `"tags": ["...", "..."]`
- Diff visible : `readTagsFile` dans `raw-scan.ts`, `tags?` dans `internal-types.ts` et `model.ts`, propagation dans `enrich.ts`, `PREFERRED_KEYS` mis à jour, `filter.ts` créé, helpers enregistrés, `PluginContext` étendu, `pluginContextBase` câblé, templates mis à jour

---

## Constraints and traps

- **Deux points de scan** : `scanStructureFolderRaw()` et `listRootIndexRaw()` doivent tous les deux appeler `readTagsFile()` — ne pas en oublier un.
- **`normalizeTags` split par virgule** : "design,ux" → `["design", "ux"]`. Si un tag lui-même contient une virgule (cas douteux), il sera splitté — acceptable pour la beta, hors scope de validation.
- **Helper `collectAllEntries` — `this` context** : en Handlebars, `this` dans un helper de type block ou subexpression peut ne pas avoir `this.collections` selon le call site. Le helper doit prioriser l'argument positionnel explicite et ne fallback sur `this.collections` qu'en absence d'argument.
- **`model.rootEntries` dans le contexte template** : `model` est dans `renderBaseContext` et donc disponible partout. `model.rootEntries` peut être `undefined` si le site n'a pas de root entries — guard nécessaire.
- **`PluginContext.tags` et imports circulaires** : `types.ts` (plugins) importe depuis `core/model` (Entry, Collection) et `core/tags/filter` — vérifier qu'aucun import circulaire n'est introduit. `filter.ts` ne doit importer que `model.ts`, pas `build.ts` ni `plugins/types.ts`.
- **Variable de contexte dans les templates** : les tags sont sur `entry.tags`, pas directement `tags` (qui n'est pas dans le contexte Handlebars).
- **`RawCollection`** : ne pas ajouter `tags` à `RawCollection` dans cette story — hors scope.
- **Aucun changement de comportement** attendu sur les entries sans `tags.webt`.

---

## Dev log

- 2026-03-14 — Implémentation complète en 11 étapes (+ 1 correctif non prévu).

  **Étapes 1–5 — Modèle (raw-scan → internal-types → model → enrich → write-model) :**
  Chaîne de propagation ajoutée de `readTagsFile()` jusqu'à l'export JSON. Pattern identique à `description`/`displayName`.

  **Étape 6 — `src/core/tags/filter.ts` :**
  Module pur créé. Pas d'imports circulaires : `filter.ts` n'importe que `model.ts`.

  **Étape 7 — helpers.ts :**
  Helpers `filterByTag` et `collectAllEntries` enregistrés. Le fallback `this.collections` est gardé derrière l'argument positionnel explicite, conformément au piège documenté.

  **Étapes 8–9 — PluginContext + build.ts :**
  `tags` exposé sur `PluginContext` et câblé dans `pluginContextBase`. Aucun import circulaire.

  **Étapes 10–11 — Templates + données de test :**
  Section `{{#if entry.tags}}` ajoutée dans `post.hbs` et `entry.hbs`. 4 fichiers `tags.webt` ajoutés dans `website-example` (1 tag, 2 tags, 3 tags, tags partagés entre entries).

  **Correctif inattendu — `derived-views.ts` :**
  - Observed issue : après build, le champ `tags` était absent du JSON export et du HTML, malgré TSC vert.
  - Root cause : `rawEntryFromStructure()` dans `derived-views.ts` reconstruit explicitement le `RawEntry` depuis le `RawStructureEntryNode` — il ne fait pas de spread complet. Tout nouveau champ doit y être ajouté manuellement. `SiteStructureEntryNode` (dans `model.ts`) n'avait pas non plus `tags`, donc TypeScript n'avait pas détecté le champ manquant.
  - Chosen fix : ajout de `tags?: string[]` sur `SiteStructureEntryNode` + propagation `...(node.tags ? { tags: node.tags } : {})` dans `rawEntryFromStructure()`.
  - Tradeoff : correctif minimal, pas de refacto du pattern. Ce piège s'appliquera à tout futur champ ajouté sur `RawEntry` via le scan récursif.
  - Evidence : `bun run build website-example` → JSON `introduction.json` contient `"tags": ["getting-started", "tutorial"]`, HTML contient `<div class="entry-tags">`.

  **Checks :**
  - `bunx tsc --noEmit` → ✅ zéro erreur
  - `bun run build website-example` → ✅ build propre, zéro warning nouveau
  - `grep "entry-tags" website-example/_public/playground/introduction/index.html` → ✅ `<div class="entry-tags"><span class="tag">getting-started</span><span class="tag">tutorial</span></div>`
  - `cat _public/_model/entries/playground/introduction.json | .tags` → ✅ `["getting-started", "tutorial"]`

- 2026-03-14 — Amélioration : `rawEntryFromStructure` simplifié (liste blanche → destructuring).
  Why this way:
  - Observed issue : la liste blanche manuelle est un piège silencieux — tout nouveau champ de scan doit y être ajouté à la main, sans détection TypeScript.
  - Root cause : la fonction reconstruisait le `RawEntry` champ par champ au lieu d'utiliser le spread, parce que `RawStructureEntryNode` a `kind` en plus.
  - Chosen fix : `const { kind: _kind, ...rest } = node; return rest;` — TypeScript vérifie la compatibilité structurelle automatiquement.
  - Tradeoff : aucun. Les deux types sont structurellement identiques sauf `kind`.
  - Evidence : `bunx tsc --noEmit` ✅ + `bun run build website-example` ✅ + HTML/JSON tags toujours présents.

- 2026-03-14 — Ajustements post-implémentation (demandes user avant validation).
  - Header JSDoc ajouté dans `filter.ts`.
  - `tags.webt` → `tag.webt` (renommage dans `raw-scan.ts` + 4 fichiers existants).
  - `tag.webt` ajouté sur toutes les entries de `website-example` avec des tags logiques (tutorial, demo, credits, legal, plugin…).
  - Fonctions `getCollectionTags` et `getSiteTags` ajoutées dans `filter.ts`.
  - Helpers `getCollectionTags` et `getSiteTags` enregistrés dans `helpers.ts`.
  - Evidence : `bunx tsc --noEmit` ✅ + `bun run build website-example` ✅ + 19 entries JSON vérifiées avec leurs tags.

---

## Pilot exchange

- 2026-03-14 — Dev -> Pilot — Note doc : cette story introduit des comportements user-visible (fichier `tag.webt`, helpers `filterByTag`/`collectAllEntries`/`getCollectionTags`/`getSiteTags`, `PluginContext.tags`). Le piège `rawEntryFromStructure` est réglé (destructuring). À documenter si ArPiDoc est actif.

- 2026-03-14 — Pilot -> Pilot (backlog) — Tags cliquables / pages de tags statiques.
  **Contexte** : Les tags sont actuellement rendus comme `<span>` non cliquables. Question user : pourrait-on les rendre cliquables et renvoyer vers une vue filtrée des entrées par tag ?
  **Analyse** : Deux approches possibles — (A) pages statiques générées au build, (B) filtrage client-side JS. Option A retenue car cohérente avec la philosophie SSG de Webette (pas de JS, SEO-friendly).
  **Specs retenues pour T5-S04-b** :
  - Config utilisateur pour activer/désactiver le système de tags globalement (`tags.enabled`) => default true
  - Config utilisateur pour activer/désactiver la génération des pages de tags (`tags.generatePages`) => default true
  - Tout activé par défaut (`true`), chaque type de page désactivable individuellement
  - Pages générées :
    - `example.com/tag/` — liste de tous les tags du site
    - `example.com/tag/{mon-tag}/` — liste des entrées taguées `mon-tag` (toutes collections confondues)
    - `example.com/{collection}/tag/` — liste de tous les tags de la collection
    - `example.com/{collection}/tag/{mon-tag}/` — liste des entrées de la collection taguées `mon-tag`
  - Nouveaux templates nécessaires : `tag-index.hbs` (liste des tags) et `tag-page.hbs` (liste d'entrées filtrées)
  - Nouveau concept webette : pages "virtuelles" générées programmatiquement (non liées à un `.webt`)
  - Mise à jour des templates entry existants : `<span class="tag">` → `<a href="..." class="tag">`
  **Action** : Créer story T5-S04-b au moment opportun.
