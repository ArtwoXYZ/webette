/**
 * Shared filesystem helpers used across webette.
 *
 * Small, focused utilities for writing/copying files and cleaning directories.
 */

import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import * as path from "node:path";
import type { Logger } from "../logging/logger";

/**
 * Writes UTF-8 content to `targetPath` only when the bytes differ.
 * Returns `true` if the file changed, `false` if it was already identical.
 */
export async function writeIfChanged(
  targetPath: string,
  content: string,
  logger?: Logger
): Promise<boolean> {
  const nextBuffer = Buffer.from(content, "utf8");
  let current: Buffer | null = null;
  try {
    current = await readFile(targetPath);
  } catch {
    // file missing or unreadable -> treat as different
  }
  if (current && Buffer.compare(current, nextBuffer) === 0) {
    logger?.debug("build.fileUnchanged", { path: targetPath });
    return false;
  }
  await writeFile(targetPath, nextBuffer, "utf8");
  logger?.debug("build.fileGenerated", { path: targetPath });
  return true;
}

/**
 * Recursively removes empty directories under `root`, excluding `root` itself.
 */
export async function removeEmptyDirectories(dir: string, root: string): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const child = path.join(dir, entry.name);
    await removeEmptyDirectories(child, root);
  }
  const after = await readdir(dir).catch(() => []);
  if (dir !== root && after.length === 0) {
    try {
      await rm(dir, { force: true, recursive: true });
    } catch {
      // ignore
    }
  }
}

/**
 * Recursively copies `sourceDir` into `targetDir`, creating directories as needed.
 */
export async function copyDirectory(sourceDir: string, targetDir: string): Promise<void> {
  const entries = await readdir(sourceDir, { withFileTypes: true }).catch(() => []);
  await mkdir(targetDir, { recursive: true });
  for (const entry of entries) {
    const srcPath = path.join(sourceDir, entry.name);
    const dstPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      await copyDirectory(srcPath, dstPath);
    } else if (entry.isFile()) {
      await copyFile(srcPath, dstPath);
    }
  }
}
