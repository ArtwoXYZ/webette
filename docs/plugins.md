# Plugins

How to write and register a Webette plugin with the current API.

## Quick start

1) Create an ESM file under the site root, e.g. `_plugins/my-plugin.js`.
2) Export an object with any hooks you need.
3) Reference it in `webette.config.ts`:
```ts
export default {
  // ...
  plugins: ["_plugins/my-plugin.js"],
};
```

## Hooks you can implement

- `onInit(ctx)` — after env/site load, before scan.
- `onScan(site, ctx)` — after scan/routes, before content resolution. Return a new site or mutate in place.
- `onResolved(site, ctx)` — after content resolution, before timestamps/export. Return a new site or mutate in place.
- `transformBlock(block, ctx)` — per-block mutation (depth-first). Return a new block or mutate. `ctx` includes `entry` and `collection`.
- `transformEntry(entry, ctx)` — per-entry mutation after blocks. Return a new entry or mutate. `ctx` includes `collection`.
- `extendTemplates(handlebars, ctx)` — register helpers/partials/layouts before templates are compiled.

Hooks run in that order: init -> scan -> resolved -> transformBlock -> transformEntry -> extendTemplates.

## Context (`ctx`)

Always available:
- `rootDir` — absolute site root.
- `env` — loaded `webette.tool.ts` config.
- `logger` — child logger for your plugin.
- `readContent` — whether the build is allowed to read block contents.
- `exportDir` — `_public/_model` (resolved).
- `pluginId` — the id of this plugin (filename-based if not provided).
- `addExpectedOutput(relativePath)` — whitelist one file (relative to output dir) so prune keeps it.
- `addExpectedDir(relativeDir)` — whitelist a whole directory/prefix under the output; all files inside are kept by prune.

Extra in some hooks:
- `collection` (transformEntry/transformBlock)
- `entry` (transformBlock)

## Prune and assets

When `overwrite=replace-files`, Webette deletes any file not expected. If your plugin writes assets or pages:
- Use `addExpectedOutput("assets/images/plugins/foo/thumb.webp")` for single files.
- Use `addExpectedDir("assets/images/plugins/foo")` if you generate many files under one folder.
Paths are always relative to the output folder (e.g. `_public` by default).

## Template extensions

`extendTemplates(handlebars, ctx)` lets you add:
- helpers: `handlebars.registerHelper("name", fn)`
- partials: `handlebars.registerPartial("name", templateString)`
- layouts: write a file and register it as a partial; reference by name from templates.

Site templates override tool templates. In serve mode, the site templates are watched if present; otherwise the tool templates are watched.

## Simple example

```js
export default {
  pluginId: "example",

  onResolved(site, ctx) {
    ctx.logger.info("plugin.example", { entries: site.collections?.length ?? 0 });
  },

  transformBlock(block, ctx) {
    if (block.type !== "image") return;
    // Keep all generated variants under this folder
    ctx.addExpectedDir(`assets/images/plugins/${ctx.entry.slug}`);
    return {
      ...block,
      content: {
        ...block.content,
        note: "handled by example plugin",
      },
    };
  },
};
```

Plugins run locally with full access; there is no sandbox. Keep paths relative to the output dir when using prune APIs.
