# Site Configuration (`webette.config.ts`)

Webette sites define their settings in a TypeScript config file at the project root.

## Location and format

- File: `webette.config.ts`
- Exports: default export (object). Non-default exports are ignored.
- Loaded fresh on each build/serve: the loader transpiles the file via `Bun.Transpiler` and imports it with a cache-busting data URL.

## Currently consumed fields

```ts
export default {
  site: {
    title: "My Webette site",
    lang: "en",
  },
  // collections, templates, plugins... (future)
};
```

- `site.title`: string, used as page title in the wrapper.
- `site.lang`: string, used as `lang` attribute.

Other fields are ignored for now but are reloaded with the config; they will be wired in when the collections/entries pipeline lands.

## Error handling

- Missing or invalid config: falls back to defaults (`title`: "My Webette site", `lang`: "en").
- The loader swallows parse/import errors and returns defaults to keep the tool usable; logs should surface failures when wiring the fuller pipeline.
