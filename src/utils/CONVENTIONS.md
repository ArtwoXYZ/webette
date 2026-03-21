# Naming Conventions — Function Verbs

This document lists the verb prefixes used across the codebase and their semantic intent.
New code should follow these conventions for consistency.

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
