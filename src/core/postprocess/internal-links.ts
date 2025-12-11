// Internal link resolver for Markdown content:
// - Rewrites custom URLs (collection:/entry:/block:) to real routes based on the resolved site model.
// - Marks image blocks referenced inline (`renderedInline: true`) so templates can skip duplicate rendering.
// - Re-renders markdown HTML after URL rewrites to keep content/html/ast in sync.

import * as path from "node:path";
import type { Root } from "mdast";
import type { Collection, Entry, Site, Block } from "../model";
import { cleanName } from "../../utils/naming";
import { renderMarkdownToHtml } from "../block-types/markdown/processor";
import type { Logger } from "../../logging/logger";

type ParsedTarget =
  | { kind: "collection"; collectionName: string }
  | { kind: "entry"; collectionName?: string; entryName: string }
  | { kind: "block"; collectionName?: string; entryName?: string; blockName: string };

function decodeValue(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
}

function normalizeName(value: string): string {
  const base = path.parse(value).name;
  return cleanName(base).toLowerCase();
}

function parseTarget(rawUrl: string): ParsedTarget | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // Split by commas to allow "collection: posts, entry: my first post, block: image.jpg"
  const segments = trimmed.split(/\s*,\s*/).filter(Boolean);
  const data: Record<string, string> = {};

  for (const seg of segments) {
    const [rawKey, ...rest] = seg.split(":");
    if (!rawKey || rest.length === 0) continue;
    const key = rawKey.trim().toLowerCase();
    const value = decodeValue(rest.join(":").trim());
    if (!value) continue;
    const normalizedKey =
      key === "collection" || key === "coll"
        ? "collection"
        : key === "entry" || key === "post"
        ? "entry"
        : key === "block" || key === "image" || key === "file"
        ? "block"
        : key;
    data[normalizedKey] = value;
    // Also support shorthand when the whole URL starts with a single key
    if (
      segments.length === 1 &&
      (key === "collection" || key === "entry" || key === "post" || key === "block" || key === "image" || key === "file")
    ) {
      data[normalizedKey] = value;
    }
  }

  // If nothing parsed but the URL starts with a known prefix, handle it
  if (Object.keys(data).length === 0) {
    const lower = trimmed.toLowerCase();
    if (lower.startsWith("collection:")) {
      return { kind: "collection", collectionName: decodeValue(trimmed.slice("collection:".length).trim()) };
    }
    if (lower.startsWith("entry:") || lower.startsWith("post:")) {
      const entryName = decodeValue(trimmed.slice(trimmed.indexOf(":") + 1).trim());
      return entryName ? { kind: "entry", entryName } : null;
    }
    if (lower.startsWith("block:") || lower.startsWith("image:") || lower.startsWith("file:")) {
      const blockName = decodeValue(trimmed.slice(trimmed.indexOf(":") + 1).trim());
      return blockName ? { kind: "block", blockName } : null;
    }
    return null;
  }

  if (data.block) {
    return {
      kind: "block",
      collectionName: data.collection,
      entryName: data.entry,
      blockName: data.block,
    };
  }

  if (data.entry) {
    return {
      kind: "entry",
      collectionName: data.collection,
      entryName: data.entry,
    };
  }

  if (data.collection) {
    return { kind: "collection", collectionName: data.collection };
  }

  return null;
}

function matchCollection(site: Site, name: string): Collection | undefined {
  const target = normalizeName(name);
  return site.collections?.find((col) => {
    const names = [
      col.slug,
      col.id,
      col.name,
      normalizeName(col.rawName),
    ]
      .filter(Boolean)
      .map((n) => normalizeName(String(n)));
    return names.includes(target);
  });
}

function matchEntry(collection: Collection, name: string): Entry | undefined {
  const target = normalizeName(name);
  return collection.entries.find((entry) => {
    const names = [
      entry.slug,
      entry.id,
      entry.name,
      normalizeName(entry.rawName),
    ]
      .filter(Boolean)
      .map((n) => normalizeName(String(n)));
    return names.includes(target);
  });
}

function matchBlock(entry: Entry, name: string): Block | undefined {
  const targetBase = normalizeName(name);
  const targetWithExt = normalizeName(path.parse(name).name);
  return entry.blocks.find((blk) => {
    const names = [
      blk.slug,
      blk.id,
      blk.name,
      normalizeName(blk.rawName),
      normalizeName(path.parse(blk.rawName).name),
    ]
      .filter(Boolean)
      .map((n) => normalizeName(String(n)));
    return names.includes(targetBase) || names.includes(targetWithExt);
  });
}

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
              const inlineBlockIds = new Set<string>();
              const blocks = await Promise.all(
                entry.blocks.map(async (blk) => {
                  if (blk.type !== "markdown" || !blk.content?.ast) return blk;
                  const ast = blk.content.ast as Root;

                  const visit = (node: any) => {
                    if (!node || typeof node !== "object") return;
                    const children: any[] = Array.isArray(node.children) ? node.children : [];

                    if ((node.type === "link" || node.type === "image") && typeof node.url === "string") {
                      const parsed = parseTarget(node.url);
                      if (parsed) {
                        let targetRoute: string | undefined;

                        if (parsed.kind === "collection") {
                          const col = matchCollection(site, parsed.collectionName);
                          targetRoute = col?.route;
                        } else if (parsed.kind === "entry") {
                          const col = parsed.collectionName ? matchCollection(site, parsed.collectionName) : collection;
                          const ent = col ? matchEntry(col, parsed.entryName) : undefined;
                          targetRoute = ent?.route;
                        } else if (parsed.kind === "block") {
                          const col = parsed.collectionName ? matchCollection(site, parsed.collectionName) : collection;
                          const ent =
                            col && parsed.entryName
                              ? matchEntry(col, parsed.entryName)
                              : col === collection
                              ? entry
                              : undefined;
                          const blockTarget = ent ? matchBlock(ent, parsed.blockName) : undefined;
                          if (blockTarget?.route) {
                            targetRoute = blockTarget.route;
                            inlineBlockIds.add(blockTarget.id);
                          }
                        }

                        if (targetRoute) {
                          node.url = targetRoute;
                        } else {
                          logger?.warn("markdown.internalLink.unresolved", {
                            url: node.url,
                            entry: entry.path,
                          });
                        }
                      }
                    }

                    for (const child of children) {
                      visit(child);
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
                  } as Block;
                })
              );

              // Mark blocks referenced inline so templates can skip duplicate rendering
              const updatedBlocks = blocks.map((blk) => {
                if (!inlineBlockIds.has(blk.id)) return blk;
                const meta = {
                  ...(blk.content?.meta ?? {}),
                  renderedInline: true,
                };
                return {
                  ...blk,
                  content: { ...(blk.content ?? {}), meta },
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
