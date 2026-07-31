/**
 * Audio block engine (copy + optional metadata).
 */

import { copyFile, mkdir, stat } from "node:fs/promises";
import * as path from "node:path";
import type { Block } from "../../model";
import type { Logger } from "../../../logging/logger";
import type { AudioPipelineConfig } from "./config";
import { resolveAudioOutputPaths } from "./paths";
import { normalizeLeadingSlash } from "../../../utils/path";
import { createSingleFlightCache } from "../../../utils/single-flight";

// Single-flight per destination: concurrent resolutions of the same source
// (entry + cross-entry reference) must not copy to the same output in parallel.
const copiesCache = createSingleFlightCache<{ route: string; size: number } | undefined>();

export function clearAudioAssetCache(): void {
  copiesCache.clear();
}

export async function copyAudioAsset(options: {
  block: Block;
  filePath: string;
  config: AudioPipelineConfig;
  logger?: Logger;
  routeHint?: string;
  routeSegments?: string[];
}): Promise<{ route: string; size: number } | undefined> {
  const { block, filePath, config, routeHint, routeSegments } = options;
  const { baseDir, slug } = resolveAudioOutputPaths({
    block,
    outputDir: config.outputDir,
    publicBase: config.publicBase,
    routeHint,
    routeSegments,
  });
  const cacheKey = path.join(baseDir, `${slug}${block.ext ?? ""}`);

  let stamp: string;
  try {
    const source = await stat(filePath);
    stamp = `${source.mtimeMs}|${source.size}`;
  } catch {
    return copyAudioAssetUncached(options);
  }

  return copiesCache.run(cacheKey, stamp, () => copyAudioAssetUncached(options));
}

async function copyAudioAssetUncached(options: {
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
    await mkdir(baseDir, { recursive: true });
    const ext = block.ext ?? "";
    const fileName = `${slug}${ext}`;
    const outputPath = path.join(baseDir, fileName);
    await copyFile(filePath, outputPath);
    const copied = await stat(outputPath);
    const route = normalizeLeadingSlash(path.posix.join(publicStem, fileName));
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
