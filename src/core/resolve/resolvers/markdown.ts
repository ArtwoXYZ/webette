import { readFile } from "node:fs/promises";
import * as path from "node:path";
import type { Resolver } from "../registry";
import { parseMarkdownToAst } from "../../markdown/processor";

// Resolve markdown blocks: return raw text (no HTML yet)
export const resolveMarkdown: Resolver = async (block, ctx) => {
  if (ctx.readContent === false) return undefined;

  const filePath = path.join(ctx.rootDir, block.path);
  const raw = await readFile(filePath, "utf8");

  try {
    const ast = parseMarkdownToAst(raw); // Keep AST for later transforms/rendering
    return { raw, ast };
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
