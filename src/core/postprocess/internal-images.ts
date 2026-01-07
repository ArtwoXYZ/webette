/**
 * Rewrites Markdown internal images (`block:`) to final variant routes and marks inline renders.
 */

import type { Root, Content, Image as MdastImage, Html } from "mdast";
import type { Site, Block } from "../model";
import { renderMarkdownToHtml } from "../block-types/markdown/processor";
import type { Logger } from "../../logging/logger";
import {
  parseInternalReference,
  matchBlock,
  matchCollection,
  matchEntry,
} from "./internal-targets";
import {
  buildImageHtml,
  normalizeVariantName,
  type ImageBlock,
} from "../templates/image-utils";

type ImageOptions = {
  variant?: string;
  alt?: string;
  title?: string;
  class?: string;
  id?: string;
  loading?: string;
  decoding?: string;
  sizes?: string;
  figure?: string;
  caption?: string;
  figureclass?: string;
  figureClass?: string;
};

type MdastNode = Root | Content;
type MdastHtml = Html;
type ParentNode = MdastNode & { children: Content[] };

const truthy = new Set(["true", "1", "yes", "on"]);
const falsy = new Set(["false", "0", "no", "off"]);
const markdownClassName = "webt-md";

// Parse string flags like "true"/"false" into booleans for markdown options.
function parseBoolean(raw: string | undefined): boolean | undefined {
  if (!raw) return undefined;
  const val = raw.trim().toLowerCase();
  if (truthy.has(val)) return true;
  if (falsy.has(val)) return false;
  return undefined;
}

// Convert parsed options into the shared image render options.
function appendClassName(value: string | undefined, className: string): string {
  const base = value?.trim();
  if (!base) return className;
  const parts = base.split(/\s+/);
  return parts.includes(className) ? base : `${base} ${className}`;
}

function pickImageOptions(
  options: Record<string, string>,
  altFromNode: string | null | undefined
) {
  const opts = options as ImageOptions;
  const data: Record<string, string> = {};

  for (const [key, value] of Object.entries(options)) {
    if (key.startsWith("data-")) {
      data[key] = value;
    }
  }

  const figureRaw = parseBoolean(opts.figure);

  return {
    variant: normalizeVariantName(opts.variant),
    alt: opts.alt ?? altFromNode ?? undefined,
    title: opts.title,
    className: appendClassName(opts.class, markdownClassName),
    id: opts.id,
    loading: opts.loading as "lazy" | "eager" | "auto" | undefined,
    decoding: opts.decoding as "async" | "sync" | "auto" | undefined,
    sizes: opts.sizes,
    figure: figureRaw,
    caption: opts.caption,
    figureClass: appendClassName(opts.figureClass ?? opts.figureclass, markdownClassName),
    data: Object.keys(data).length ? data : undefined,
  };
}

function isParent(node: MdastNode): node is ParentNode {
  return Array.isArray((node as ParentNode).children);
}

function isImageNode(node: MdastNode): node is MdastImage {
  return node.type === "image";
}

function isImageBlock(block: Block | undefined): block is ImageBlock {
  return block?.type === "image";
}

export async function rewriteInternalImages(options: {
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
              const inlineBlockIds = new Set<string>();
              const blocks = await Promise.all(
                entry.blocks.map(async (blk) => {
                  if (blk.type !== "markdown" || !blk.content?.ast) return blk;
                  const ast = blk.content.ast as Root;
                  let didChange = false;

                  // Keep child types stable while walking the tree.
                  const transformChild = (node: Content): Content =>
                    transformNode(node) as Content;

                  const transformNode = (node: MdastNode): MdastNode => {
                    if (!node || typeof node !== "object") return node;

                    if (isImageNode(node)) {
                      const url = node.url;
                      const parsed = parseInternalReference(url);
                      if (parsed?.target) {
                        let targetRoute: string | undefined;
                        let blockTarget: Block | undefined;

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
                          blockTarget = ent ? matchBlock(ent, parsed.target.blockName) : undefined;
                          targetRoute = blockTarget?.route;
                        }

                        if (isImageNode(node) && isImageBlock(blockTarget) && targetRoute) {
                          const imageOptions = pickImageOptions(parsed.options, node.alt);
                          const html = buildImageHtml(blockTarget, {
                            ...imageOptions,
                            site,
                          });
                          if (html) {
                            didChange = true;
                            inlineBlockIds.add(blockTarget.id);
                            return { type: "html", value: html } as MdastHtml;
                          }
                        }

                        if (targetRoute) {
                          node.url = targetRoute;
                          didChange = true;
                          if (isImageBlock(blockTarget)) {
                            inlineBlockIds.add(blockTarget.id);
                          }
                        } else {
                          logger?.warn("markdown.internalImage.unresolved", {
                            url,
                            entry: entry.path,
                          });
                        }
                      }
                    }

                    if (isParent(node)) {
                      node.children = node.children.map(transformChild);
                    }

                    return node;
                  };

                  transformNode(ast);

                  if (!didChange) return blk;

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

              const updatedBlocks = blocks.map((block) => {
                if (!inlineBlockIds.has(block.id)) return block;
                const meta = {
                  ...(block.content?.meta ?? {}),
                  renderedInline: true,
                };
                return {
                  ...block,
                  content: { ...(block.content ?? {}), meta },
                };
              });

              return { ...entry, blocks: updatedBlocks };
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
