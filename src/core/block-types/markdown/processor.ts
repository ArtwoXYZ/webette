/**
 * Markdown block resolver (AST + HTML rendering).
 */

import { unified, type Processor, type Plugin } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { type MarkdownAst } from "./types";
import { slugify } from "../../../utils/naming";

type RemarkPlugin = Plugin<any[], any>;
type RemarkPluginLike = RemarkPlugin | [RemarkPlugin, ...any[]];
const DEFAULT_MARKDOWN_CLASS = "webt-md";
type AddClassOptions = { className?: string };

function applyPlugins<P extends Processor<any, any, any, any, any>>(
  processor: P,
  plugins: RemarkPluginLike[] = []
): P {
  for (const plugin of plugins) {
    if (!plugin) continue;
    // Accept both plugin functions and [plugin, options] tuples
    if (Array.isArray(plugin)) {
      const [fn, opts] = plugin;
      processor.use(fn as any, opts);
    } else {
      processor.use(plugin as any);
    }
  }
  return processor;
}

export function createMarkdownProcessor(remarkPlugins: unknown[] = []) {
  // Parse CommonMark + GFM into mdast, then let remark plugins mutate the tree
  const processor = unified().use(remarkParse).use(remarkGfm);
  applyPlugins(processor as Processor<any, any, any, any, any>, remarkPlugins as RemarkPluginLike[]);
  return processor;
}

export async function parseMarkdownToAst(
  source: string,
  remarkPlugins: unknown[] = []
): Promise<MarkdownAst> {
  const splitInternalSegments = (raw: string): string[] => {
    const keys = ["collection", "coll", "entry", "block"];
    const result: string[] = [];
    let start = 0;
    for (let i = 0; i < raw.length; i += 1) {
      if (raw[i] !== ",") continue;
      let j = i + 1;
      while (j < raw.length && /\s/.test(raw[j] ?? "")) j += 1;
      let matched = false;
      for (const key of keys) {
        const slice = raw.slice(j, j + key.length);
        const after = raw[j + key.length];
        if (slice.toLowerCase() === key && after === ":") {
          const segment = raw.slice(start, i).trim();
          if (segment) result.push(segment);
          start = j;
          matched = true;
          break;
        }
      }
      if (matched) {
        i = j - 1;
      }
    }
    const tail = raw.slice(start).trim();
    if (tail) result.push(tail);
    return result;
  };

  // Normalize internal-link URLs so Markdown parses them as real links:
  // - remove spaces around separators
  // - percent-encode spaces inside values (collection/entry/block names)
  const sanitized = source.replace(
    /\(\s*(collection|coll|entry|block)\s*:\s*([^)\n]+)\)/gi,
    (_, kind, rest) => {
      const encodeValue = (val: string) => val.trim().replace(/\s+/g, "%20");
      const pieces = splitInternalSegments(rest);
      const normalized: string[] = [];

      if (pieces.length === 0) {
        return `(${kind.toLowerCase()}:)`;
      }

      // The first segment belongs to the first key captured in the regex.
      const mainKey = kind.toLowerCase() === "coll" ? "collection" : kind.toLowerCase();
      normalized.push(`${mainKey}:${encodeValue(pieces[0] ?? "")}`);

      // The remaining segments can declare other keys (entry, block, etc.).
      for (const piece of pieces.slice(1)) {
        const [k, ...vParts] = piece.split(":");
        if (!k || vParts.length === 0) continue;
        const value = encodeValue(vParts.join(":"));
        normalized.push(`${k.trim().toLowerCase()}:${value}`);
      }

      return `(${normalized.join(",")})`;
    }
  );
  // Parse Markdown source into mdast and run remark plugins
  const processor = createMarkdownProcessor(remarkPlugins);
  const tree = processor.parse(sanitized);
  const processed = await processor.run(tree);
  return processed as MarkdownAst;
}

export async function renderMarkdownToHtml(
  ast: MarkdownAst,
  remarkPlugins: unknown[] = [],
  options?: { enableExternalLinks?: boolean }
): Promise<string> {
  // Convert mdast to HTML using the same remark plugins + rehype stringify
  // Allow raw HTML nodes in markdown (used by internal image rendering).
  const processor = createMarkdownProcessor(remarkPlugins).use(remarkRehype, {
    allowDangerousHtml: true,
  });

  if (options?.enableExternalLinks !== false) {
    try {
      const mod = await import("rehype-external-links");
      const externalLinks = (mod as any).default ?? mod;
      processor.use(externalLinks as any, {
        target: "_blank",
        rel: ["noopener", "noreferrer"],
      });
    } catch {
      // plugin not installed or failed to load; skip silently
    }
  }

  processor
    .use(addIdsToHeadings as any)
    .use(addClassToAllElements as any, { className: DEFAULT_MARKDOWN_CLASS })
    .use(rehypeStringify, { allowDangerousHtml: true });

  const hast = await processor.run(ast as any);
  return processor.stringify(hast) as string;
}

// Rehype plugin: add stable ids to heading tags when missing.
function addIdsToHeadings() {
  return (tree: any) => {
    const counts = new Map<string, number>();

    const extractText = (node: any): string => {
      if (!node) return "";
      if (node.type === "text" && typeof node.value === "string") {
        return node.value;
      }
      if (Array.isArray(node.children)) {
        return node.children.map(extractText).join("");
      }
      return "";
    };

    const walk = (node: any) => {
      if (!node) return;
      if (node.type === "element") {
        const tag = node.tagName;
        if (typeof tag === "string" && /^h[1-6]$/.test(tag)) {
          const props = node.properties ?? {};
          const existingId = props.id;
          if (!existingId) {
            const text = extractText(node).trim();
            const base = slugify(text || "section");
            const seen = counts.get(base) ?? 0;
            const next = seen + 1;
            counts.set(base, next);
            const id = next === 1 ? base : `${base}-${next}`;
            props.id = id;
            node.properties = props;
          }
        }
      }
      if (Array.isArray(node.children)) {
        node.children.forEach(walk);
      }
    };

    walk(tree);
  };
}

// Rehype plugin: add a CSS class to every element without overwriting existing classes.
function addClassToAllElements(options: AddClassOptions = {}) {
  const className =
    typeof options.className === "string" && options.className.trim()
      ? options.className.trim()
      : DEFAULT_MARKDOWN_CLASS;

  return (tree: any) => {
    const walk = (node: any) => {
      if (node && node.type === "element") {
        const props = node.properties ?? {};
        const existing = props.className;
        const list: string[] = Array.isArray(existing)
          ? existing.map(String)
          : typeof existing === "string"
            ? existing.split(/\s+/).filter(Boolean)
            : [];

        if (!list.includes(className)) {
          list.push(className);
        }

        props.className = list;
        node.properties = props;
      }

      if (node && Array.isArray(node.children)) {
        node.children.forEach((child: any) => walk(child));
      }
    };

    walk(tree);
  };
}
