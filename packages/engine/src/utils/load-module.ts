/**
 * Fresh ESM module loader for files that must reflect disk changes in a long-lived process.
 *
 * Bun currently caches ESM modules by path and ignores URL query/hash. This helper
 * loads a module via `Bun.build()` (in-memory) and imports the resulting bundle as
 * a `data:` URL, while caching by file mtime/size to avoid rebuilding unnecessarily.
 */

import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

type CachedModule = {
  mtimeMs: number;
  size: number;
  exports: any;
  outputPath?: string;
};

const moduleCache = new Map<string, CachedModule>();

const cacheRoot = path.join(tmpdir(), "webette-module-cache");

function buildCachePath(absPath: string, stamp: string): string {
  const hash = createHash("sha1").update(absPath).digest("hex").slice(0, 12);
  const baseName = path.parse(absPath).name || "module";
  return path.join(cacheRoot, hash, `${baseName}.${stamp}.mjs`);
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
  if (cached?.outputPath) {
    await rm(cached.outputPath, { force: true }).catch(() => undefined);
  }

  // Note: Bun's TS types for `Bun.build()` vary by version; keep this config runtime-safe.
  const result = await Bun.build({
    entrypoints: [absPath],
    format: "esm",
    target: "bun",
    splitting: false,
    sourcemap: "none",
    minify: false,
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
  const stamp = `${s.mtimeMs}-${s.size}`;
  const outputPath = buildCachePath(absPath, stamp);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, js, "utf8");
  const mod = await import(pathToFileURL(outputPath).href);
  const exportsValue = (mod as any)?.default ?? mod;

  moduleCache.set(key, {
    mtimeMs: s.mtimeMs,
    size: s.size,
    exports: exportsValue,
    outputPath,
  });
  return exportsValue as T;
}
