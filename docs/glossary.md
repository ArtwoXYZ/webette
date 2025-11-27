# Webette Glossary

This document defines the main terms used in Webette.

---

## Webette

A simple and extensible static site generator.
Webette reads a **site** folder, applies **plugins** and **templates**, then generates static files ready to be served.

---

## Site root

The root folder of a Webette site.

It typically contains:

- the **site configuration** file (e.g. `webette.config.ts`);
- one or more **collection** folders;
- the **templates** folder (e.g. `_templates/`);
- and optionally some internal folders (logs, cache, etc.).

---

## Collection

A folder located directly in the **site root** that contains content of the same type or family.

Possible examples of collections (all valid):

- `blog/`
- `notes/`
- `photos/`
- `recipes/`
- `videos/`

Webette does not reserve names like `posts/` or `pages/`.
**Any** collection is defined by its folder: it is simply a choice made by the user or the theme.

A collection’s behavior (sorting, templates, etc.) is defined in the **site configuration**.

Each collection also carries:

- an ID derived from its slug (short, prefixed `col__`, suffixed on collision);
- a slug (dash-separated, deduplicated; can be overridden by site config);
- a POSIX `path` relative to the site root.

---

## Entry

A unit of content within a **collection**.

In practice, an entry is usually:

- a **folder** (e.g. `01 welcome/`);
- containing one or more **blocks** (e.g. `my text.md`, images, data files, etc.).

Each entry typically corresponds to a generated page in the site (for now).

Each entry also carries:

- an ID derived from its slug (short, prefixed `ent__`, suffixed on collision within the collection);
- a slug (dash-separated, deduplicated within the collection);
- a POSIX `path` relative to the site root.

---

## Block

An individual file inside an **entry**, representing a piece of content or data.

Examples:

- `my text.md`: main Markdown content;
- `01-image.png`: associated image;
- `02-meta.json`: additional data;
- any other format supported by **block plugins**.

Plugins can define how blocks are read, parsed, and integrated into templates.

Each block also carries:

- an ID derived from its slug (short, prefixed `blk__`, suffixed on collision within the entry);
- a slug (dash-separated, deduplicated within the entry);
- a POSIX `path` relative to the site root;
- a `type` hint (folder, markdown, image, video, audio, data, text, table, or file).

---

## Index (collection / entry)

A convention used to designate a default entry point.

=> To be defined.

The exact behavior depends on the theme and configuration, but the term “index” is a useful convention to know.

---

## Route

The URL path generated for each entity.

Examples:

- `site root` + `blog/01-welcome/` -> `/blog/welcome`

Route generation rules must be defined in the **site configuration**.

Default behaviors:

- Removal of numbers preceding titles (entries and blocks);
- Slugification.

In the current model, every entity carries a `route`:

- Site: `/`
- Collection: `collection-slug/` (or a configured `route` override)
- Entry: `collection-route/entry-slug/`
- Block: `collection-route/entry-slug/block-slug[/sub-block-slug...][.ext]` (extension only when the block has one; folders end with a slash)

---

## Entry sorting

Generic rule for sorting entries within a collection:

1. If the name begins with a **number** (e.g. `01-`, `10-`, `1`, `001`), that number is used for ordering.
2. If not, or in case of equality, alphabetical order is used.

This rule applies to entry folders inside a collection, not to the collections themselves (which do not need to be sorted).

---

## Site configuration (`webette.config.ts`)

A file describing how Webette should interpret the site.

It defines, for example:

- the site’s title, language, and metadata;
- the list of **collections** and their configuration (sorting, templates, etc.);
- the theme / layouts used;
- the **plugins** to activate and their settings.

This is the configuration of the **site**, not of the Webette tool itself.

---

## Tool configuration (environment)

  A configuration file dedicated to Webette as a tool (`webette.tool.ts`).

It can contain, for example:

- the default language for logs;
- the minimum log level (`debug`, `info`, etc.);
- the name of the folder used for logs inside the site (e.g. `.webette`);
- other global options related to the CLI or runtime.

This is the configuration of the **tool**, shared between multiple sites if needed, and distinct from `webette.config.ts`.
