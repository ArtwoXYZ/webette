# Automatic Index Pages in webette

This page explains every way to build **Automatic Index Pages** in webette, from the built-in ones to fully custom pages.

## 1) Automatic Index Pages (default)

When `build.generateIndex = true`, webette generates:

- `/index.html`: **Root Automatic Index Page** (collections listing)
- `/<collection>/index.html`: **Collection Automatic Index Page** (entries listing)

The default layout for Automatic Index Pages is `templates.default.index`.

You can customize the layouts with:

- `templates.custom.index.root` (root only)
- `templates.custom.index.collections` (all collections)
- `templates.custom.index.collection[slug]` (per collection)

Priority for **Collection Automatic Index Pages**:

1. `templates.custom.index.collection[slug]`
2. `templates.custom.index.collections`
3. `templates.default.index`

**Root Automatic Index Page** uses:

1. `templates.custom.index.root`
2. `templates.default.index`

## 2) Unlisted collections and entries

`unlisted.webt` removes items from **Automatic Index Pages** and from the **Navigation Plan** (default expansion):

- Put `unlisted.webt` in a collection folder to hide the collection and its entries.
- Put `unlisted.webt` in an entry folder to hide that entry.

Effects:

- Unlisted collections/entries are excluded from Root/Collection Automatic Index Pages.
- Unlisted collections get a forbidden index page (`templates.default.accessForbidden`).
- Unlisted items are excluded from the sitemap.
- Pages still exist at their routes (unless used as **Index Overrides**, see below).

## 3) Entry-based Index Overrides (index config)

You can replace a Root/Collection Automatic Index Page with a specific entry (must be unlisted).  
This is called an **Index Override**.

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

## 4) Navigation Plan (`navigation.webt`)

Place `navigation.webt` inside an entry to define a **Navigation Plan**: a custom ordered list of collections/entries that templates can render as a **Site Menu** or a custom index page.

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
- If there are no items (empty file, or only `name:`), webette expands it into a full **Navigation Plan** (each collection followed by its entries).

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

## 5) Collection metadata used in Automatic Index Pages

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

- **Quick site listing**: Automatic Index Pages + `templates.custom.index.*`
- **Hide collections or entries**: `unlisted.webt`
- **Use a custom entry as index** (Index Override): `index.root` / `index.collections`
- **Fully ordered index page / Site Menu**: Navigation Plan via `navigation.webt`
- **Collection previews**: `description.webt` + `_assets/`
