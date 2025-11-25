import { stat } from "node:fs/promises";
import * as path from "node:path";
import type { Resolver } from "../registry";

const mimeByExt: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".flac": "audio/flac",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
};

// Resolve audio blocks: only store lightweight metadata
export const resolveAudio: Resolver = async (block, ctx) => {
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
