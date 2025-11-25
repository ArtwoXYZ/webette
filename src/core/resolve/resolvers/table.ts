import { readFile } from "node:fs/promises";
import * as path from "node:path";
import type { Resolver } from "../registry";

// Resolve table-like files (CSV/TSV): keep raw text for now
export const resolveTable: Resolver = async (block, ctx) => {
  if (ctx.readContent === false) return undefined;

  const filePath = path.join(ctx.rootDir, block.path);
  const raw = await readFile(filePath, "utf8");

  return { raw };
};
