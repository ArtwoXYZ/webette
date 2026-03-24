# Code Conventions

This page documents the coding conventions used in the Webette engine codebase (`src/`).

## Comment philosophy

Webette follows **Clean Code** principles for comments (Robert C. Martin):

- **Good code is self-documenting.** Prefer clear naming over explanatory comments.
- **Comments explain "why", never "what".** If a comment restates the code, remove it.
- **No noise.** Redundant comments, commented-out code, and decorative fillers are removed on sight.
- **No permanent TODOs.** A TODO is a temporary marker, not a backlog item.

### File headers (mandatory)

Every `.ts` file starts with a `/** ... */` block comment describing the module's role. Keep it to one or two sentences. The header must add context beyond what the filename already says.

Good:

```ts
/**
 * Immutable builder for Site model updates. Deep-clones the base site so callers never mutate shared state.
 */
```

Bad (restates the filename):

```ts
/**
 * Site model transformer.
 */
```

### Inline comments

Use inline `//` comments only when the code alone cannot convey intent:

- **Architecture decisions** — why a design choice was made.
- **Warnings and consequences** — non-obvious side effects, runtime quirks, ordering constraints.
- **Edge case rationale** — why an empty `catch` block is intentional, why a guard exists.

Do not comment:

- What the next function call does (the function name should say it).
- What a variable holds (the variable name should say it).
- What a loop iterates over (the code is the spec).

### Section separators (optional)

In long files with distinct sections (types, builders, filters...), use the em-dash separator pattern:

```ts
// ── Types ──────────────────────────────────────────────────
```

This is optional and reserved for files where visual navigation genuinely helps (e.g. 200+ line type files or multi-phase modules).

### Comments on types and interfaces

Inline field comments are acceptable when:

- The field type is opaque (`unknown`, generic) and needs clarification.
- The field name alone does not convey a non-obvious constraint or alias.

Do not add field comments that repeat the type or the field name.

## Function naming conventions

New code must follow these verb prefixes for consistency.

| Prefix | Semantics | Examples |
|-----------|-----------------------------------------------|----------------------------------------------|
| `normalize` | Pure, idempotent transformation (no I/O, no context). Same input always gives same output. | `normalizeClass`, `normalizePath`, `normalizeKey` |
| `resolve` | Lookup or computation that depends on runtime context or the site model. May combine multiple sources. | `resolveContent`, `resolveRoute`, `resolveBlocks` |
| `parse` | Structured extraction from raw text or config. Reads a string/buffer and returns a typed shape. | `parsePluginMetadata`, `parseNavigationBlock`, `parseBoolean` |
| `build` | Constructs a composite object from parts. Assembles, does not fetch. | `buildBlockRouteHint`, `buildCollectionForestNodes`, `buildExcludeSet` |
| `create` | Factory / instantiation. Returns a new, ready-to-use instance. | `createRenderPage`, `createLogger` |
| `find` | Searches within an in-memory collection and returns a single match or `undefined`. | `findCustomSorting`, `findLayout` |
| `load` | Reads from disk (I/O) then transforms. Combines file access with parsing/enrichment. | `loadPlugins`, `loadSiteConfig` |
| `scan` | Recursive filesystem traversal. Discovers structure by walking directories. | `scanPluginsDirectory`, `scanDirectory` |
| `apply` | Mutates or transforms a model in place (or returns a transformed copy). Side-effect-ish intent. | `applySorting`, `applyVisibility` |
| `register` | Adds a handler/helper to a registry (Handlebars, resolver map, etc.). | `registerMenuHelper`, `registerResolver` |

### When to pick which verb

- **No I/O, no context?** Use `normalize` or `build`.
- **Needs the site model or runtime info?** Use `resolve`.
- **Reads from disk?** Use `load` (single file) or `scan` (directory walk).
- **Returns a new instance?** Use `create`.
- **Searches a collection?** Use `find`.
- **Transforms a model?** Use `apply`.
- **Parses raw input?** Use `parse`.

## Language

All code comments are written in **English**. User-facing messages are localized via JSON catalogs in `locales/`.
