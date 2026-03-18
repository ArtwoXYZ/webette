/**
 * Rewrites Markdown internal images (`block:`) to final variant routes and marks inline renders.
 */

import type { Root, Content, Image as MdastImage, Html } from "mdast";
import type { Site, Block, Entry, Collection } from "../model";
import { SiteModelTransformer } from "../transformations/site-model-transformer";
import { renderMarkdownToHtml } from "../block-types/markdown/processor";
import type { Logger } from "../../logging/logger";
import {
  isRootCollectionName,
  parseInternalReference,
  matchBlock,
  matchCollection,
  matchEntry,
} from "../targets";
import {
  buildImageHtml,
  normalizeVariantName,
  type ImageBlock,
} from "../templates/image-utils";
import { parseBoolean } from "../../utils/parse";

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

const markdownClassName = "webt-md";

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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function buildExternalImageHtml(
  url: string,
  options: ReturnType<typeof pickImageOptions>
): string {
  const attrs: string[] = [];
  attrs.push(`src="${escapeHtml(url)}"`);
  attrs.push(`alt="${escapeHtml(options.alt ?? "")}"`);

  if (options.title) attrs.push(`title="${escapeHtml(options.title)}"`);
  if (options.className) attrs.push(`class="${escapeHtml(options.className)}"`);
  if (options.id) attrs.push(`id="${escapeHtml(options.id)}"`);
  if (options.loading) attrs.push(`loading="${escapeHtml(options.loading)}"`);
  if (options.decoding) attrs.push(`decoding="${escapeHtml(options.decoding)}"`);
  if (options.sizes) attrs.push(`sizes="${escapeHtml(options.sizes)}"`);

  if (options.data) {
    for (const [key, value] of Object.entries(options.data)) {
      if (!key) continue;
      attrs.push(`${escapeHtml(key)}="${escapeHtml(value)}"`);
    }
  }

  const img = `<img ${attrs.join(" ")}>`;

  if (!options.figure) return img;

  const figCaption = options.caption
    ? `<figcaption class="${markdownClassName}">${escapeHtml(options.caption)}</figcaption>`
    : "";
  return `<figure class="${escapeHtml(options.figureClass)}">${img}${figCaption}</figure>`;
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
  const matchRootEntry = (name: string): Entry | undefined => {
    const target = name.trim().toLowerCase();
    if (!target) return undefined;
    return (site.rootEntries ?? []).find((entry) => {
      const names = [entry.slug, entry.id, entry.name, entry.rawName]
        .filter(Boolean)
        .map((v) => String(v).trim().toLowerCase());
      return names.includes(target);
    });
  };

  const rewriteEntryBlocks = async (
    entry: Entry,
    collection?: Collection
  ): Promise<Entry> => {
    const inlineBlockIds = new Set<string>();
    const blocks = await Promise.all(
      entry.blocks.map(async (blk) => {
        if (blk.type !== "markdown" || !blk.content?.ast) return blk;
        const ast = blk.content.ast as Root;
        let didChange = false;

        // Keep child types stable while walking the tree.
        const transformChild = (node: Content): Content => transformNode(node) as Content;

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
                const explicitCollection = parsed.target.collectionName;
                const explicitRoot =
                  typeof explicitCollection === "string" &&
                  isRootCollectionName(explicitCollection);
                const col = explicitCollection
                  ? explicitRoot
                    ? undefined
                    : matchCollection(site, explicitCollection)
                  : collection;
                const ent = explicitRoot
                  ? matchRootEntry(parsed.target.entryName)
                  : col
                    ? matchEntry(col, parsed.target.entryName)
                    : explicitCollection
                      ? undefined
                      : matchRootEntry(parsed.target.entryName);
                targetRoute = ent?.route;
              } else if (parsed.target.kind === "block") {
                const explicitCollection = parsed.target.collectionName;
                const explicitRoot =
                  typeof explicitCollection === "string" &&
                  isRootCollectionName(explicitCollection);
                const col = explicitCollection
                  ? explicitRoot
                    ? undefined
                    : matchCollection(site, explicitCollection)
                  : collection;
                const ent =
                  explicitRoot && parsed.target.entryName
                    ? matchRootEntry(parsed.target.entryName)
                    : col && parsed.target.entryName
                    ? matchEntry(col, parsed.target.entryName)
                    : !explicitCollection && !col && parsed.target.entryName
                      ? matchRootEntry(parsed.target.entryName)
                    : col === collection
                      ? entry
                      : undefined;
                blockTarget = ent ? matchBlock(ent, parsed.target.blockName) : undefined;
                targetRoute = blockTarget?.route;
              } else if (parsed.target.kind === "url") {
                const imageOptions = pickImageOptions(parsed.options, node.alt);
                const html = buildExternalImageHtml(parsed.target.url, imageOptions);
                didChange = true;
                return { type: "html", value: html } as MdastHtml;
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
  };

  const collections = site.collections
    ? await Promise.all(
      site.collections.map(async (collection) => {
        const entries = await Promise.all(
          collection.entries.map((entry) => rewriteEntryBlocks(entry, collection))
        );
        return { ...collection, entries };
      })
    )
    : undefined;
  const rootEntries = site.rootEntries
    ? await Promise.all(site.rootEntries.map((entry) => rewriteEntryBlocks(entry)))
    : undefined;

  const rootIndex = site.indexes?.root ? await rewriteEntryBlocks(site.indexes.root) : undefined;
  const collectionIndexes = site.indexes?.collections
    ? Object.fromEntries(
      await Promise.all(
        Object.entries(site.indexes.collections).map(async ([key, entry]) => {
          const collection = site.collections?.find(
            (col) => (col.slug || col.id) === key
          );
          return [key, await rewriteEntryBlocks(entry, collection)];
        })
      )
    )
    : undefined;

  // Build the update object
  const update: Partial<Site> = {
    ...(rootEntries ? { rootEntries } : {}),
    ...(collections ? { collections } : {}),
    ...((rootIndex || collectionIndexes)
      ? {
        indexes: {
          ...(site.indexes ?? {}),
          ...(rootIndex ? { root: rootIndex } : {}),
          ...(collectionIndexes ? { collections: collectionIndexes } : {}),
        },
      }
      : {}),
  };

  // Use SiteModelTransformer to ensure all properties are preserved
  return SiteModelTransformer.fromPartialUpdate(site, update).build();
}
