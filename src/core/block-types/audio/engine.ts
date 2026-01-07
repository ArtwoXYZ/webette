/**
 * Audio block engine (copy + optional metadata).
 */

import { copyFile, mkdir, stat } from "node:fs/promises";
import * as path from "node:path";
import type { Block } from "../../model";
import type { Logger } from "../../../logging/logger";
import type { AudioPipelineConfig } from "./config";
import { resolveAudioOutputPaths } from "./paths";

const ensureLeadingSlash = (route: string): string =>
  route.startsWith("/") ? route : `/${route}`;

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

// Copy the original audio file to the public assets path and return its route + size.
export async function copyAudioAsset(options: {
  block: Block;
  filePath: string;
  config: AudioPipelineConfig;
  logger?: Logger;
  routeHint?: string;
  routeSegments?: string[];
}): Promise<{ route: string; size: number } | undefined> {
  const { block, filePath, config, logger, routeHint, routeSegments } = options;

  try {
    const { baseDir, publicStem, slug } = resolveAudioOutputPaths({
      block,
      outputDir: config.outputDir,
      publicBase: config.publicBase,
      routeHint,
      routeSegments,
    });
    await ensureDir(baseDir);
    const ext = block.ext ?? "";
    const fileName = `${slug}${ext}`;
    const outputPath = path.join(baseDir, fileName);
    await copyFile(filePath, outputPath);
    const copied = await stat(outputPath);
    const route = ensureLeadingSlash(path.posix.join(publicStem, fileName));
    return { route, size: copied.size };
  } catch (err) {
    logger?.warn("resolve.audio.copyFailed", {
      blockId: block.id,
      path: block.path,
      error: String(err),
    });
    return undefined;
  }
}
