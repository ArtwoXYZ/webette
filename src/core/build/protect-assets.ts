/**
 * Writes placeholder `index.html` files to prevent public directory listing.
 */

import { mkdir } from "node:fs/promises";
import * as path from "node:path";

export async function protectAssetDirs(options: {
  outputDir: string;
  protectAssets: boolean;
  dirsToCover: Set<string>;
  siteTitle: unknown;
  siteLang?: unknown;
  assetsBase?: string;
  accessForbiddenLayoutName: string;
  templateRenderer: { render: (ctx: any) => string };
  formatHtml: (rawHtml: string, targetPath: string) => Promise<string>;
  writeIfChanged: (targetPath: string, content: string) => Promise<boolean>;
}): Promise<void> {
  const {
    outputDir,
    protectAssets,
    dirsToCover,
    siteTitle,
    siteLang,
    assetsBase,
    accessForbiddenLayoutName,
    templateRenderer,
    formatHtml,
    writeIfChanged,
  } = options;

  if (!protectAssets) return;

  const title = typeof siteTitle === "string" ? siteTitle : String(siteTitle ?? "");
  const lang = typeof siteLang === "string" ? siteLang : undefined;
  const normalizedAssetsBase =
    typeof assetsBase === "string" && assetsBase.trim() ? assetsBase.trim() : undefined;

  // Render once with a fully stable context so protect files stop rewriting.
  const forbiddenContext = {
    site: { title, lang },
    layoutName: accessForbiddenLayoutName,
    entry: { name: "Access forbidden", route: "/" },
    liveReloadScript: "",
    ...(normalizedAssetsBase ? { templates: { assetsBase: normalizedAssetsBase } } : {}),
  };
  const forbiddenHtml = await formatHtml(
    templateRenderer.render(forbiddenContext),
    path.join(outputDir, "_forbidden_index.html")
  );

  for (const dirPath of Array.from(dirsToCover)) {
    await mkdir(dirPath, { recursive: true });
    await writeIfChanged(path.join(dirPath, "index.html"), forbiddenHtml);
  }
}
