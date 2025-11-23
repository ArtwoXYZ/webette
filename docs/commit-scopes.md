# Commit Scopes for Webette

This document defines the official commit scopes used throughout the Webette project.
Use them together with the conventional commit format:

```
<type>(<scope>): <short description>
```

---

## Core Scopes

These correspond to Webette’s main systems and will cover most commits:

- **core** — Main engine logic (parsing, AST handling, rendering pipeline).
- **cli** — Commands, flags, build/serve actions, log output.
- **config** — Site configuration handling and tool-level config.
- **collections** — Logic for content collections, sorting, indexing.
- **templates** — Templating engine, layouts, partials, template resolution.
- **plugins** — Plugin system, hooks, plugin API.
- **renderer** — HTML generation, block processing, rendering steps.
- **fs** — Filesystem operations, reading/writing, watch mode.
- **logs** — Logging system, translations, future UI integration.
- **site** — Output structure and final site generation.

---

## Secondary Scopes

Useful for supporting parts of the project:

- **docs** — Documentation updates.
- **deps** — Dependency additions, removals, and updates.
- **tests** — Unit tests and integration tests.
- **ci** — Continuous integration setups and workflows.
- **build** — Build scripts for Webette itself.

---

## Optional Scopes

Use these if/when the related modules exist:

- **ui** — The future interface for running build/serve.
- **examples** — Example sites or starter templates.
- **themes** — Theme system and theme management.
- **utils** — Shared utility functions.

---

## Examples

```
feat(core): add collection scanning with numeric ordering
refactor(renderer): simplify block resolution flow
fix(fs): handle missing index.md in nested folders
feat(plugins): implement onLoad and onRender hooks
docs(glossary): update terminology
chore(config): add environment config file support
build(ci): add Bun watch mode to serve command
```
