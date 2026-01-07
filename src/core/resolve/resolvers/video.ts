/**
 * Resolver for video blocks.
 */

import { stat } from "node:fs/promises";
import * as path from "node:path";
import type { Resolver } from "../registry";
import { copyVideoAsset } from "../../block-types/video/engine";

const mimeByExt: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".m4v": "video/x-m4v",
  ".mkv": "video/x-matroska",
  ".avi": "video/x-msvideo",
};

// Resolve video blocks: copy original to public assets and keep lightweight metadata.
export const resolveVideo: Resolver = async (block, ctx) => {
  if (ctx.readContent === false) return undefined;

  const filePath = path.join(ctx.rootDir, block.path);
  const stats = await stat(filePath);
  const ext = block.ext?.toLowerCase() ?? "";
  const mime = mimeByExt[ext];

  const videoConfig = ctx.videoConfig;
  if (!videoConfig) {
    return {
      meta: {
        size: stats.size,
        ...(mime ? { mime } : {}),
      },
    };
  }

  const copied = await copyVideoAsset({
    block,
    filePath,
    config: videoConfig,
    logger: ctx.logger,
    routeHint: ctx.routeHint,
    routeSegments: ctx.routeSegments,
  });

  const blockRoute = copied?.route;

  return {
    meta: {
      size: copied?.size ?? stats.size,
      ...(mime ? { mime } : {}),
    },
    ...(blockRoute ? { blockRoute } : {}),
  };
};
