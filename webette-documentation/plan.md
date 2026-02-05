# Plan du site de documentation Webette (interne)

Note : le contenu final du site sera en anglais. Ce plan est en français pour itérer vite.

## Objectif

Un site de documentation qui soit :

1. didactique pour les nouveaux arrivants ;
2. une référence fidèle à l’implémentation actuelle ;
3. avec une séparation claire entre documentation utilisateur et internals/roadmap.

## Principes

- La source de vérité = le comportement réel du code (pas de suppositions).
- Éviter la sur-fragmentation : dans la **Reference**, privilégier **1 entry par domaine**, avec plusieurs blocs Markdown internes (sections), plutôt que 30 micro-pages.
- Toujours parler de ce qui est **implémenté**.
- Réduire les redites : **Pages = résumé**, **Learn = progression pédagogique**, **Reference = détails exacts**, **Cookbook = recettes**, **Internals/Roadmap = à part**.

---

## Collections proposées (structure globale)

### /01 pages (pages publiques)

- 01 home (page d’accueil, remplace la Root Automatic Index Page)
  - pitch simple + promesse
  - “Everything is a Folder” en une phrase
  - ce que Webette génère (HTML + assets + `_public/_model`)
  - “Learn more” : liens vers Learn, Reference, Features, Starters, Plugins, Roadmap
- 02 features (résumé clair, donner envie, sans détails techniques)
  - Format : 2 lignes de 4 cartes
  - Ligne 1 (grand public)
    - Site prêt à modifier : site d’exemple inclus
    - Pas de back‑office : un site = des dossiers & fichiers
    - Prévisualisation locale : `serve` + rebuild + refresh auto
    - Publier au bon moment : `draft` / `unlisted` / `ignore`
  - Ligne 2 (enthousiastes / bidouilleurs)
    - Markdown enrichi : classes + titres avec ids + liens internes `collection:/entry:/block:`
    - Images intelligentes : variantes + inline `block:` + helper `image`
    - Navigation & index : `navigation.webt`, index auto, overrides `index.root` / `index.collections`
    - Templates & extensible : wrapper/layout/partials + helpers + plugins (hooks + outputs protégés)
- 03 faq (questions courtes : build vs serve, où va l’output, templates, plugins)
- 04 roadmap (ce qui n’est pas implémenté, clairement séparé)

---

### /02 learn (didactique : expliquer clairement, pas un tuto — sauf quickstart)

- 01 introduction (ce qu’est Webette, pour qui, et ce que Webette génère : le site facile à héberger et le model pour debugger pour les power users)
  - vision et explication de la collection
  - où trouver les détails (Learn vs Reference)
- 02 quickstart (installation, `build` / `serve`, où va l’output, + config minimale : `webette.config.ts` et `webette.tool.ts`)
  - aperçu simple “build vs serve” + sortie `_public`
- 03 your first site
  - comment faire son premier blog avec webette, en rapide mais voilà, on ajoute les pages, les blocs et tout, c'est cool
  - conventions de noms + ordre (préfixes numériques)
  - fichiers spéciaux : `name.webt`, `description.webt`, `draft.webt`, `unlisted.webt`, `ignore.webt`
  - extras de collection : `_assets/` (médias exposés aux templates, changer de logo par exemple)
  - où mettre un `navigation.webt`
- 04 mental model (ordre, slugs/routes, export du modèle, debug)
  - modèle : site / collections / entries / blocks
  - routes et slugs
  - export du modèle (`_public/_model`) + timestamps/fingerprints
  - debug (logs)
- 05 writing content (Markdown, comportement des `.txt`, liens internes `collection:/entry:/block:`, images internes inline)
  - Markdown enrichi : classes globales, titres avec ids, liens internes
  - `.txt` en markdown (ou texte simple si désactivé)
  - images inline via `block:` + options (variant, figure, caption)
  - liens externes (nouvel onglet, option configurable)
  - audio & vidéo : rendu + métadonnées (quand disponibles)
- 06 navigation & indexes (Automatic Index Pages, `unlisted.webt`, Index Overrides, `navigation.webt`, et impacts sur Automatic Index Pages/sitemap)
  - index auto racine/collections + exclusions
  - overrides via `index.root` / `index.collections` (entry unlisted)
  - effets de draft/unlisted sur index et sitemap (sans détails techniques)
- 07 templates (wrapper/layout/partials, contexte, helpers, assets de templates, et logique “site vs tool”)
  - helpers clés (`image`, `asset`, `displayName`, `withEntry`, `withCollection`)
  - assets de templates + fallback site/tool
  - overrides d’index et de layout d’entrée
- 08 plugins (concept + création + utilisation : écrire un plugin, l’activer dans `webette.config.ts`, lifecycle des hooks, expected outputs pour survivre au prune)
- 09 build & deploy basics (overwrite/prune, sitemap, protectAssets, exemples htaccess/nginx)
  - build vs serve (watch, overwrite, drafts)
  - pretty print HTML + fichiers serveur générés

---

### /03 reference (1 domaine par entry, plusieurs blocs Markdown internes, factuel)

- 01 filesystem

  - collections.md
  - entries.md
  - blocks.md
  - ordering.md (préfixes numériques + ordre alphabétique)
  - special-files.md (`draft.webt`, `unlisted.webt`, `ignore.webt`)
  - collection-extras.md (`description.webt`, `_assets/`)

- 02 routing

  - slugs.md
  - routes.md (site / collection / entry / block)
  - overrides.md (`collections.*.route`, `collections.*.slug`, etc.)
  - index-routes.md (comportement des Root/Collection Automatic Index Pages)

- 03 indexes

  - automatic-indexes.md (`build.generateIndex`, layouts, exclusions)
  - unlisted.md (effets exacts : Automatic Index Pages, sitemap, pages)
  - index-overrides.md (`index.root`, `index.collections`, règle : l’entry doit être unlisted)
  - navigation.md (format, matching, modèle de données, usage dans les templates)

- 04 configuration

  - webette-config.md (champs supportés de `webette.config.ts` + exemples)
  - webette-tool.md (defaults de `webette.tool.ts` + résolution)
  - build-vs-serve.md (drafts, readContent, overwrite)

- 05 templates

  - system.md (wrapper / layout / partial + contexte de rendu)
  - roots-fallback.md (site vs tool)
  - defaults.md (rôle de chaque template par défaut)
  - helpers.md (dont `image`, `asset`, `withEntry`, etc.)
  - assets.md (`templates.assets`, copie vers l’output, helper `asset`)
  - overrides.md (index/root/collection, layout par entry)

- 06 plugins

  - system.md (chargement, `pluginId`)
  - lifecycle.md (ordre exact des hooks)
  - context.md (champs, `readContent`, `exportDir`)
  - prune-contract.md (`addExpectedOutput`, `addExpectedDir`)

- 07 build pipeline

  - overview.md (scan → resolve → postprocess → render → export → prune)
  - overwrite-prune.md (`none` / `replace-all` / `replace-files`, implications)
  - sitemap.md (règles actuelles + limitations connues)
  - protect-assets.md (forbidden index pages dans les dossiers d’assets)
  - pretty-print.md
  - serve.md (dev server, live reload, watch, endpoint version)

- 08 resolvers & block types

  - registry.md
  - markdown.md (ids de titres, liens internes, liens externes)
  - text.md
  - image.md (variants, `defaultVariant`, comportement si sharp absent)
  - audio.md (copie + metadata via lib optionnelle)
  - video.md (copie-only)
  - folder.md (subBlocks)
  - navigation.md
  - unclassified.md (plugin-first)

- 09 model & export

  - model-shapes.md (site / collection / entry / block)
  - export-format.md (`_public/_model`, `site.json`, entries splittées)
  - history-timestamps.md (`createdAt` / `updatedAt`, fingerprints)

- 10 cli

  - commands.md (`build`, `serve`)
  - flags.md (`--skip-content`, `--export-model-only`, `--include-drafts`, `--no-include-drafts`, `--verbose`)

- 11 logging

  - system.md (locales, jsonl, scopes)

- 12 glossary
  - tous les termes dans un seul .md

---

### /04 cookbook (recettes / how-to)

- 01 site de documentation avec sidebar
- 02 home personnalisée via Index Override
- 03 navigation ordonnée avec `navigation.webt`
- 04 plugin générant des assets de manière sûre (expected outputs)
- 05 désactiver txt-as-markdown

---

### /05 internals (notes développeur, séparées de la doc utilisateur)

- 01 markdown internals
- 02 build internals
- 03 templates internals
- 04 logging internals
