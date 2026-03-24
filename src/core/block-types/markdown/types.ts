/**
 * Re-exports mdast Root as the canonical Markdown AST type for the codebase.
 */

import type { Root as MdastRoot } from "mdast";

export type MarkdownAst = MdastRoot;
