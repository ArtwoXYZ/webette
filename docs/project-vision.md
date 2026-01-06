# Webette – Vision and Development Principles

This document summarizes the core concepts that Webette follows and the rules that should guide any future development.
It defines what Webette is, how it works, and what must remain true as the project evolves.

---

## 1. General Principle

Webette is a simple, lightweight, filesystem-based tool.
A Webette site is just a folder containing:

- a configuration file (`webette.config.ts`)
- one or more **collections** (directories)
- **entries** inside those collections
- a `_templates` directory with layouts and partials

No generation step, no installer, and no complex setup are required.

---

## 2. Structure of a Webette Project

A typical Webette project looks like:

```
my-site/
  webette.config.ts
  posts/
    01-example/
      index.md
  pages/
    index/
    index.md
  templates/
    wrapper/
      wrapper.hbs
    layout/
      post.hbs
      page.hbs
    partial/
      header.hbs
      footer.hbs
```

Webette must work immediately:

```
bun run serve path/to/my-site
# Target experience (once the binary exists):
# webette serve path/to/my-site
```

---

## 3. Collections and Entries

- **Every top-level directory** in the project is considered a **collection**, except `_templates` or special metadata files.
- A **collection** contains a set of **entries** (directories or files).
- Webette does **not** hardcode any special meaning for directories like `posts` or `pages`.
  These are conventions, not reserved keywords.
- Entry ordering is uniform across all collections:

  1. numerical prefix (e.g., `01-...`)
  2. alphabetical name

These rules apply consistently everywhere.

---

## 4. Configuration (`webette.config.ts`)

The config file describes **how collections should be displayed**, not whether they exist.

Example structure:

```ts
export default {
  site: {
    title: "...",
    lang: "en",
    theme: "...",
  },

  collections: {
    posts: {
      layout: "post.hbs",
      listLayout: "blog-index.hbs",
    },
    pages: {
      layout: "page.hbs",
      routing: "root", // /pages/index -> /
    },
  },

  templates: {
    root: "_templates",
  },

  plugins: [
    // Optional plugin references (JS/ESM), relative to the site root
    // Example: "_plugins/my-plugin.js"
  ],
};
```

Configuration should remain simple, explicit, and free of implicit behavior.

---

## 5. Templates

Templates live inside:

```
_templates/
  layouts/
  partials/
```

Rules:

- Templates must not rely on a complex internal hierarchy.
- Layouts are assigned through the configuration.
- Partials are used for composition (header, footer, etc.).
- Webette themes are **not** a theming system; a "theme" is simply a pre-built project.

---

## 6. Webette Themes

A Webette theme is a **complete project folder**, often distributed as a zip archive.
It contains:

- a set of collections
- sample content
- templates
- a preconfigured `webette.config.ts`

There is no “theme installation” mechanism in the core.
Users simply extract the folder and run `bun run serve <path>` (the goal is to expose a global `webette serve` later).

---

## 7. Plugins

- Plugins are optional.
- The configuration file may reference plugins, but the core should never require them.
- A plugin may extend:

  - content blocks
  - text enrichment
  - extra functionality (comments, reactions, etc.)

- The core must remain independent and minimal.

---

## 8. Generic blocks and plugins

Webette uses a single generic type, `unclassified`, for any file that is not recognized as a core content type (markdown, image, audio, video, folder).

Plugins can:

- inspect `unclassified` blocks,
- read their content (for example, JSON, YAML, CSV),
- and attach semantic metadata or structured content.

Examples of what plugins might do:

- mark `.json` and `.yaml` files as `meta.kind = "data"` and expose a parsed object;
- mark `.csv` files as `meta.kind = "table"` and expose a list of rows;
- recognize `.pdf` files and extract their text.

This design keeps the core small and lets advanced behavior live in plugins.

---

## 9. CLI Commands

The CLI should remain minimal and straightforward.

Current commands (run via Bun scripts):

```
bun run serve <path>
bun run build <path>
```

Target experience (once packaged globally):

```
webette serve <path>
webette build <path>
```

Flags (current):

- `-v` / `--verbose`
- `--export-model-dir [path]`
- `--export-model-only`

No unnecessary verbosity or complex defaults.

---

## 10. Development Philosophy

- **Filesystem-first:** the disk is the single source of truth.
- **No hidden conventions:** all behavior must be explicit.
- **Simplicity first:** no magic, no unnecessary abstraction.
- **Extensible** through templates and plugins, never through opaque internal logic.
- **Portable:** a site must function simply by being moved or unzipped.
- **Predictable:** all collections follow the same rules unless configured otherwise.
