import { stat } from "node:fs/promises";
import * as path from "node:path";
import type { Resolver } from "../registry";
import imageSize from "image-size";
import { collectImageMeta, mimeByExt } from "../../block-types/image/meta";
import { copyOriginalAsset, generateImageVariants } from "../../block-types/image/engine";

// Resolve image blocks: record metadata, optionally copy originals, and generate variants.
export const resolveImage: Resolver = async (block, ctx) => {
  if (ctx.readContent === false) return undefined;

  const filePath = path.join(ctx.rootDir, block.path);
  const stats = await stat(filePath);
  const ext = block.ext?.toLowerCase() ?? "";
  const mime = mimeByExt[ext];

  let dimensions: { width?: number; height?: number } = {};
  try {
    const size = imageSize(filePath);
    dimensions = collectImageMeta(size);
  } catch (err) {
    ctx.logger?.warn("resolve.image.dimensionsFailed", {
      blockId: block.id,
      path: block.path,
      error: String(err),
    });
  }

  const meta = {
    size: stats.size,
    ...(mime ? { mime } : {}),
    ...(dimensions.width ? { width: dimensions.width } : {}),
    ...(dimensions.height ? { height: dimensions.height } : {}),
  };

  // If the image engine is disabled, still copy the original to the public assets path.
  if (!ctx.imageConfig?.requiresImageEngine) {
    const copied = await copyOriginalAsset({
      block,
      filePath,
      config: ctx.imageConfig,
      logger: ctx.logger,
      routeHint: ctx.routeHint,
      routeSegments: ctx.routeSegments,
    });
    const blockRoute = copied?.route;
    return { meta, ...(blockRoute ? { blockRoute } : {}) };
  }

  const variants = await generateImageVariants({
    block,
    filePath,
    dimensions,
    stats,
    config: ctx.imageConfig,
    logger: ctx.logger,
    routeHint: ctx.routeHint,
    routeSegments: ctx.routeSegments,
  });

  const blockRoute = variants[0]?.route;

  return { meta, variants, ...(blockRoute ? { blockRoute } : {}) };
};
