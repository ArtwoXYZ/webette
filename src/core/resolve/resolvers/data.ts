import { readFile } from "node:fs/promises";
import * as path from "node:path";
import type { Resolver } from "../registry";

// Resolve data-like blocks (JSON only for now)
export const resolveData: Resolver = async (block, ctx) => {
  if (ctx.readContent === false) return undefined;

  const filePath = path.join(ctx.rootDir, block.path);
  const source = await readFile(filePath, "utf8");
  // Keep parsing minimal for now (JSON only)
  const data = JSON.parse(source);

  return { data };
};
