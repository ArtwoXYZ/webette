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

A folder located directly in the **site root** that contains content of the same “type” or family.

Possible examples of collections (all valid):

- `blog/`
- `notes/`
- `photos/`
- `recipes/`
- `videos/`

Webette does not reserve names like `posts/` or `pages/`.
**Any** collection is defined by its folder: it’s simply a choice made by the user or the theme.

A collection’s behavior (sorting, templates, etc.) is defined in the **site configuration**.

---

## Entry

A unit of content within a **collection**.

In practice, an entry is usually:

- a **folder** (e.g. `01 welcome/`);
- containing one or more **blocks** (e.g. `my text.md`, images, data files, etc.).

Each entry typically corresponds to a generated page in the site (for now).

---

## Block

An individual file inside an **entry**, representing a piece of content or data.

Examples:

- `my text.md`: main Markdown content;
- `01-image.png`: associated image;
- `02-meta.json`: additional data;
- any other format supported by **block plugins**.

Plugins can define how blocks are read, parsed, and integrated into templates.

---

## Index (collection / entry)

A convention used to designate a default entry point.

=> To be defined.

The exact behavior depends on the theme and configuration, but the term “index” is a useful convention to know.

---

## Route

The URL path generated for an entry.

Examples:

- `site root` + `blog/01-welcome/` → `/blog/welcome`

Route generation rules must be defined in the **site configuration**.

Default behaviors:

- Removal of numbers preceding titles (entries and blocks);
- Slugification.

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

A configuration file dedicated to Webette as a tool (`webette.tool.json`).

It can contain, for example:

- the default language for logs;
- the minimum log level (`debug`, `info`, etc.);
- the name of the folder used for logs inside the site (e.g. `.webette`);
- other global options related to the CLI or runtime.

This is the configuration of the **tool**, shared between multiple sites if needed, and distinct from `webette.config.ts`.

---

## Templates

Files (often HTML) defining how a page is rendered.

Templates may receive:

- entry data (title, content, metadata, etc.);
- collection data (list of entries, pagination, etc.);
- global site variables.

Templates are generally grouped in a dedicated folder (e.g. `_templates/`).

---

## Layout

A “full” template that wraps a page.

Typical examples:

- `default.html`: base layout;
- `entry.html`: layout for a generic entry;
- `collection.html`: layout for a list of entries.

A layout often combines smaller templates (**partials**).

---

## Partial

A template block reused across multiple layouts.

Examples:

- `header.html`
- `footer.html`
- `meta-tags.html`
- `navigation.html`

Partials are used to avoid duplicating code inside templates.

---

## Templating engine

A small internal or external engine used by Webette to:

- inject variables into templates.

Webette currently provides a minimal engine, but may integrate a dedicated tool later (e.g. Handlebars).

---

## Plugin

An extension that modifies or enhances Webette’s behavior.

Three main categories:

1. **Block plugins**

   - Handle new file/block types (MD, JSON, images, etc.).
   - Define how blocks are read and transformed into data for templates.

2. **Enrichment plugins**

   - Transform or enrich textual content (e.g. link detection, YouTube embeds, etc.).
   - Often run after content parsing.

3. **Functional plugins**

   - Add global features (comments, reactions, sitemap, RSS, etc.).
   - May run during the build or on the final output.

---

## Build

A command/process that:

1. reads the **site root**;
2. loads the **site configuration**;
3. applies **plugins**;
4. renders **templates**;
5. writes generated files into an output folder (e.g. `_public/`).

The result is a static site ready to be served.

---

## Serve

A command that starts a small server to:

- serve the **build** output;
- allow previewing the site locally in a browser.

Depending on the settings, `serve` may:

- serve the already-generated folder directly;
- or trigger a build before starting.

---

## Watch

A mode where Webette monitors site files:

- when a file changes (content, template, config), a **build** is triggered;
- the preview server can then display an updated version automatically.

---

## Logging

Webette’s internal logging system.

Features:

- levels: `debug`, `info`, `warn`, `error`;
- hierarchical scopes: e.g. `webette.cli`, `webette.cli.build`, `webette.build.collections`;
- localization (e.g. messages in `fr` or `en`);
- output both to the console and a JSONL file (e.g. `.webette/logs.jsonl` or a configured folder).

Logs help understand what Webette is doing during build/serve and diagnose issues.

---

## Special folders

Some folders have a specific purpose:

- **Templates folder** (e.g. `_templates/`)
  Contains layouts and partials.

- **Webette internal folder** (e.g. `.webette/`)
  Contains logs and possibly other technical files.
  The name can be configured in the tool configuration.

All other folders in the **site root** are, by default, considered **potential collections**, unless overridden by the theme or configuration.

---

_This glossary intentionally focuses on the core concepts.
Concrete folder names like `blog/`, `pages/`, or `posts/` are implementation or theme choices, not reserved Webette terms._
