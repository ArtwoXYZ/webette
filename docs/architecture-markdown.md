# 📌 Webette — Markdown Architecture Overview

## 1. Goal

Webette uses Markdown extensively, but must keep its own plugin system clean and distinct.
The plan is to use **remark/unified internally**, while exposing a **simple, Webette-friendly Markdown API** to developers.

---

## 2. Markdown Engine (internal)

- Webette uses **unified + remark-parse** under the hood.
- This logic lives in:
  `core/markdown/processor.ts`
- Public API is intentionally minimal:

```ts
parseMarkdownToAst(source: string, remarkPlugins?: unknown[]): Promise<MarkdownAst>;
```

- `MarkdownAst` is a **Webette-defined type**, even if internally backed by mdast.

### Why

- We keep full power of remark/unified.
- Webette remains free to change its internal parser later.
- Plugin authors don’t have to learn unified to work with Webette.

---

## 3. Two plugin layers, clearly separated

### A) **Webette Plugins** (official plugin system)

They operate at the site level: collections, entries, blocks, templates.

```ts
interface WebettePlugin {
  name: string;

  onSite?(site): Site | void;
  onCollection?(collection): Collection | void;
  onEntry?(entry): Entry | void;

  // optional hook for Markdown blocks
  onMarkdownBlock?(ctx: MarkdownBlockContext): void;
}
```

### B) **remark/unified Plugins** (Markdown-only)

Used only to extend Markdown syntax or AST behavior.
Configured separately:

```ts
export default defineConfig({
  markdown: {
    remarkPlugins: [require("remark-gfm"), require("remark-footnotes")],
  },
});
```

> Internals: Webette relies on unified/remark (remark-parse, remark-gfm) to parse Markdown into mdast and transform it. These dependencies are internal; Webette plugins do not need to know about unified.

### Why this separation?

- Prevent conceptual confusion between “site plugins” and “Markdown plugins”.
- 95% of plugin authors only deal with the Webette API.
- Power users still have full access to remark plugins when needed.

---

## 4. Markdown context exposed to Webette Plugins

```ts
interface MarkdownBlockContext {
  source: string; // raw markdown
  ast: MarkdownAst; // Webette AST wrapper
  meta: Record<string, any>;

  toHtml?(): string; // optional helpers
  visit?(): void;
}
```

### Rationale

- Gives Webette plugins controlled access to the Markdown AST.
- Prevents direct dependency on unified/remark in plugin code.
- Keeps the internal architecture flexible and replaceable.

---

## 5. Processing Flow (Markdown → HTML)

1. Read `.md` file
2. `parseMarkdownToAst()` (remark → mdast internally)
3. Webette plugins may transform AST or metadata
4. Convert Markdown AST to HTML internally (remark → rehype → html)
5. Inject HTML into templates and render pages
6. Store `raw`, `ast`, `html`, and lightweight metadata (`meta.format`, `meta.renderedWith`) in the model for templates/plugins

### Rendering defaults (HTML)

- All rendered Markdown elements receive the CSS class `webt-md`, applied at rehype stage; no wrapper needed. Use it to scope your typography/styles: `.webt-md { ... }` or `.webt-md :where(h1, p, a) { ... }`.
- External links are decorated to open in a new tab with safe `rel` attributes (`target="_blank"`, `rel="noopener noreferrer"`) via `rehype-external-links` (optionalDependency). If the plugin is missing, Markdown rendering continues without altering links.

---

## Internal links (collection:/entry:/block:)

After the site model is resolved, Webette rewrites custom internal URLs in Markdown to real routes:

- Collection index: `[All posts](collection: posts)`
- Entry (collection implied): `[My first post](entry: my first post)`
- Entry with explicit collection: `[My first post](collection: posts, entry: my first post)`
- Image block in the same entry: `![Nebula](block: The GREAT NEBULA in ORION.jpg)`
- Image block in another entry: `![Stars](post: my second post, block: Stars Whose Distances Are Best Known.jpg)`

Rules:
- Prefixes accepted: `collection:`/`coll:`, `entry:`/`post:`, `block:`/`image:`/`file:`.
- Names match slug, id, name, or raw filename without numeric prefixes; spaces are normalized/decoded.
- If an image block is referenced inline, its block gets `content.meta.renderedInline = true` so templates can skip duplicate rendering.
- Unresolved targets emit warning `markdown.internalLink.unresolved`.

---

## Ignoring blocks during scan (ignore.webt)

Skip auto-rendering of specific files by adding `ignore.webt` in an entry (or subfolder) with one filename per line (exact filename on disk, with extension). Empty lines and lines starting with `#` are ignored. Listed blocks are still scanned, resolved, exported, and copied, but are marked `skipRender` and removed from the default `blocks` array passed to templates. They remain available in the model (e.g., via `entry.blocks` or internal links). A `scan.blockIgnored` log is emitted when a block is marked.

---

## One-sentence summary

**Webette uses remark/unified internally for Markdown, but exposes a clean, unified Webette API and a clearly separated plugin architecture so developers never need to interact with unified unless they explicitly want to.**
