import { readFile } from "node:fs/promises";
import * as path from "node:path";
import type { Resolver } from "../registry";
import {
  parseMarkdownToAst,
  renderMarkdownToHtml,
} from "../../block-types/markdown/processor";

// Resolve markdown blocks: keep raw text, mdast, and rendered HTML
export const resolveMarkdown: Resolver = async (block, ctx) => {
  if (ctx.readContent === false) return undefined;

  const filePath = path.join(ctx.rootDir, block.path);
  const raw = await readFile(filePath, "utf8");

  try {
    const remarkPlugins = ctx.remarkPlugins ?? [];
    const enableExternalLinks =
      ctx.toolEnv?.markdown &&
      typeof ctx.toolEnv.markdown === "object" &&
      (ctx.toolEnv.markdown as any).externalLinks === false
        ? false
        : true;
    const ast = await parseMarkdownToAst(raw, remarkPlugins);
    const html = await renderMarkdownToHtml(ast, remarkPlugins, {
      enableExternalLinks,
    });

    return {
      raw,
      ast,
      html,
      meta: {
        format: "markdown",
        renderedWith: "remark->rehype->html",
      },
    };
  } catch (err) {
    // Do not fail the build on parse errors: keep raw content and log
    ctx.logger?.warn("resolve.markdown.parseError", {
      blockId: block.id,
      path: block.path,
      error: String(err),
    });
    return { raw };
  }
};
