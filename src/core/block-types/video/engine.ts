/**
 * Video block engine (copy-only in core).
 */

import { copyFile, mkdir, stat } from "node:fs/promises";
import * as path from "node:path";
import type { Block } from "../../model";
import type { Logger } from "../../../logging/logger";
import type { VideoPipelineConfig } from "./config";
import { resolveVideoOutputPaths } from "./paths";
import { normalizeLeadingSlash } from "../../../utils/path";

export async function copyVideoAsset(options: {
  block: Block;
  filePath: string;
  config: VideoPipelineConfig;
  logger?: Logger;
  routeHint?: string;
  routeSegments?: string[];
}): Promise<{ route: string; size: number } | undefined> {
  const { block, filePath, config, logger, routeHint, routeSegments } = options;

  try {
    const { baseDir, publicStem, slug } = resolveVideoOutputPaths({
      block,
      outputDir: config.outputDir,
      publicBase: config.publicBase,
      routeHint,
      routeSegments,
    });
    await mkdir(baseDir, { recursive: true });
    const ext = block.ext ?? "";
    const fileName = `${slug}${ext}`;
    const outputPath = path.join(baseDir, fileName);
    await copyFile(filePath, outputPath);
    const copied = await stat(outputPath);
    const route = normalizeLeadingSlash(path.posix.join(publicStem, fileName));
    return { route, size: copied.size };
  } catch (err) {
    logger?.warn("resolve.video.copyFailed", {
      blockId: block.id,
      path: block.path,
      error: String(err),
    });
    return undefined;
  }
}
