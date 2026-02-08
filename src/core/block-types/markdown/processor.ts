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

export function remarkShiftHeadings(shift: number): RemarkPlugin {
  const normalizedShift = Number.isFinite(shift) ? Math.trunc(shift) : 0;

  return () => {
    return (tree: any) => {
      if (!normalizedShift) return;
      const data = (tree && typeof tree === "object" ? tree.data : null) ?? {};
      if (data.__webetteHeadingShiftApplied) return;
      data.__webetteHeadingShiftApplied = true;
      if (tree && typeof tree === "object") {
        tree.data = data;
      }

      const clampDepth = (depth: number): number =>
        Math.min(6, Math.max(1, depth + normalizedShift));

      const walk = (node: any) => {
        if (!node) return;
        if (node.type === "heading" && typeof node.depth === "number") {
          node.depth = clampDepth(node.depth);
        }
        if (Array.isArray(node.children)) {
          node.children.forEach(walk);
        }
      };

      walk(tree);
    };
  };
}

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
    const looksLikeKeyAt = (pos: number): boolean => {
      let end = pos;
      while (end < raw.length && /[A-Za-z0-9_-]/.test(raw[end] ?? "")) end += 1;
      if (end === pos) return false;
      while (end < raw.length && /\s/.test(raw[end] ?? "")) end += 1;
      return raw[end] === ":";
    };

    const result: string[] = [];
    let start = 0;
    for (let i = 0; i < raw.length; i += 1) {
      if (raw[i] !== ",") continue;
      let j = i + 1;
      while (j < raw.length && /\s/.test(raw[j] ?? "")) j += 1;
      if (looksLikeKeyAt(j)) {
        const segment = raw.slice(start, i).trim();
        if (segment) result.push(segment);
        start = j;
        i = j - 1;
      }
    }
    const tail = raw.slice(start).trim();
    if (tail) result.push(tail);
    return result;
  };

  const sanitizeInternalTargetsOutsideCode = (input: string): string => {
    const sanitizeChunk = (chunk: string): string =>
      chunk.replace(
        /\(\s*(collection|coll|entry|block|url|href)\s*:\s*([^)\n]+)\)/gi,
        (_, kind, rest) => {
          const encodeValue = (val: string) => val.trim().replace(/\s+/g, "%20");
          const pieces = splitInternalSegments(rest);
          const normalized: string[] = [];

          if (pieces.length === 0) {
            return `(${kind.toLowerCase()}:)`;
          }

          // The first segment belongs to the first key captured in the regex.
          const lowerKind = kind.toLowerCase();
          const mainKey =
            lowerKind === "coll" ? "collection" : lowerKind === "href" ? "url" : lowerKind;
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

    let out = "";
    let buffer = "";

    let inFence = false;
    let fenceChar: "`" | "~" | "" = "";
    let fenceLen = 0;

    let inCodeSpan = false;
    let codeSpanLen = 0;

    const flush = () => {
      if (!buffer) return;
      out += sanitizeChunk(buffer);
      buffer = "";
    };

    const isFenceChar = (ch: string) => ch === "`" || ch === "~";

    const isFenceLineStartAt = (pos: number) => {
      // CommonMark: up to 3 leading spaces allowed before a fence.
      let i = pos;
      let spaces = 0;
      while (i < input.length && input[i] === " " && spaces < 3) {
        i += 1;
        spaces += 1;
      }

      const ch = input[i] ?? "";
      if (!isFenceChar(ch)) return null;

      let run = 0;
      while (i + run < input.length && input[i + run] === ch) run += 1;
      if (run < 3) return null;

      return { start: pos, markerPos: i, ch: ch as "`" | "~", run };
    };

    const readLineEnd = (pos: number) => {
      const idx = input.indexOf("\n", pos);
      return idx === -1 ? input.length : idx + 1;
    };

    let atLineStart = true;

    for (let i = 0; i < input.length;) {
      if (inFence && atLineStart && !inCodeSpan) {
        const fence = isFenceLineStartAt(i);
        const lineEnd = readLineEnd(i);
        if (fence && fence.ch === fenceChar && fence.run >= fenceLen) {
          // Closing fence line.
          out += input.slice(i, lineEnd);
          i = lineEnd;
          atLineStart = true;
          inFence = false;
          fenceChar = "";
          fenceLen = 0;
          continue;
        }

        // Inside fence: copy whole line as-is.
        out += input.slice(i, lineEnd);
        i = lineEnd;
        atLineStart = true;
        continue;
      }

      if (!inFence && atLineStart && !inCodeSpan) {
        const fence = isFenceLineStartAt(i);
        if (fence) {
          // Opening fence line: flush normal text and copy whole line as-is.
          flush();
          const lineEnd = readLineEnd(i);
          out += input.slice(i, lineEnd);
          i = lineEnd;
          atLineStart = true;
          inFence = true;
          fenceChar = fence.ch;
          fenceLen = fence.run;
          continue;
        }
      }

      const ch = input[i] ?? "";

      if (!inFence && ch === "`") {
        let run = 1;
        while (i + run < input.length && input[i + run] === "`") run += 1;

        if (!inCodeSpan) {
          flush();
          out += "`".repeat(run);
          inCodeSpan = true;
          codeSpanLen = run;
          i += run;
          atLineStart = false;
          continue;
        }

        if (run === codeSpanLen) {
          out += "`".repeat(run);
          inCodeSpan = false;
          codeSpanLen = 0;
          i += run;
          atLineStart = false;
          continue;
        }

        // Backticks inside a code span, but not the closing delimiter.
        out += "`".repeat(run);
        i += run;
        atLineStart = false;
        continue;
      }

      if (inCodeSpan) {
        out += ch;
      } else {
        buffer += ch;
      }

      i += 1;
      atLineStart = ch === "\n";
    }

    flush();
    return out;
  };

  // Normalize internal-link URLs so Markdown parses them as real links:
  // - remove spaces around separators
  // - percent-encode spaces inside values (collection/entry/block names)
  const sanitized = sanitizeInternalTargetsOutsideCode(source);
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
        test: (node: any) => {
          const props = (node && typeof node === "object" ? (node as any).properties : null) ?? {};
          return props["data-webt-md-custom"] !== "1";
        },
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
