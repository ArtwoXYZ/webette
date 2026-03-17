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
- `onGeneratePages(site, ctx)` — after tag pages, before sitemap. Use `ctx.renderPage` to generate arbitrary static pages. See [Generating static pages](#generating-static-pages) below.

Hooks run in that order: init -> scan -> resolved -> transformBlock -> transformEntry -> extendTemplates -> **onGeneratePages**.

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
- `addReservedRoute(segment)` — declare a top-level route segment as reserved. Any entry or collection with a matching slug will be auto-renamed with a warning. **Must be called in `onInit`, `onScan`, or `onResolved`** — calling it later (e.g. in `onGeneratePages`) is too late and emits a warning.

Extra in some hooks:
- `collection` (transformEntry/transformBlock)
- `entry` (transformBlock)
- `renderPage` (onGeneratePages only) — see below.

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

---

## Generating static pages

`onGeneratePages` is the hook for plugins that need to emit fully rendered static pages.

### `ctx.renderPage(opts)`

```ts
ctx.renderPage({
  route: string,       // root-relative URL, e.g. '/my-plugin/'
  layoutName: string,  // Handlebars layout partial name, e.g. 'entry'
  context?: Record<string, unknown>,  // extra data merged into the render context
}): Promise<boolean>   // true if the file was written (content changed)
```

**Behavior:**
- Converts `route` to a filesystem path under the output directory (`_public` by default).
- Merges `context` on top of the site's `renderBaseContext` (the same base passed to all pages). `layoutName` always wins over any `layoutName` that might be in `context`.
- Writes `<route>/index.html`. Calls `formatHtml` (pretty-print + live-reload injection when in serve mode).
- Automatically calls `addExpectedOutput` so `pruneOrphans` keeps the page even in `overwrite=replace-files` mode.

**Layout names** correspond to Handlebars partials registered from the `layout/` directory of your templates. For example:
- `'entry'` → `layout/entry.hbs`
- `'welcome'` → `layout/welcome.hbs`

If your plugin needs a custom layout, register it in `extendTemplates` via `handlebars.registerPartial('my-layout', templateString)` and then use `layoutName: 'my-layout'`.

### Reserving route segments

Use `ctx.addReservedRoute(segment)` in an **early hook** (`onInit`, `onScan`, or `onResolved`) to prevent the content scanner from assigning your plugin's route to a user entry or collection.

```js
onInit(ctx) {
  ctx.addReservedRoute("my-plugin"); // slug 'my-plugin' will be auto-renamed if used
},
```

### Minimal example

```js
export default {
  pluginId: "my-plugin",

  onInit(ctx) {
    ctx.addReservedRoute("my-plugin");
  },

  async onGeneratePages(site, ctx) {
    await ctx.renderPage({
      route: "/my-plugin/",
      layoutName: "entry",
      context: {
        entry: { name: "My Plugin Page", route: "/my-plugin/" },
        blocks: [
          {
            id: "intro",
            type: "markdown",
            name: "intro",
            content: { html: "<p>Hello from my plugin!</p>" },
          },
        ],
      },
    });
  },
};
```

See `website-example/_plugins/test-generate-pages/` for a working example and regression test.
