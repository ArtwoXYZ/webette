/**
 * Image block engine (copy + optional variants via sharp).
 */

import { copyFile, mkdir, stat } from "node:fs/promises";
import * as path from "node:path";
import type { Stats } from "node:fs";
import type { Block, ImageVariant } from "../../model";
import type { Logger } from "../../../logging/logger";
import {
  buildVariantFileName,
  formatToExtension,
  resolveOutputPaths,
  stripDot,
} from "./paths";
import type { ImagePipelineConfig, GeneratedVariantName } from "./config";
import { generatedVariants } from "./config";

import { ensureLeadingSlash } from "../../../utils/path";
import { loadSharp } from "./sharp-loader";

export async function generateImageVariants(options: {
  block: Block;
  filePath: string;
  dimensions: { width?: number; height?: number };
  stats: Stats;
  config: ImagePipelineConfig;
  logger?: Logger;
  routeHint?: string;
  routeSegments?: string[];
}): Promise<ImageVariant[]> {
  const { block, filePath, dimensions, stats, config, logger, routeHint, routeSegments } =
    options;

  // Lazy load sharp; if absent we still return aliases so templates remain stable.
  const sharpModule = await loadSharp(logger);
  const { baseDir, publicStem, slug } = resolveOutputPaths({
    block,
    outputDir: config.outputDir,
    publicBase: config.publicBase,
    routeHint,
    routeSegments,
  });
  await mkdir(baseDir, { recursive: true });

  const originalExt = stripDot(block.ext?.toLowerCase()) ?? formatToExtension(config.format);
  const defaultExt =
    config.reencodeDefault && sharpModule
      ? formatToExtension(config.format)
      : originalExt;
  const defaultFileName = buildVariantFileName(slug, "default", defaultExt);
  const defaultOutputPath = path.join(baseDir, defaultFileName);
  const defaultRoute = ensureLeadingSlash(path.posix.join(publicStem, defaultFileName));

  const variants: ImageVariant[] = [];

  try {
    if (config.reencodeDefault && sharpModule) {
      const info = await sharpModule(filePath)
        .toFormat(config.format, { quality: config.quality })
        .toFile(defaultOutputPath);

      variants.push({
        name: "default",
        route: defaultRoute,
        width: info.width ?? dimensions.width,
        height: info.height ?? dimensions.height,
        format: info.format,
        size: info.size,
      });
    } else {
      await copyFile(filePath, defaultOutputPath);
      const copied = await stat(defaultOutputPath);
      variants.push({
        name: "default",
        route: defaultRoute,
        width: dimensions.width,
        height: dimensions.height,
        format: defaultExt,
        size: copied.size,
      });
      if (config.reencodeDefault && !sharpModule) {
        logger?.warn("resolve.image.defaultReencodeSkipped", {
          blockId: block.id,
          path: block.path,
          reason: "sharp-missing",
        });
      }
    }
  } catch (err) {
    logger?.warn("resolve.image.defaultFailed", {
      blockId: block.id,
      path: block.path,
      error: String(err),
    });
    return variants;
  }

  const defaultVariant = variants[0];
  if (!defaultVariant) {
    return variants;
  }

  if (!sharpModule) {
    for (const name of generatedVariants) {
      variants.push({
        name,
        route: defaultVariant.route,
        width: defaultVariant.width,
        height: defaultVariant.height,
        format: defaultVariant.format,
        size: defaultVariant.size,
        aliasOf: "default",
        reason: "sharp-missing",
      });
    }
    return variants;
  }

  // Generate small/medium/large when possible, otherwise alias to default (no upscale)
  for (const name of generatedVariants) {
    const target = config.variants[name as GeneratedVariantName];
    if (!target) continue;

    const targetExt = formatToExtension(config.format);
    const fileName = buildVariantFileName(slug, name, targetExt);
    const outputPath = path.join(baseDir, fileName);
    const route = path.posix.join(publicStem, fileName);

    const missingDimensions =
      !dimensions.width || (target.height != null && !dimensions.height);
    const sourceTooSmall =
      missingDimensions ||
      (target.width && dimensions.width && target.width > dimensions.width) ||
      (target.height && dimensions.height && target.height > dimensions.height);

    if (sourceTooSmall) {
      variants.push({
        name,
        route: defaultVariant.route,
        width: defaultVariant.width,
        height: defaultVariant.height,
        format: defaultVariant.format,
        size: defaultVariant.size,
        aliasOf: "default",
        reason: missingDimensions ? "dimensions-unknown" : "source-too-small",
      });
      continue;
    }

    try {
      const info = await sharpModule(filePath)
        .resize(target.width, target.height, { fit: config.fit })
        .toFormat(config.format, { quality: config.quality })
        .toFile(outputPath);

    variants.push({
        name,
        route: ensureLeadingSlash(route),
        width: info.width ?? target.width ?? defaultVariant.width,
        height: info.height ?? target.height ?? defaultVariant.height,
        format: info.format,
        size: info.size,
      });
    } catch (err) {
      logger?.warn("resolve.image.variantFailed", {
        blockId: block.id,
        path: block.path,
        variant: name,
        error: String(err),
      });
      variants.push({
        name,
        route: defaultVariant.route,
        width: defaultVariant.width,
        height: defaultVariant.height,
        format: defaultVariant.format,
        size: defaultVariant.size,
        aliasOf: "default",
        reason: "generation-failed",
      });
    }
  }

  return variants;
}

export async function copyOriginalAsset(options: {
  block: Block;
  filePath: string;
  config: ImagePipelineConfig;
  logger?: Logger;
  routeHint?: string;
  routeSegments?: string[];
}): Promise<{ route: string; size: number } | undefined> {
  const { block, filePath, config, logger, routeHint, routeSegments } = options;
  try {
    const { baseDir, publicStem, slug } = resolveOutputPaths({
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
    const route = ensureLeadingSlash(path.posix.join(publicStem, fileName));
    return { route, size: copied.size };
  } catch (err) {
    logger?.warn("resolve.image.copyOriginalFailed", {
      blockId: block.id,
      path: block.path,
      error: String(err),
    });
    return undefined;
  }
}
