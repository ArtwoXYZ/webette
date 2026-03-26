/**
 * Reads plain-text file content verbatim (no processing).
 */

import { readFile } from "node:fs/promises";
import * as path from "node:path";
import type { Resolver } from "../registry";

export const resolveText: Resolver = async (block, ctx) => {
  if (ctx.readContent === false) return undefined;

  const filePath = path.join(ctx.rootDir, block.path);
  const raw = await readFile(filePath, "utf8");

  return { raw };
};
