import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { Root as MdastRoot } from "mdast";

export type MarkdownAst = MdastRoot;

export function createMarkdownProcessor() {
  // Minimal remark pipeline: parse CommonMark + GFM into mdast
  return unified().use(remarkParse).use(remarkGfm);
}

export function parseMarkdownToAst(source: string): MarkdownAst {
  // Parse Markdown source into mdast; rendering to HTML happens later
  return createMarkdownProcessor().parse(source) as MarkdownAst;
}
