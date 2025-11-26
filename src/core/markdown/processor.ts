import { unified, type Processor, type Plugin } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import type { Root as MdastRoot } from "mdast";

export type MarkdownAst = MdastRoot;

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
  // Parse Markdown source into mdast and run remark plugins
  const processor = createMarkdownProcessor(remarkPlugins);
  const tree = processor.parse(source);
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
