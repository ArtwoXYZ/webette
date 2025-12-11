import { unified, type Processor, type Plugin } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { type MarkdownAst } from "./types";

type RemarkPlugin = Plugin<any[], any>;
type RemarkPluginLike = RemarkPlugin | [RemarkPlugin, ...any[]];

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
    /\(\s*(collection|entry|post|block|image|file)\s*:\s*([^)\n]+)\)/gi,
    (_, kind, rest) => {
      const encodeValue = (val: string) => val.trim().replace(/\s+/g, "%20");
      const pieces = rest.split(",").map((s) => s.trim()).filter(Boolean);
      const normalized: string[] = [];

      if (pieces.length === 0) {
        return `(${kind.toLowerCase()}:)`;
      }

      // The first segment belongs to the first key captured in the regex.
      normalized.push(`${kind.toLowerCase()}:${encodeValue(pieces[0])}`);

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
  remarkPlugins: unknown[] = []
): Promise<string> {
  // Convert mdast to HTML using the same remark plugins + rehype stringify
  const processor = createMarkdownProcessor(remarkPlugins)
    .use(remarkRehype)
    .use(rehypeStringify);

  const hast = await processor.run(ast as any);
  return processor.stringify(hast) as string;
}
