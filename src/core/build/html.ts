/**
 * HTML formatting for generated pages.
 *
 * Pretty-prints HTML via rehype when enabled.
 */

import type { Root } from "hast";
import { unified, type Plugin } from "unified";
import rehypeFormat from "rehype-format";
import rehypeParse from "rehype-parse";
import rehypeStringify from "rehype-stringify";
import type { Logger } from "../../logging/logger";

export async function formatHtml(
  rawHtml: string,
  targetPath: string,
  options: { prettyPrint: boolean; logger: Logger }
): Promise<string> {
  const { prettyPrint, logger } = options;
  if (!prettyPrint) return rawHtml;

  try {
    type ParseOptions = Parameters<typeof rehypeParse>[0];
    type FormatOptions = Parameters<typeof rehypeFormat>[0];
    type StringifyOptions = Parameters<typeof rehypeStringify>[0];

    const parsePlugin = rehypeParse as Plugin<[ParseOptions?], Root, Root>;
    const formatPlugin = rehypeFormat as Plugin<[FormatOptions?], Root, Root>;
    const stringifyPlugin = rehypeStringify as Plugin<[StringifyOptions?], Root, string>;

    const formatted = await unified()
      .data("settings", { fragment: false })
      .use(parsePlugin, { fragment: false })
      .use(formatPlugin, { indent: 2 })
      .use(stringifyPlugin)
      .process(rawHtml);
    return String(formatted);
  } catch (err) {
    logger.warn("build.prettyPrintFailed", { path: targetPath, error: String(err) });
    return rawHtml;
  }
}
