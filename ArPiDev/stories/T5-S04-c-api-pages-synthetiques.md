# T5-S04-c — API interne de génération de pages synthétiques

**Story ID**: T5-S04-c
**Parent**: T5 — Plugins & configuration (beta)
**Status**: To Do, Validated
**Active**: no
**Created**: 2026-03-16
**Closed**: —

---

## Goal

Exposer une API propre et stable permettant aux plugins Webette de générer des pages statiques arbitraires — en unifiant ce pattern avec `renderTagPages` via un utilitaire `renderPage` partagé.

Les tags restent core et continuent d'utiliser leur propre logique ; le refactor les fait simplement passer par la même factory `renderPage` que les plugins.

---

## In scope

- Extraire une factory `createRenderPage` (utilitaire partagé), avec un type `RenderPage` exporté
- Refactorer `renderTagPages` pour recevoir et utiliser ce `RenderPage` au lieu de sa fonction locale
- Supprimer les `registerExpectedDir` tags dans `build.ts` : le `renderPage` gère `addExpectedOutput` automatiquement
- Ajouter le hook `onGeneratePages` dans l'interface `Plugin` et le type `RenderPage` dans `types.ts`
- Implémenter `runOnGeneratePages` dans `runner.ts` (pattern identique aux autres runners)
- Brancher `runOnGeneratePages` dans `build.ts` après `renderTagPages`, avant `writeSitemap`
- Ajouter `addReservedRoute(segment: string): void` dans `PluginContext` + rendre `resolveSystemSlugCollisions` extensible (les plugins déclarent leurs segments réservés dans les hooks early)
- Documentation du hook pour les auteurs de plugins (emplacement à déterminer par Dev lors du recon)

---

## Out of scope

- Modifier le comportement ou le rendu des pages de tags (non-régression stricte)
- Intégrer le sitemap pour les pages générées par les plugins
- Valider le contexte passé par les plugins
- Refactorer `renderEntryTo` dans `renderSite` : même pattern FS mais contexte entry-specific (prevEntry, nextEntry, layout resolution) — candidat T6, pas T5-S04-c

---

## Done when

1. `renderTagPages` refactorisée utilise `RenderPage` — rendu de `_public/tag/` identique avant/après sur `website-example`
2. Les `registerExpectedDir` tags dans `build.ts` sont supprimés ; `pruneOrphans` ne supprime pas les pages de tags
3. Un plugin peut implémenter `onGeneratePages` et générer une page qui : apparaît dans `_public/`, n'est pas supprimée par `pruneOrphans`, TypeScript compile sans erreur
4. Un plugin peut appeler `ctx.addReservedRoute('mon-segment')` dans `onInit`/`onScan`/`onResolved` — toute entry ou collection avec ce slug est automatiquement renommée
5. Documentation du hook présente avec signature, comportement de `renderPage` (merge contexte, `addExpectedOutput` automatique), `addReservedRoute`, et exemple minimal

---

## Execution brief

### Étape 1 — Factory `createRenderPage`

Créer la factory (dans `build.ts` en closure ou dans un fichier dédié `src/core/build/render-synthetic-page.ts` selon ce que le recon révèle être plus propre).

**Type `RenderPage` :**

```typescript
type RenderPage = (opts: {
  route: string                        // ex: '/my-plugin/' — converti en chemin FS
  layoutName: string                   // template Handlebars à utiliser
  context?: Record<string, unknown>    // données supplémentaires, mergées sur renderBaseContext
}) => Promise<boolean>                 // true si le fichier a été écrit (writeIfChanged)
```

**Factory :**

```typescript
function createRenderPage(opts: {
  outputDir: string
  templateRenderer: { render: (ctx: Record<string, unknown>) => string }
  renderBaseContext: Record<string, unknown>
  writeIfChanged: (path: string, content: string) => Promise<boolean>
  formatHtml: (html: string, path: string) => Promise<string>
  addExpectedOutput?: (relativePath: string) => void
}): RenderPage
```

Internalement :
- convertit `route` → `targetDir` via `path.join(outputDir, stripRouteSlashes(route))`
- merge `{ ...renderBaseContext, layoutName, ...context }` (layoutName pris du param dédié, non écrasable via context)
- rend via `templateRenderer.render(mergedContext)`
- `mkdir(targetDir, { recursive: true })`
- `formatHtml` → `writeIfChanged`
- appelle `addExpectedOutput(path.relative(outputDir, indexPath))` si fourni
- retourne le booléen de `writeIfChanged`

### Étape 2 — Refactor `renderTagPages`

`renderTagPages` reçoit un `renderPage: RenderPage` dans ses options (en remplacement de la factory locale actuelle).

Migration des appels internes :
- `renderPage(path.join(outputDir, 'tag'), context)` → `renderPage({ route: '/tag/', layoutName: TAG_INDEX_LAYOUT, context: { tags, entry } })`
- Idem pour les variantes collection avec `route: '/${routeRelative}/tag/'` etc.

Retirer de la signature : `outputDir` n'est plus nécessaire dans `renderTagPages` si `renderPage` gère les chemins. À ajuster selon ce que le recon révèle être le plus propre.

Vérifier que le count de pages est toujours correct (`renderPage` retourne `Promise<boolean>`).

### Étape 3 — Nettoyage `build.ts` côté tags

Supprimer les blocs `registerExpectedDir` pour les tags (lignes 716-728 au moment du recon). Ces enregistrements deviennent redondants car `renderPage` appelle `addExpectedOutput` par fichier. Vérifier que `pruneOrphans` ne supprime rien après ce changement.

### Étape 4 — Hook `onGeneratePages` dans `types.ts`

```typescript
// Ajouter l'export du type
export type RenderPage = (opts: {
  route: string
  layoutName: string
  context?: Record<string, unknown>
}) => Promise<boolean>

// Ajouter dans Plugin interface
onGeneratePages?: (
  site: Site,
  ctx: PluginContext & { renderPage: RenderPage }
) => Promise<void> | void
```

### Étape 5 — `runOnGeneratePages` dans `runner.ts`

Pattern identique à `runOnResolved` :

```typescript
export async function runOnGeneratePages(
  plugins: LoadedPlugin[],
  site: Site,
  ctx: PluginContext,
  renderPage: RenderPage
): Promise<void> {
  for (const plugin of plugins) {
    if (!plugin.onGeneratePages) continue
    try {
      const pluginCtx = {
        ...ctx,
        pluginId: plugin.pluginId,
        thisPluginConfig: ctx.pluginConfig?.[plugin.pluginId] as ...,
        renderPage,
      }
      await plugin.onGeneratePages(site, pluginCtx)
    } catch (err) {
      logError(ctx.logger, plugin.pluginId, 'onGeneratePages', err)
    }
  }
}
```

### Étape 6 — Branchement dans `build.ts`

Instancier la factory après la compilation du `templateRenderer` (déjà disponible à ce stade) :

```typescript
const renderSyntheticPage = createRenderPage({
  outputDir,
  templateRenderer,
  renderBaseContext,
  writeIfChanged,
  formatHtml,
  addExpectedOutput: registerExpectedOutput,
})
```

Passer `renderSyntheticPage` à `renderTagPages` (step 2) et à `runOnGeneratePages`.

Appel `runOnGeneratePages` : après `renderTagPages`, avant `writeSitemap`.

### Étape 7 — `addReservedRoute` dans `PluginContext` et `resolveSystemSlugCollisions`

**Dans `PluginContext` (`types.ts`) :**

```typescript
addReservedRoute: (segment: string) => void  // déclare un segment top-level réservé
```

**Dans `build.ts` :** collecter les segments via un array `pluginReservedRoutes: string[]`, peuplé par les hooks `onInit`/`onScan`/`onResolved` (le `PluginContext` reçoit un closure sur ce tableau). Passer à `resolveSystemSlugCollisions`.

**Dans `resolve-system-slugs.ts` :** `resolveSystemSlugCollisions` accepte un second paramètre optionnel `extraReserved: string[] = []` — mergé avec `SYSTEM_SLUGS` pour construire le `systemSet`. Tags migrent automatiquement (ils sont toujours dans `SYSTEM_SLUGS`, rien ne change pour eux).

**Timing :** `addReservedRoute` est utile uniquement avant `resolveSystemSlugCollisions`. Si un plugin l'appelle dans `onGeneratePages` (trop tard), émettre un warning (ou ignorer silencieusement — à décider par Dev).

### Étape 8 — Plugin de test dans `website-example`

Créer un plugin minimal dans `website-example` (ex: `plugins/test-generate-pages/`) qui :
- déclare `onGeneratePages`
- appelle `ctx.addReservedRoute('demo-plugin')` dans `onInit`
- génère 2 pages via `renderPage` : `/demo-plugin/` et `/demo-plugin/sub-page/`
- utilise un layout simple (peut réutiliser un layout existant de `website-example`)

Ce plugin reste dans le repo à titre d'exemple documenté et de test de non-régression.

### Étape 9 — Documentation

Chercher l'emplacement de la doc plugin existante (website-example, docs/, README plugin, etc.). Créer ou compléter avec :
- Signature du hook `onGeneratePages`
- Ce que `renderPage` fait (merge sur `renderBaseContext`, `addExpectedOutput` automatique, `layoutName` dédié)
- `addReservedRoute` : quand et pourquoi l'utiliser, contrainte de timing (hooks early uniquement)
- Note sur `extendTemplates` pour les layouts custom du plugin
- Pointer vers le plugin `test-generate-pages` comme exemple concret

---

## Files / areas likely involved

| Fichier | Nature du changement |
|---------|----------------------|
| `src/core/build.ts` | Instancier `renderSyntheticPage`, passer à `renderTagPages`, appeler `runOnGeneratePages`, supprimer `registerExpectedDir` tags, collecter `pluginReservedRoutes` |
| `src/core/build/tag-pages.ts` | Recevoir et utiliser `RenderPage`, supprimer factory locale |
| `src/core/build/resolve-system-slugs.ts` | Accepter `extraReserved: string[]` en paramètre optionnel |
| `src/plugins/types.ts` | Ajouter `RenderPage`, hook `onGeneratePages`, `addReservedRoute` dans `PluginContext` |
| `src/plugins/runner.ts` | Ajouter `runOnGeneratePages` |
| `src/core/build/render-synthetic-page.ts` (éventuellement) | Factory `createRenderPage` si extrait en fichier dédié |
| `website-example/plugins/test-generate-pages/` | Plugin de test/exemple |
| Doc plugin (emplacement à confirmer) | Section `onGeneratePages` + `addReservedRoute` |

---

## Constraints and traps

- **`registerExpectedDir` vs `addExpectedOutput`** : le passage de subtree-prefix à per-file doit couvrir tous les fichiers écrits. Si `renderTagPages` écrit N fichiers, `addExpectedOutput` doit être appelé N fois. Vérifier que `pruneOrphans` ne supprime aucun fichier de tag après le changement.
- **`layoutName` non écrasable via `context`** : le merge doit appliquer `layoutName` depuis le param dédié, pas depuis `context` (qui pourrait contenir une clé `layoutName` par accident). Utiliser spread ordre : `{ ...renderBaseContext, ...context, layoutName }`.
- **`outputDir` dans `renderTagPages`** : si `renderPage` absorbe la gestion des chemins, `outputDir` peut disparaître des options de `renderTagPages`. Vérifier qu'il n'est pas utilisé ailleurs dans la fonction.
- **Count de pages** : `renderTagPages` retourne `Promise<number>`. `RenderPage` retourne `Promise<boolean>` pour permettre le comptage. Ne pas casser ce mécanisme de log.
- **TypeScript strict** : les `as Record<string, unknown> | undefined` dans `runOnGeneratePages` doivent suivre le même pattern que les autres runners pour éviter les incohérences.
- **`addReservedRoute` timing** : n'a d'effet que si appelé avant `resolveSystemSlugCollisions` (étapes `onInit`/`onScan`/`onResolved`). Un appel dans `onGeneratePages` est trop tard — décider si warning ou silence, le noter dans la doc.
- **`SYSTEM_SLUGS` reste la source de vérité core** : `extraReserved` est additif, ne remplace pas. Les tags restent dans `SYSTEM_SLUGS` sans changement.

---

## Checks to run

- `bun run build` sur `website-example` sans erreur TS ni runtime
- Contenu de `_public/tag/` identique avant/après le refactor
- `pruneOrphans` ne supprime pas `_public/tag/` ni ses sous-dossiers
- Plugin `test-generate-pages` : `_public/demo-plugin/index.html` et `_public/demo-plugin/sub-page/index.html` générés et non supprimés
- Nommer une entry ou collection `demo-plugin` dans `website-example` → warning de renommage automatique dans les logs (vérifie `addReservedRoute`)
- `bun run typecheck` (ou équivalent) sans erreur

---

## Evidence expected

- Diff `_public/tag/` avant/après : identique
- Confirmation TypeScript compile propre
- Arborescence `_public/demo-plugin/` avec `index.html` et `sub-page/index.html`
- Log de renommage affiché quand une entry s'appelle `demo-plugin`

---

## Pilot exchange

*(échanges Pilot ↔ Dev en cours de story)*

---

## Commit proposal

*(à finaliser à la clôture — peut évoluer pendant l'implémentation)*

```
feat(plugins): add onGeneratePages hook and shared renderPage utility

- Extract createRenderPage factory (route-based, handles addExpectedOutput)
- Refactor renderTagPages to use RenderPage (no behavior change)
- Add addReservedRoute to PluginContext, make resolveSystemSlugCollisions extensible
- Add onGeneratePages hook to Plugin interface and runner
- Wire runOnGeneratePages in build pipeline (after tag pages, before sitemap)
- Add test-generate-pages example plugin in website-example
- Document onGeneratePages, renderPage and addReservedRoute for plugin authors
```

---

## Dev log

*(entrées ajoutées au fil de l'implémentation)*
