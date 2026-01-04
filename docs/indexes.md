# Indexes in webette

This page explains every way to build indexes in webette, from the automatic ones to fully custom pages.

## 1) Automatic indexes (default)

When `build.generateIndex = true`, webette generates:

- `/index.html`: root index (collections listing)
- `/<collection>/index.html`: collection index (entries listing)

The default layout is `templates.default.index`.

You can customize the layouts with:

- `templates.custom.index.root` (root only)
- `templates.custom.index.collections` (all collections)
- `templates.custom.index.collection[slug]` (per collection)

Priority for collection indexes:

1. `templates.custom.index.collection[slug]`
2. `templates.custom.index.collections`
3. `templates.default.index`

Root index uses:

1. `templates.custom.index.root`
2. `templates.default.index`

## 2) Unlisted collections and entries

`unlisted.webt` removes items from automatic indexing:

- Put `unlisted.webt` in a collection folder to hide the collection and its entries.
- Put `unlisted.webt` in an entry folder to hide that entry.

Effects:

- Unlisted collections/entries are excluded from root and collection indexes.
- Unlisted collections get a forbidden index (`templates.default.accessForbidden`).
- Unlisted items are excluded from the sitemap.
- Pages still exist at their routes (unless used as index overrides, see below).

## 3) Entry-based index overrides (index config)

You can replace a root index or a collection index with a specific entry (must be unlisted).

Example:

```ts
index: {
  root: { collection: "pages", entry: "index-list" },
  collections: {
    posts: { collection: "pages", entry: "posts-index" }
  }
}
```

Rules:

- Target entries must be unlisted.
- The entry is rendered as `/index.html` or `/<collection>/index.html`.
- The entry's original page is not generated.

## 4) Custom ordered indexes with index-list.webt

Place `index-list.webt` inside an entry to define a custom ordered list:

```
- collection: posts
- collection: posts, entry: draft
- collection: lab
```

Rules:

- `collection` is required on every line.
- `entry` is optional; when present, it must belong to the declared collection.
- Values can be names or slugs.
- The order is the order of the file.
- If the file is empty, webette expands it to a full index (each collection followed by its entries).

The block does not auto-render. Use it in templates:

```hbs
{{#each entry.blocks}}
  {{#if (eq type "index-list")}}
    {{#each content.data.items}}
      {{#if (eq kind "collection")}}
        <a href="{{collection.route}}">{{collection.name}}</a>
      {{else if (eq kind "entry")}}
        <a href="{{entry.route}}">{{entry.name}}</a>
      {{/if}}
    {{/each}}
  {{/if}}
{{/each}}
```

## 5) Collection metadata used in indexes

Two collection-level features help custom indexes:

### collection-description.webt

Add `collection-description.webt` at the root of a collection.
Its raw content is stored as `collection.description`.
Use `nl2br` to preserve line breaks in templates.

### Collection \_assets (media only)

Add a `_assets/` folder at the root of a collection.
Only image/audio/video files are processed.
They go through the media pipelines and are exposed as `collection.assets`.
Routes are scoped to the collection, for example:
`assets/images/posts/image@default.webp`.

## Summary (when to use what)

- **Quick site listing**: automatic index + `templates.custom.index.*`
- **Hide collections or entries**: `unlisted.webt`
- **Use a custom entry as index**: `index.root` / `index.collections`
- **Fully ordered index page**: `index-list.webt` in an entry
- **Collection previews**: `collection-description.webt` + `_assets/`
