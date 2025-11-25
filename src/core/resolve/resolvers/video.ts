import { stat } from "node:fs/promises";
import * as path from "node:path";
import type { Resolver } from "../registry";

const mimeByExt: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".m4v": "video/x-m4v",
  ".mkv": "video/x-matroska",
  ".avi": "video/x-msvideo",
};

// Resolve video blocks: only store lightweight metadata
export const resolveVideo: Resolver = async (block, ctx) => {
  if (ctx.readContent === false) return undefined;

  const filePath = path.join(ctx.rootDir, block.path);
  const stats = await stat(filePath);
  const ext = block.ext?.toLowerCase() ?? "";
  const mime = mimeByExt[ext];

  return {
    meta: {
      size: stats.size,
      ...(mime ? { mime } : {}),
    },
  };
};
