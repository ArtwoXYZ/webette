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
  root: { collection: "pages", entry: "home" },
  collections: {
    posts: { collection: "pages", entry: "posts-index" }
  }
}
```

Rules:

- Target entries must be unlisted.
- The entry is rendered as `/index.html` or `/<collection>/index.html`.
- The entry's original page is not generated.

## 4) Custom ordered indexes with navigation.webt

Place `navigation.webt` inside an entry to define a custom ordered list:

```
name: My navigation
- title: First section
  - title: Posts, collection: posts
    - entry: draft
- title: Second section
  - collection: lab
    - title: Credits (anchored), collection: another-one, entry: credits#Audio
```

Rules:

- `name` is optional and sets `content.data.name` (first `name:` wins; empty `name:` lines are ignored).
- Items can declare `title`, `collection`, and/or `entry`.
- `title` is optional; it sets an item's display label (empty `title:` is ignored).
- Indentation is structural: `0` then `2` spaces per level (unlimited). Children are nested under `children` in the model.
- `collection` is required for collection items; `entry` items can omit `collection` when indented (they inherit the closest parent collection).
- Values can be names or slugs.
- The order is the order of the file.
- If there are no items (empty file, or only `name:`), webette expands it to a full index (each collection followed by its entries).

The block does not auto-render. Use it in templates (tree):

```hbs
{{#each entry.blocks}}
  {{#if (eq type "navigation")}}
    {{#if content.data.name}}
      <h2>{{content.data.name}}</h2>
    {{/if}}
    {{> navigation-items items=content.data.items}}
  {{/if}}
{{/each}}
```

## 5) Collection metadata used in indexes

Two collection-level features help custom indexes:

### description.webt

Add `description.webt` at the root of a collection.
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
- **Fully ordered index page**: `navigation.webt` in an entry
- **Collection previews**: `description.webt` + `_assets/`
