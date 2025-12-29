// Internal link resolver for Markdown content:
// - Rewrites custom URLs (collection:/entry:/block:) to real routes based on the resolved site model.
// - Re-renders markdown HTML after URL rewrites to keep content/html/ast in sync.

import type { Root, Content, Parent, Link as MdastLink } from "mdast";
import { renderMarkdownToHtml } from "../block-types/markdown/processor";
import type { Logger } from "../../logging/logger";
import type { Site } from "../model";
import {
  parseInternalReference,
  matchCollection,
  matchEntry,
  matchBlock,
} from "./internal-targets";

export async function rewriteInternalLinks(options: {
  site: Site;
  remarkPlugins?: unknown[];
  logger?: Logger;
}): Promise<Site> {
  const { site, remarkPlugins, logger } = options;

  const collections = site.collections
    ? await Promise.all(
        site.collections.map(async (collection) => {
          const entries = await Promise.all(
            collection.entries.map(async (entry) => {
              const blocks = await Promise.all(
                entry.blocks.map(async (blk) => {
                  if (blk.type !== "markdown" || !blk.content?.ast) return blk;
                  const ast = blk.content.ast as Root;

                  const appendClassName = (value: string | undefined, className: string): string => {
                    const base = value?.trim();
                    if (!base) return className;
                    const parts = base.split(/\s+/);
                    return parts.includes(className) ? base : `${base} ${className}`;
                  };

                  const visit = (node: Root | Content): void => {
                    if (!node || typeof node !== "object") return;

                    const isParent = Array.isArray((node as Parent).children);
                    const isLink = (node as MdastLink).type === "link";

                    if (isLink) {
                      const linkNode = node as MdastLink;
                      const parsed = parseInternalReference(linkNode.url);
                      if (parsed?.target) {
                        let targetRoute: string | undefined;

                        if (parsed.target.kind === "collection") {
                          const col = matchCollection(site, parsed.target.collectionName);
                          targetRoute = col?.route;
                        } else if (parsed.target.kind === "entry") {
                          const col = parsed.target.collectionName
                            ? matchCollection(site, parsed.target.collectionName)
                            : collection;
                          const ent = col ? matchEntry(col, parsed.target.entryName) : undefined;
                          targetRoute = ent?.route;
                        } else if (parsed.target.kind === "block") {
                          const col = parsed.target.collectionName
                            ? matchCollection(site, parsed.target.collectionName)
                            : collection;
                          const ent =
                            col && parsed.target.entryName
                              ? matchEntry(col, parsed.target.entryName)
                              : col === collection
                              ? entry
                              : undefined;
                          const blockTarget = ent ? matchBlock(ent, parsed.target.blockName) : undefined;
                          targetRoute = blockTarget?.route;
                        }

                        if (targetRoute) {
                          linkNode.url = targetRoute;
                          const props = (linkNode as MdastLink & { data?: any }).data ?? {};
                          const hProps = props.hProperties ?? {};
                          const existingClass =
                            typeof hProps.className === "string"
                              ? hProps.className
                              : Array.isArray(hProps.className)
                              ? hProps.className.join(" ")
                              : undefined;
                          props.hProperties = {
                            ...hProps,
                            className: appendClassName(existingClass, "webt-md"),
                          };
                          (linkNode as MdastLink & { data?: any }).data = props;
                        } else {
                          logger?.warn("markdown.internalLink.unresolved", {
                            url: linkNode.url,
                            entry: entry.path,
                          });
                        }
                      }
                    }

                    if (isParent) {
                      for (const child of (node as Parent).children as Content[]) {
                        visit(child);
                      }
                    }
                  };

                  visit(ast);

                  // Re-render HTML from mutated AST
                  const html = await renderMarkdownToHtml(ast, remarkPlugins);
                  const meta = { ...(blk.content.meta ?? {}) };
                  return {
                    ...blk,
                    content: {
                      ...blk.content,
                      ast,
                      html,
                      meta,
                    },
                  };
                })
              );

              return { ...entry, blocks };
            })
          );

          return { ...collection, entries };
        })
      )
    : undefined;

  return {
    ...site,
    ...(collections ? { collections } : {}),
  };
}
