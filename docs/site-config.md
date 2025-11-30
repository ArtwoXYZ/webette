# Site Configuration (`webette.config.ts`)

Webette sites define their settings in a TypeScript config file at the project root.

## Location and format

- File: `webette.config.ts`
- Exports: default export (object). Non-default exports are ignored.
- Loaded fresh on each build/serve: the loader transpiles the file via `Bun.Transpiler` and imports it with a cache-busting data URL.

## `site` section

```ts
export default {
  site: {
    title: "My Webette site",
    lang: "en",
    // any other site-level fields (author, theme, etc.)
  },
  // optional markdown overrides (applies to .txt handling and shared remark plugins)
  // markdown: { treatTxtAsMarkdown: false },
  // collections, templates, plugins...
};
```

- The entire `site` section is loaded as-is and available in the model and templating via `site.*` (e.g. `{{site.author}}`). `title` and `lang` default if missing.
- You can override `.txt` handling per site by setting `markdown.treatTxtAsMarkdown` (`true` => use Markdown pipeline; `false` => keep as plain text).
- Collections are discovered automatically from folders at the site root (ignoring output/logs/templates/hidden/underscore prefixes). The exported model includes `collections`, their `entries`, and `blocks` with IDs, slugs, POSIX paths, and type hints.

## `collections` section (per collection overrides)

Keys match collection folders by `path` (or the key itself if `path` is omitted). Recognized fields today:

- `path`: folder to match (relative to site root)
- `name`: display name override (used to derive the slug if no slug is provided)
- `slug`: explicit slug override for the collection
- `route`: explicit base route override; entries/blocks inherit this prefix

If absent, Webette derives `name`/`slug` from the folder name and `route` from the slug.

## Error handling

- Missing or invalid config: falls back to defaults (`title`: "My Webette site", `lang`: "en").
- The loader swallows parse/import errors and returns defaults to keep the tool usable; logs should surface failures when wiring the fuller pipeline.
