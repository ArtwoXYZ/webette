/**
 * Fresh ESM module loader for files that must reflect disk changes in a long-lived process.
 *
 * Bun currently caches ESM modules by path and ignores URL query/hash. This helper
 * loads a module via `Bun.build()` (in-memory) and imports the resulting bundle as
 * a `data:` URL, while caching by file mtime/size to avoid rebuilding unnecessarily.
 */

import { stat } from "node:fs/promises";
import * as path from "node:path";

type CachedModule = {
  mtimeMs: number;
  size: number;
  exports: any;
};

const moduleCache = new Map<string, CachedModule>();

function toDataUrl(js: string): string {
  const base64 = Buffer.from(js, "utf8").toString("base64");
  return `data:text/javascript;base64,${base64}`;
}

export async function loadDefaultExportFresh<T = unknown>(
  filePath: string
): Promise<T> {
  const absPath = path.resolve(filePath);

  const s = await stat(absPath);
  const key = path.normalize(absPath);
  const cached = moduleCache.get(key);
  if (cached && cached.mtimeMs === s.mtimeMs && cached.size === s.size) {
    return cached.exports as T;
  }

  // Note: Bun's TS types for `Bun.build()` vary by version; keep this config runtime-safe.
  const result = await Bun.build({
    entrypoints: [absPath],
    format: "esm",
    target: "bun",
    splitting: false,
    sourcemap: "none",
    minify: false,
    write: false,
    throw: false,
  });

  if (!result.success || !result.outputs?.length) {
    const details =
      result.logs?.length
        ? result.logs.map((l) => l.message).join("\n")
        : "unknown build error";
    throw new Error(`Failed to load module ${absPath}: ${details}`);
  }

  const first = result.outputs[0];
  if (!first) {
    throw new Error(`Failed to load module ${absPath}: build produced no output`);
  }

  const js = await first.text();
  const mod = await import(toDataUrl(js));
  const exportsValue = (mod as any)?.default ?? mod;

  moduleCache.set(key, { mtimeMs: s.mtimeMs, size: s.size, exports: exportsValue });
  return exportsValue as T;
}
