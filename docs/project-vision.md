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
  _templates/
    layouts/
      default.html
      page.html
      post.html
    partials/
      header.html
      footer.html
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
      layout: "post.html",
      listLayout: "blog-index.html",
    },
    pages: {
      layout: "page.html",
      routing: "root", // /pages/index -> /
    },
  },

  templates: {
    root: "_templates",
  },

  plugins: [
    // Optional plugin references
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

## 8. CLI Commands

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

## 9. Development Philosophy

- **Filesystem-first:** the disk is the single source of truth.
- **No hidden conventions:** all behavior must be explicit.
- **Simplicity first:** no magic, no unnecessary abstraction.
- **Extensible** through templates and plugins, never through opaque internal logic.
- **Portable:** a site must function simply by being moved or unzipped.
- **Predictable:** all collections follow the same rules unless configured otherwise.
