# T6-S02 — HandlebarsContext typé : supprimer les `as any` dans helpers.ts

Created: 2026-03-18
Closed: 2026-03-18
Acceptance: User

Status: Done

## Goal
Créer un type `TemplateRoot` qui reflète la shape du contexte passé aux templates Handlebars, puis l'utiliser dans `helpers.ts` pour supprimer les 16 `as any` par un typage strict.

## Context / recon

### Shape du root (depuis `build.ts:644`)
```ts
{
  model: Site,                          // le modèle complet
  site: SiteConfig & { createdAt, updatedAt, fingerprint },
  collections: Collection[],
  layoutName: string,
  buildTime: ...,
  liveReloadScript: string | undefined,
  templates?: { assetsBase: string },
  iconsHead: string,
  tagPagesEnabled: boolean,
  tagScopeByCollection: boolean,
  // champs injectés par page au moment du rendu :
  collection?: Collection,
  entry?: Entry,
  // ... prev, next, etc.
}
```

Le context root est typé `Record<string, unknown>` à la frontière (`renderBaseContext: Record<string, unknown>` dans `render.ts:18`). `Handlebars.HelperOptions` expose `data?.root` comme `any`.

### Patterns `as any` dans `helpers.ts` (16 occurrences)

| Pattern | Localisation |
|---|---|
| `options: any` | `resolveLocaleFromContext` (l.105), `resolveDefaultVariantFromContext` (l.115), `resolveAssetsBaseFromContext` (l.121), `displayName` (l.65), `renderSocialHead` (l.187) |
| `(root as any).site` / `.model` / `.logging` / `.templates` | 6 occurrences dans les 3 `resolveXxxFromContext` + `image` helper |
| `block: any` | `imageSrc` (l.135), `image` (l.143) |
| `(flags as any)` / `(value as any)` / `(context as any)` | checks Handlebars options shape (`'hash' in x`) — 5 occurrences |
| `(model as any).collections` / `.rootEntries` | `withCollection` (l.334), `withEntry` (l.348) |

### Approche retenue
1. Créer `src/core/templates/types.ts` avec :
   - `TemplateRoot` : shape du root context
   - `isHbsOptions(v)` : type guard pour détecter un Handlebars options object (remplace les checks `'hash' in (x as any)`)
   - Helper typé : `resolveRoot(options: Handlebars.HelperOptions): TemplateRoot`
2. Remplacer `options: any` par `Handlebars.HelperOptions` dans les callbacks helpers
3. Utiliser `resolveRoot(options)` à la place de `(root as any).X` — une seule assertion à la frontière dans `resolveRoot`
4. Typer `block` comme `Block | unknown` (avec un guard existant ou inline `block?.type === 'image'`)
5. Remplacer les 5 checks `'hash' in (x as any)` par le type guard `isHbsOptions(x)`

## In scope
- Créer `src/core/templates/types.ts` avec `TemplateRoot`, `isHbsOptions`, `resolveRoot`
- Modifier `src/core/templates/helpers.ts` : supprimer tous les `as any`, utiliser les nouveaux types
- Zero `as any` dans `helpers.ts` en résultat (ou justification explicite si impossible sans cast unsafe)

## Out of scope
- Rétro-compatibilité : aucune (T6 pre-beta, cf. TASKS.md)
- Typer le contexte dans d'autres fichiers que `helpers.ts`
- Modifier `renderBaseContext` dans `build.ts` ou `render.ts`
- Typer strictement tous les partials Handlebars

## Execution brief
1. **Créer `src/core/templates/types.ts`** :
   - `TemplateRoot` interface : `model?: Site`, `site?: SiteConfig & { createdAt?: ...; updatedAt?: ...; fingerprint?: string }`, `collections?: Collection[]`, `templates?: { assetsBase?: string }`, `logging?: { locale?: string }`, `collection?: Collection`, `entry?: Entry`, `tagScopeByCollection?: boolean`, plus champs scalaires (`layoutName`, `buildTime`, etc.)
   - `isHbsOptions(v: unknown): v is Handlebars.HelperOptions` — type guard : `v != null && typeof v === 'object' && 'hash' in v && 'data' in v`
   - `resolveRoot(options: Handlebars.HelperOptions): TemplateRoot` — une seule assertion `as TemplateRoot` à la frontière

2. **Modifier `helpers.ts`** :
   - Importer `TemplateRoot`, `isHbsOptions`, `resolveRoot` depuis `./types`
   - Remplacer `options: any` → `options: Handlebars.HelperOptions` dans tous les callbacks et fonctions helper internes
   - Remplacer les patterns `(root as any).X` par `resolveRoot(options).X`
   - Remplacer les 5 checks `'hash' in (x as any)` par `isHbsOptions(x)`
   - Typer `block` en `Block | unknown` dans `imageSrc`/`image` + utiliser un guard (`block?.type === 'image'` déjà présent)
   - `(model as any).collections` → accéder via `resolveRoot(options).model?.collections`

## Files / areas involved
- **Créer** : `src/core/templates/types.ts`
- **Modifier** : `src/core/templates/helpers.ts`

## Constraints and traps
- `Handlebars.HelperOptions` type : `data` est optionnel et `root` est typé `any` — l'assertion `as TemplateRoot` dans `resolveRoot` est la seule escape hatch acceptable.
- Les helpers `displayName`, `renderSocialHead`, `tagRoute` utilisent un pattern "arity detection" (détecter si le premier arg est en fait l'objet options) — conserver le même pattern, juste remplacer `as any` par `isHbsOptions`.
- Ne pas changer le comportement runtime des helpers.
- `block: any` dans `imageSrc`/`image` : typer en `unknown` et ajouter `if (!block || typeof block !== 'object' || (block as Block).type !== 'image') return ''` si le guard manque — mais ne pas refactoriser la logique interne du helper.
- `Handlebars.HelperOptions` a `hash: any` par défaut — acceptable, ne pas créer un type pour `hash`.

## Done when
- [x] `src/core/templates/types.ts` créé avec `TemplateRoot`, `isHbsOptions`, `resolveRoot`
- [x] `helpers.ts` : zéro `as any` (vérifiable avec `grep "as any" src/core/templates/helpers.ts`)
- [x] `bunx tsc --noEmit` sans erreur
- [x] `bun run build -v website-example` sans erreur ni régression

## Checks to run
- `grep "as any" src/core/templates/helpers.ts` — doit retourner vide
- `bunx tsc --noEmit` — zéro erreur TypeScript
- `bun run build -v website-example` — build complet, rendu identique

## Evidence expected
- Contenu de `src/core/templates/types.ts`
- Résultat `grep "as any"` vide
- `bunx tsc --noEmit` ✅
- `bun run build -v website-example` ✅

## Pending reason

## Remaining work

## Resume condition

## Commit proposal

```
refactor(templates): add TemplateRoot type and eliminate as any in helpers.ts

- src/core/templates/types.ts (new): TemplateRoot interface, isHbsOptions type
  guard, resolveRoot helper — single as TemplateRoot assertion point
- src/core/templates/helpers.ts: options: any → Handlebars.HelperOptions,
  (root as any).X → resolveRoot(options).X, arity detection → isHbsOptions(),
  block: any → block: unknown + isImageBlock guard, local isHbsOptions in
  tagRoute removed, withCollection/withEntry use root.model?.collections
- src/core/templates/image-utils.ts: export isImageBlock type guard
```

## Pilot exchange

## Dev log

- Créé `src/core/templates/types.ts` : `TemplateRoot`, `isHbsOptions`, `resolveRoot`
- `helpers.ts` : toutes les occurrences `as any` supprimées — `options: any` → `Handlebars.HelperOptions`, `(root as any).X` → `resolveRoot(options).X`, arity detection → `isHbsOptions(x)`, `block: any` → `block: unknown` + guard
- `withCollection`/`withEntry` : `(model as any).collections` → `root.model?.collections ?? root.collections ?? []`
- `tagRoute` : local `isHbsOptions` inline supprimé, utilise l'import
- `/simplify` : ajout de `isImageBlock` dans `image-utils.ts` pour dédupliquer le guard inline dans `imageSrc`/`image`
- `bunx tsc --noEmit` ✅, `bun run build -v website-example` ✅
- Rappel : faire un commit avant de passer à la prochaine story (`/simplify` est déjà fait)
