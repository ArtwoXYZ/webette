/**
 * Rewrites Markdown internal links (`collection:` / `entry:` / `block:`) to resolved routes.
 */

import type { Root, Content, Parent, Link as MdastLink } from "mdast";
import { renderMarkdownToHtml } from "../block-types/markdown/processor";
import type { Logger } from "../../logging/logger";
import type { Site, Entry, Collection } from "../model";
import { SiteModelTransformer } from "../site-model-transformer";
import {
  isRootCollectionName,
  parseInternalReference,
  matchCollection,
  matchEntry,
  matchBlock,
  matchRootEntry,
} from "../targets";
import { parseBoolean, normalizeClassList } from "../../utils/parse";

export async function rewriteInternalLinks(options: {
  site: Site;
  remarkPlugins?: unknown[];
  logger?: Logger;
}): Promise<Site> {
  const { site, remarkPlugins, logger } = options;

  const rewriteEntryBlocks = async (
    entry: Entry,
    collection?: Collection
  ): Promise<Entry> => {
    const blocks = await Promise.all(
      entry.blocks.map(async (blk) => {
        if (blk.type !== "markdown" || !blk.content?.ast) return blk;
        const ast = blk.content.ast as Root;

        const normalizeString = (value: unknown): string =>
          typeof value === "string" ? value.trim() : "";

        const applyLinkOptions = (
          node: MdastLink,
          opts: Record<string, string>,
          rootEntryPath: string,
          options?: { markAsCustomExternal?: boolean }
        ) => {
          const markAsCustomExternal = options?.markAsCustomExternal === true;
          const data = (node as MdastLink & { data?: any }).data ?? {};
          const hProps = (data.hProperties ?? {}) as Record<string, unknown>;

          const next: Record<string, unknown> = { ...hProps };

          // class / className
          const existingClasses = normalizeClassList(hProps.className);
          const optionClasses = normalizeString(opts.class || opts.classname);
          const mergedClasses = new Set<string>([
            ...existingClasses,
            ...normalizeClassList(optionClasses),
            "webt-md",
          ]);
          next.className = Array.from(mergedClasses).join(" ");

          const id = normalizeString(opts.id);
          if (id) next.id = id;

          const title = normalizeString(opts.title);
          if (title) next.title = title;

          const hreflang = normalizeString(opts.hreflang);
          if (hreflang) next.hreflang = hreflang;

          const referrerpolicy = normalizeString(opts.referrerpolicy);
          if (referrerpolicy) next.referrerpolicy = referrerpolicy;

          const role = normalizeString(opts.role);
          if (role) next.role = role;

          const tabIndex = normalizeString(opts.tabindex);
          if (tabIndex) next.tabindex = tabIndex;

          const targetFromOption = normalizeString(opts.target);
          const targetFromExisting = normalizeString(next.target);
          const target =
            targetFromOption || targetFromExisting || (markAsCustomExternal ? "_blank" : "");
          if (target) next.target = target;

          // rel
          const relFromExisting = normalizeClassList(hProps.rel);
          const relFromOption = normalizeClassList(normalizeString(opts.rel));
          const relMerged = new Set<string>([...relFromExisting, ...relFromOption]);
          if (target === "_blank") {
            relMerged.add("noopener");
            relMerged.add("noreferrer");
          }
          if (relMerged.size) {
            next.rel = Array.from(relMerged);
          }

          // download (boolean-like or filename)
          const downloadRaw = normalizeString(opts.download);
          if (downloadRaw) {
            const bool = parseBoolean(downloadRaw);
            if (bool === true) next.download = true;
            else if (bool === false) {
              // explicit false => ignore
            } else {
              next.download = downloadRaw;
            }
          }

          // aria-label (plus common aliases)
          const ariaLabel =
            normalizeString(opts["aria-label"]) ||
            normalizeString((opts as any).arialabel);
          if (ariaLabel) next["aria-label"] = ariaLabel;

          // Allow passthrough for data-* and aria-* attributes.
          for (const [key, value] of Object.entries(opts)) {
            if (!key || !value) continue;
            if (key === "class" || key === "classname") continue;
            if (key === "id" || key === "title") continue;
            if (key === "target" || key === "rel" || key === "download") continue;
            if (key === "hreflang" || key === "referrerpolicy") continue;
            if (key === "role" || key === "tabindex") continue;
            if (key === "aria-label" || key === "arialabel") continue;
            if (key.startsWith("data-") || key.startsWith("aria-")) {
              next[key] = value;
            }
          }

          if (markAsCustomExternal) {
            next["data-webt-md-custom"] = "1";
          }

          data.hProperties = next;
          (node as MdastLink & { data?: any }).data = data;

          // If target wasn't resolved (no internal route), don't apply options.
          // Also warn once for obviously invalid user keys? Keep silent for now.
          void rootEntryPath;
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
                  ? matchRootEntry(site, parsed.target.entryName)
                  : col
                    ? matchEntry(col, parsed.target.entryName)
                    : explicitCollection
                      ? undefined
                      : matchRootEntry(site, parsed.target.entryName);
                targetRoute = ent?.route;
                if (targetRoute && parsed.anchor) {
                  targetRoute = `${targetRoute.replace(/#.*$/, "")}#${parsed.anchor}`;
                }
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
                    ? matchRootEntry(site, parsed.target.entryName)
                    : col && parsed.target.entryName
                    ? matchEntry(col, parsed.target.entryName)
                    : !explicitCollection && !col && parsed.target.entryName
                      ? matchRootEntry(site, parsed.target.entryName)
                    : col === collection
                      ? entry
                      : undefined;
                const blockTarget = ent ? matchBlock(ent, parsed.target.blockName) : undefined;
                targetRoute = blockTarget?.route;
              } else if (parsed.target.kind === "url") {
                targetRoute = parsed.target.url;
              }

              if (targetRoute) {
                linkNode.url = targetRoute;
                applyLinkOptions(linkNode, parsed.options ?? {}, entry.path, {
                  markAsCustomExternal: parsed.target.kind === "url",
                });
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

  // Use SiteModelTransformer to ensure all properties are preserved during transformation
  return SiteModelTransformer.fromPartialUpdate(site, {
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
  }).build();
}
