import { unified, type Processor, type Plugin } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { type MarkdownAst } from "./types";

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
  // Normalize internal-link URLs so Markdown parses them as real links:
  // - remove spaces around separators
  // - percent-encode spaces inside values (collection/entry/block names)
  const sanitized = source.replace(
    /\(\s*(collection|coll|entry|block)\s*:\s*([^)\n]+)\)/gi,
    (_, kind, rest) => {
      const encodeValue = (val: string) => val.trim().replace(/\s+/g, "%20");
      const pieces = rest.split(",").map((s: string) => s.trim()).filter(Boolean);
      const normalized: string[] = [];

      if (pieces.length === 0) {
        return `(${kind.toLowerCase()}:)`;
      }

      // The first segment belongs to the first key captured in the regex.
      const mainKey = kind.toLowerCase() === "coll" ? "collection" : kind.toLowerCase();
      normalized.push(`${mainKey}:${encodeValue(pieces[0])}`);

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
    .use(addClassToAllElements as any, { className: DEFAULT_MARKDOWN_CLASS })
    .use(rehypeStringify, { allowDangerousHtml: true });

  const hast = await processor.run(ast as any);
  return processor.stringify(hast) as string;
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
