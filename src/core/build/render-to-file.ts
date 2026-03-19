/**
 * Shared primitive for the render→mkdir→formatHtml→writeIfChanged pipeline.
 *
 * Every page output (entry, index, 404, synthetic/plugin) funnels through this
 * single function so the FS orchestration logic lives in one place.
 */

import { mkdir } from "node:fs/promises";
import * as path from "node:path";

export type TemplateRenderer = {
  render: (context: Record<string, unknown>) => string;
};

export const DEFAULT_PAGE_FILENAME = "index.html";

export async function renderToFile(opts: {
  templateRenderer: TemplateRenderer;
  context: Record<string, unknown>;
  targetDir: string;
  fileName?: string;
  formatHtml: (rawHtml: string, targetPath: string) => Promise<string>;
  writeIfChanged: (targetPath: string, content: string) => Promise<boolean>;
}): Promise<boolean> {
  const fileName = opts.fileName ?? DEFAULT_PAGE_FILENAME;
  const html = opts.templateRenderer.render(opts.context);
  await mkdir(opts.targetDir, { recursive: true });
  const filePath = path.join(opts.targetDir, fileName);
  const finalHtml = await opts.formatHtml(html, filePath);
  return opts.writeIfChanged(filePath, finalHtml);
}
