# T5-S05 — Séparation config outil vs config site

**Story ID**: T5-S05
**Parent**: T5 — Plugins & configuration (beta)
**Status**: Ready
**Active**: no
**Created**: 2026-03-15
**Closed**: —

---

## Goal

Établir une frontière nette entre `webette.tool.ts` (config de l'outil) et `webette.config.ts` (config du site). Supprimer le chevauchement actuel sur `templates`, `images`, `audio`, `video`, `markdown`. Corriger l'incohérence interne du modèle runtime où `images`, `audio`, `video`, `markdown`, `sorting` aboutissent dans `site.site` au lieu de `site.config`.

La story part peut-être dans tous les sens. Prévoir une restructuration de la story avant de faire quoi que ce soit d'autre. But principal : avoir une utilisation cohérente, simple et logique des fichiers de config, sans duplication, de même pour leur consommation dans le code.

---

## Contexte / état actuel (recon)

### Les deux fichiers — chevauchement actuel

`webette.tool.ts` contient aujourd'hui : `logging`, `serve`, `build`, **`templates`**, **`images`**, **`audio`**, **`video`**, **`markdown`**.

`webette.config.ts` contient : `site`, `collections`, `sorting`, `tags`, `plugins`, `pluginConfig`, **`templates`**, **`images`**, **`audio`**, **`video`**, **`markdown`**.

Les 5 sections en gras se retrouvent dans les deux fichiers : `webette.tool.ts` fournit les défauts, `webette.config.ts` peut les surcharger. C'est la duplication visible.

**Décision de séparation :**

- `webette.tool.ts` = opération de l'outil uniquement : `logging`, `serve`, `build`.
- `webette.config.ts` = tout ce qui concerne le site : contenu, identité, traitement. Les sections `templates`, `images`, `audio`, `video`, `markdown` n'appartiennent qu'au fichier site.

**Cas `templates` :** `templates.root` dans `webette.tool.ts` pointe vers les templates embarqués de l'outil — mais en pratique personne ne change ce chemin via `webette.tool.ts`. Les défauts (`root: "templates"`, noms de fichiers) restent hardcodés dans `defaultEnv` de `env.ts` (consommés par le template resolver), mais ne sont plus une option utilisateur dans `webette.tool.ts`. `WebetteEnv.templates` et `defaultEnv.templates` restent dans `env.ts` comme constants internes — seule `WebetteEnvOverrides.templates` disparaît.

### L'incohérence runtime

Dans `createSite()` (`src/core/config.ts`), les sections top-level de `webette.config.ts` suivent deux chemins différents vers le modèle `Site` :

| Section config | Destination runtime | Attendu |
|---|---|---|
| `site.*` | `site.site` ✅ | correct |
| `images`, `audio`, `video`, `markdown`, `sorting` | **`site.site`** ❌ | devrait être `site.config` |
| `collections`, `templates`, `plugins`, `pluginConfig`, `tags` | `site.config` ✅ | correct |

Conséquence : les consommateurs doivent savoir quel chemin utiliser. `block-types/image/config.ts` lit `site.site.images`, `build/sorting.ts` lit `site.site.sorting`, mais `build.ts` lit `site.config.tags`. Incohérent.

### Consommateurs de `site.site.*` à migrer

| Fichier | Lit depuis |
|---|---|
| `src/core/build/sorting.ts:309–310` | `site.site.sorting` |
| `src/core/build/icons.ts:98` | `site.site` (section `icons`) — reste dans `site.site` car `icons` est sous la clé `site:` dans le config |
| `src/core/resolve/resolvers/markdown.ts:23–24` | `site.site.markdown` |
| `src/core/scan/index.ts:23–24` | `site.site.markdown` |
| `src/core/block-types/audio/config.ts:36–37` | `site.site.audio` |
| `src/core/block-types/video/config.ts:35–36` | `site.site.video` |
| `src/core/block-types/image/config.ts:97–98` | `site.site.images` |

`icons` et `social` restent dans `site.site` : ils sont déclarés sous la clé `site:` dans `webette.config.ts`, ce qui est correct.

### Defaults `env.ts`

`src/config/env.ts` est la source de vérité pour les défauts de l'outil. Il contient aujourd'hui des défauts + un merge pour `images`, `audio`, `video`, `markdown` (via `WebetteEnv`, `WebetteEnvOverrides`, `mergeEnv()`). Ces defaults sont utilisés par les config-readers des block-types. Après suppression de ces sections de `webette.tool.ts`, les defaults doivent migrer : soit inline dans chaque config-reader, soit dans une constante dédiée dans `env.ts` (non exposée à l'utilisateur). **À décider par Dev — les deux sont acceptables.**

---

## In scope

- **Étape A** : supprimer `templates`, `images`, `audio`, `video`, `markdown` de `webette.tool.ts` (fichier utilisateur).
- **Étape B** : dans `src/config/env.ts` — supprimer `templates` de `WebetteEnvOverrides` et son bloc de `mergeEnv()` (`WebetteEnv.templates` et `defaultEnv.templates` restent intacts) ; supprimer `images`, `audio`, `video`, `markdown` de `WebetteEnv`, `WebetteEnvOverrides`, et `mergeEnv()` ; les defaults migrent (inline ou constante interne).
- **Étape C** : corriger `createSite()` dans `src/core/config.ts` — les sections `images`, `audio`, `video`, `markdown`, `sorting` ne sont plus mergées dans `site.site` ; elles sont stockées dans `site.config`.
- **Étape D** : mettre à jour le type `Site` dans `src/core/model.ts` — ajouter `images?`, `audio?`, `video?`, `markdown?`, `sorting?` à `site.config` (comme les autres sections déjà présentes).
- **Étape E** : migrer les consommateurs (7 fichiers, tableau ci-dessus) de `site.site.*` vers `site.config?.*`.
- **Étape F** : mettre à jour `docs/webette.tool.md` — retirer les sections `images`, `audio`, `video`, `markdown`.

## Out of scope

- Changer le format de `webette.config.ts` côté utilisateur (les clés `images`, `audio`, etc. restent au même endroit).
- Restructurer le contexte plugin (`siteConfig` dans `build.ts:290` reste `site.site` — identité site pure après le fix, ce qui est correct).
- Typer `site.site` strictement (c'est T6-S02).
- Toucher à `webette.tool.ts` pour autre chose que les 5 sections concernées.

---

## Done when

- [ ] `webette.tool.ts` (racine) ne contient plus `templates`, `images`, `audio`, `video`, `markdown` — uniquement `logging`, `serve`, `build`.
- [ ] `WebetteEnvOverrides` dans `env.ts` ne contient plus `templates`, `images`, `audio`, `video`, `markdown` ; `WebetteEnv.templates` et `defaultEnv.templates` sont préservés (internes).
- [ ] `createSite()` ne merge plus `images`/`audio`/`video`/`markdown`/`sorting` dans `site.site`.
- [ ] Ces 5 sections sont accessibles via `site.config.images`, `.audio`, `.video`, `.markdown`, `.sorting`.
- [ ] Les 7 consommateurs listés lisent depuis `site.config?.*` et non plus `site.site.*`.
- [ ] `ImageFit`, `ImageFormat` déplacés dans `model.ts` ; `ImageVariantChoice` supprimé au profit de `ImageVariantName` (déjà présent) ; import dans `image/config.ts` mis à jour.
- [ ] `bunx tsc --noEmit` ✅
- [ ] `bun run build -v website-example` ✅ — rendu identique à avant (pas de régression)

---

## Execution brief

### Étape A — `webette.tool.ts`

Retirer les 5 clés `templates`, `images`, `audio`, `video`, `markdown`. Garder uniquement : `logging`, `serve`, `build`.

### Étape B — `src/config/env.ts`

**Sous-étape B1 — `templates` :**
- Retirer `templates` de `WebetteEnvOverrides` et son bloc de merge dans `mergeEnv()`.
- Conserver `WebetteEnv.templates` et `defaultEnv.templates` intacts (consommés par le template resolver — pas de migration consommateurs).

**Sous-étape B2 — `images`, `audio`, `video`, `markdown` :**
1. Retirer `images`, `audio`, `video`, `markdown` de `WebetteEnv`, `WebetteEnvOverrides` et `defaultEnv`.
2. Retirer les blocs merge correspondants de `mergeEnv()`.
3. **Migration des types utilitaires image :** `ImageFit`, `ImageFormat`, `ImageVariantChoice` sont des types de contenu site — les déplacer dans `src/core/model.ts`. `ImageVariantChoice` est un doublon de `ImageVariantName` déjà présent dans `model.ts` : supprimer `ImageVariantChoice`, utiliser `ImageVariantName` partout. Mettre à jour l'import dans `block-types/image/config.ts` : `env.ts` → `model.ts`. `ImagesEnv`, `AudioEnv`, `VideoEnv` peuvent être supprimés de `env.ts`.
4. **Choix Dev :** les valeurs de `defaultEnv.images` etc. migrent soit inline dans chaque config-reader, soit comme constante `CONTENT_DEFAULTS` dans `env.ts` (non exportée dans `WebetteEnv`). L'important : chaque config-reader a toujours ses défauts.
5. **Consumer direct `env.markdown` dans `scan/index.ts:34` :** `toolEnv.markdown.treatTxtAsMarkdown` est utilisé comme fallback lorsque le site ne définit pas `treatTxtAsMarkdown`. Après suppression de `markdown` de `WebetteEnv`, cette ligne ne compile plus. Remplacer par la valeur inline `true` (le défaut historique), ou lire `site.config?.markdown?.treatTxtAsMarkdown ?? true` si le fallback doit rester cohérent avec la config site — au choix Dev.

### Étape C — `src/core/config.ts` (`createSite()`)

Retirer les 5 blocs de merge :
```ts
// SUPPRIMER ces blocs :
if (config.images ...) { siteSection.images = ... }
if (config.audio  ...) { siteSection.audio  = ... }
if (config.video  ...) { siteSection.video  = ... }
if (config.markdown ...) { siteSection.markdown = ... }
if (config.sorting  ...) { siteSection.sorting  = ... }
```

Les stocker dans `site.config` à la place, comme les autres sections :
```ts
config: {
  collections: ...,
  plugins: ...,
  templates: ...,
  pluginConfig: ...,
  tags: ...,
  // Ajouts :
  images: config.images,
  audio: config.audio,
  video: config.video,
  markdown: config.markdown,
  sorting: config.sorting,
  rawConfig,
}
```

### Étape D — `src/core/model.ts`

Ajouter dans `Site.config` :
```ts
config?: {
  // ... champs existants ...
  images?: Record<string, unknown>;
  audio?: Record<string, unknown>;
  video?: Record<string, unknown>;
  markdown?: Record<string, unknown>;
  sorting?: Record<string, unknown>;
}
```

### Étape E — Consommateurs (7 fichiers)

Pattern uniforme : remplacer `site?.site.*` par `site?.config?.*`.

| Fichier | Avant | Après |
|---|---|---|
| `build/sorting.ts` | `site.site.sorting` | `site.config?.sorting` |
| `resolve/resolvers/markdown.ts` | `site.site.markdown` | `site.config?.markdown` |
| `scan/index.ts` | `site.site.markdown` + `toolEnv.markdown.treatTxtAsMarkdown` | `site.config?.markdown` + inline default `true` |
| `block-types/audio/config.ts` | `site.site.audio` | `site.config?.audio` |
| `block-types/video/config.ts` | `site.site.video` | `site.config?.video` |
| `block-types/image/config.ts` | `site.site.images` | `site.config?.images` |

`build/icons.ts` : `site.site` — pas de changement car `icons` et `social` restent dans `site.site` (ils sont déclarés sous `site:` dans le config). Vérifier quand même que rien ne lit `site.site.images` ou `site.site.sorting` depuis ce fichier.

### Étape F — `docs/webette.tool.md`

Retirer les sections `## templates`, `## images`, `## audio`, `## video`, `## markdown`. Mettre à jour l'intro pour refléter la séparation : `webette.tool.ts` = `logging` / `serve` / `build` uniquement.

---

## Points d'attention

- **`rawConfig`** dans `site.config` : inclut déjà toutes les sections de `webette.config.ts` (y compris `images`, `sorting`, etc.). Pas de changement ici — `rawConfig` reste le miroir fidèle du fichier.
- **Contexte plugin `siteConfig`** : `build.ts:290` passe `siteConfig: site.site` aux plugins. Après le fix, `site.site` ne contient plus `images`, `markdown`, etc. C'est intentionnel — les plugins qui ont besoin de la config images ont accès à `webetteConfig` (le `rawConfig`). Pas de breaking change à corriger ici.
- **`scan/index.ts:42`** lit `site.site.indexFolderName` — confirmé sous-champ de `site:` dans `webette.config.ts`. Reste dans `site.site` correctement, aucune migration nécessaire.
- **`resolve/resolvers/markdown.ts:44-48`** lit `ctx.toolEnv?.markdown?.externalLinks` pour désactiver les liens externes. Accès entièrement protégé par optional chaining — quand `toolEnv.markdown` devient `undefined` après le fix, l'expression court-circuite et `enableExternalLinks` vaut `true` (comportement identique au défaut actuel). Aucune modification de code nécessaire ici.

---

## Pilot exchange

- 2026-03-15 — Pilot — Story créée. Recon sur `webette.tool.ts`, `src/config/env.ts`, `src/core/config.ts`, `src/core/model.ts` et les 7 consommateurs. Séparation décidée : `webette.tool.ts` = `logging`/`serve`/`build` uniquement — `templates` retiré sur décision utilisateur (les défauts restent hardcodés dans `env.ts`). Pas de changement de format utilisateur sur `webette.config.ts`.
- 2026-03-15 — Pilot — Recon complémentaire sur `scan/index.ts` et `resolve/resolvers/markdown.ts`. Deux consommateurs directs de `env.markdown` identifiés : `scan/index.ts:34` (`toolEnv.markdown.treatTxtAsMarkdown` → doit devenir inline default) et `resolve/resolvers/markdown.ts:44-48` (optional-chained, sûr sans migration). Story mise à jour. Périmètre complet confirmé.
