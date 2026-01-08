# Site Configuration (`webette.config.ts`)

Webette sites define their settings in a TypeScript config file at the project root.

## Location and format

- File: `webette.config.ts`
- Exports: default export (object). Non-default exports are ignored.
- Loaded fresh on each build/serve: the file is imported as a TS module via Bun, using a cache-busting querystring so changes are picked up reliably.

## `site` section

```ts
export default {
  site: {
    title: "My Webette site",
    lang: "en",
    // any other site-level fields (author, theme, etc.)
  },
  plugins: [
    // Optional: paths (relative to site root) to .js/.mjs plugins, e.g. "_plugins/my-plugin.js"
  ],
  // optional markdown overrides (applies to .txt handling and shared remark plugins)
  // markdown: { treatTxtAsMarkdown: false },
  // optional media overrides
  // video: { outputDir: "assets/video" },
  // audio: { outputDir: "assets/audio" },
  // collections, templates, plugins...
};
```

- The entire `site` section is loaded as-is and available in the model and templating via `site.*` (e.g. `{{site.author}}`). `title` and `lang` default if missing.
- You can override `.txt` handling per site by setting `markdown.treatTxtAsMarkdown` (`true` => use Markdown pipeline; `false` => keep as plain text).
- You can override media output paths per site by setting `video.outputDir` / `audio.outputDir` (relative to the build output).
- You can override image behavior via `images.*` (engine on/off, sizes, format, outputDir) and pick a preferred rendered variant with `images.defaultVariant` (`default|small|medium|large`).
- Markdown rendering adds a `webt-md` CSS class on every element for easy scoping, and (when `rehype-external-links` is installed) external links get `target="_blank"` + `rel="noopener noreferrer"` by default.
- Collections are discovered automatically from folders at the site root (ignoring output/logs/templates/hidden/underscore prefixes). The exported model includes `collections`, their `entries`, and `blocks` with IDs, slugs, POSIX paths, and type hints.

## `templates` section (site templates + assets)

You can override the templates root and declare a templates assets folder:

```ts
export default {
  templates: {
    root: "_templates",
    custom: {
      index: {
        root: "layout/index-root.hbs",
        collections: "layout/index-collection.hbs",
        collection: {
          posts: "layout/index-posts.hbs"
        }
      },
      entry: {
        "posts/webette-demonstration": "layout/post-feature.hbs"
      },
    },
    assets: {
      dir: "assets",
      publicBase: "/assets/theme"
    }
  }
};
```

Notes:
- `templates.root` is relative to the site root.
- `templates.custom.index.root` overrides the root index layout.
- `templates.custom.index.collections` overrides the layout for all collection indexes.
- `templates.custom.index.collection` maps collection slugs to per-collection index layouts.
- `templates.custom.entry` maps `"<collectionSlug>/<entrySlug>"` to a layout file for a specific entry.
- `templates.assets.dir` is relative to `templates.root` (or absolute if you pass an absolute path).
- `templates.assets.publicBase` is the public URL prefix used in the build output.
- Use the `asset` helper in templates to link to these files.

## `collections` section (per collection overrides)

Keys match collection folders by `path` (or the key itself if `path` is omitted). Recognized fields today:

- `path`: folder to match (relative to site root)
- `name`: display name override (used to derive the slug if no slug is provided)
- `slug`: explicit slug override for the collection
- `route`: explicit base route override; entries/blocks inherit this prefix

If absent, Webette derives `name`/`slug` from the folder name and `route` from the slug.

## Unlisted collections and entries

Place a `unlisted.webt` file:

- In a collection folder to mark the entire collection as unlisted.
- In an entry folder to mark that entry as unlisted.

Behavior:
- Unlisted collections and entries are excluded from the root/collection indexes.
- Collection indexes are not generated for unlisted collections; instead, a forbidden index is written using `templates.default.accessForbidden`.
- Unlisted collections and entries are excluded from the sitemap.
- Pages are still generated and available at their routes.

## Description

Add `description.webt` to attach a raw description:

- At the root of a collection: stored as `collection.description`.
- Inside an entry folder: stored as `entry.description`.
- Preserves line breaks; use `nl2br` in templates to display them.

## Collection assets

Add a `_assets/` folder at the root of a collection to attach media assets to that collection.

Rules:
- Only image/audio/video files are processed.
- Files are copied/generated through the media pipelines and exposed as `collection.assets`.
- Output routes follow the collection slug, e.g. `assets/images/posts/...`.

## Index overrides (entry-based)

You can replace the root index or a collection index with a specific entry (must be unlisted):

```ts
index: {
  root: { collection: "pages", entry: "home" },
  collections: {
    posts: { collection: "pages", entry: "posts-index" }
  }
}
```

Rules:
- Target entries must be `unlisted.webt` (or belong to an unlisted collection).
- The entry is rendered as `/index.html` or `/collection/index.html`.
- The entry’s original page is not generated.

## Error handling

- Missing or invalid config: falls back to defaults (`title`: "My Webette site", `lang`: "en").
- The loader swallows parse/import errors and returns defaults to keep the tool usable; logs should surface failures when wiring the fuller pipeline.
