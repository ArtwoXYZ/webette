/**
 * Sitemap generation (`sitemap.xml`) from the exported model.
 */

import * as path from "node:path";
import type { Logger } from "../logging/logger";
import { writeIfChanged } from "../utils/fs";
import type { Site } from "./model";

type SitemapUrl = {
  loc: string;
  lastmod?: string;
  source: "entry" | "collection" | "root";
};

export async function writeSitemap(options: {
  outputDir: string;
  site: Site;
  generateIndex: boolean;
  includeDrafts: boolean;
  logger: Logger;
}): Promise<void> {
  const { outputDir, site: siteModel, generateIndex, includeDrafts, logger } = options;
  const urls = new Map<string, SitemapUrl>();

  const buildLoc = (route: string | undefined) => {
    const normalized = (route ?? "/").replace(/\/{2,}/g, "/") || "/";
    const absoluteBase = (siteModel.site as any)?.url;
    if (absoluteBase && typeof absoluteBase === "string") {
      try {
        const loc = new URL(normalized.replace(/^\//, ""), absoluteBase).toString();
        return loc;
      } catch {
        // fall through to relative
      }
    }
    return normalized;
  };

  const addUrl = (route: string | undefined, lastmod: string | undefined, source: SitemapUrl["source"]) => {
    if (!route && source !== "root") return;
    const loc = buildLoc(route);
    if (!loc) return;
    const prev = urls.get(loc);
    if (!prev) {
      urls.set(loc, { loc, lastmod, source });
    } else if (!prev.lastmod && lastmod) {
      urls.set(loc, { ...prev, lastmod });
    }
  };

  if (generateIndex) {
    addUrl("/", siteModel.updatedAt ?? siteModel.createdAt, "root");
    for (const collection of siteModel.collections ?? []) {
      if (collection.isUnlisted) continue;
      const colLastmod = collection.updatedAt ?? collection.createdAt;
      addUrl(collection.route ?? `/${collection.slug || collection.id}`, colLastmod, "collection");
    }
  }

  for (const collection of siteModel.collections ?? []) {
    if (collection.isUnlisted) continue;
    for (const entry of collection.entries) {
      if (!includeDrafts && entry.isDraft) continue;
      if (entry.isUnlisted) continue;
      const lastmod = entry.updatedAt ?? entry.createdAt;
      addUrl(entry.route, lastmod, "entry");
    }
  }

  const encode = (val: string) =>
    val.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
  for (const { loc, lastmod } of urls.values()) {
    lines.push("  <url>");
    lines.push(`    <loc>${encode(loc)}</loc>`);
    if (lastmod) {
      lines.push(`    <lastmod>${encode(lastmod)}</lastmod>`);
    }
    lines.push("  </url>");
  }
  lines.push("</urlset>", "");

  const sitemapPath = path.join(outputDir, "sitemap.xml");
  const wrote = await writeIfChanged(sitemapPath, lines.join("\n"), logger);
  const logFn = wrote ? logger.info.bind(logger) : logger.debug.bind(logger);
  logFn("build.sitemap", {
    path: sitemapPath,
    count: urls.size,
    includeDrafts,
    absolute: !!(siteModel.site as any)?.url,
  });
}
