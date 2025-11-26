import { stat } from "node:fs/promises";
import * as path from "node:path";
import type { Resolver } from "../registry";
import imageSize from "image-size";

const mimeByExt: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".apng": "image/apng",
};

// Resolve image blocks: keep it light, only record size and mime
export const resolveImage: Resolver = async (block, ctx) => {
  if (ctx.readContent === false) return undefined;

  const filePath = path.join(ctx.rootDir, block.path);
  const stats = await stat(filePath);
  const ext = block.ext?.toLowerCase() ?? "";
  const mime = mimeByExt[ext];

  let dimensions: { width?: number; height?: number } = {};
  try {
    const size = imageSize(filePath);
    dimensions = {
      width: typeof size.width === "number" ? size.width : undefined,
      height: typeof size.height === "number" ? size.height : undefined,
    };
  } catch (err) {
    ctx.logger?.warn("resolve.image.dimensionsFailed", {
      blockId: block.id,
      path: block.path,
      error: String(err),
    });
  }

  return {
    meta: {
      size: stats.size,
      ...(mime ? { mime } : {}),
      ...(dimensions.width ? { width: dimensions.width } : {}),
      ...(dimensions.height ? { height: dimensions.height } : {}),
    },
  };
};
