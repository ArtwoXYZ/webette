import { stat } from "node:fs/promises";
import * as path from "node:path";
import type { Resolver } from "../registry";

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

  return {
    meta: {
      size: stats.size,
      ...(mime ? { mime } : {}),
    },
  };
};
