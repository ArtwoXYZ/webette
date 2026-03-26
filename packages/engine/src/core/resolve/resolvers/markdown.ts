/**
 * Parses markdown to AST and renders to HTML via remark/rehype, with configurable heading shift.
 */

import { readFile } from "node:fs/promises";
import * as path from "node:path";
import type { Resolver } from "../registry";
import {
  parseMarkdownToAst,
  remarkShiftHeadings,
  renderMarkdownToHtml,
} from "../../block-types/markdown/processor";

export const resolveMarkdown: Resolver = async (block, ctx) => {
  if (ctx.readContent === false) return undefined;

  const filePath = path.join(ctx.rootDir, block.path);
  const raw = await readFile(filePath, "utf8");

  try {
    const remarkPlugins = ctx.remarkPlugins ?? [];
    const siteMarkdown = ctx.site?.config?.markdown;
    const headingShiftRaw =
      siteMarkdown && typeof siteMarkdown === "object"
        ? (siteMarkdown as Record<string, unknown>).headingShift
        : undefined;
    const headingShift =
      typeof headingShiftRaw === "number"
        ? headingShiftRaw
        : typeof headingShiftRaw === "string" && headingShiftRaw.trim()
          ? Number(headingShiftRaw)
          : 0;
    const shiftPlugin =
      Number.isFinite(headingShift) && Math.trunc(headingShift) !== 0
        ? remarkShiftHeadings(headingShift)
        : null;
    const combinedRemarkPlugins = shiftPlugin
      ? [...remarkPlugins, shiftPlugin]
      : remarkPlugins;
    const enableExternalLinks =
      ctx.site?.config?.markdown &&
        typeof ctx.site.config.markdown === "object" &&
        (ctx.site.config.markdown as Record<string, unknown>).externalLinks === false
        ? false
        : true;
    const ast = await parseMarkdownToAst(raw, combinedRemarkPlugins);
    const html = await renderMarkdownToHtml(ast, combinedRemarkPlugins, {
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
