/**
 * Utilities for diffed writes, retried deletes, and recursive directory operations.
 */

import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import * as path from "node:path";
import type { Logger } from "../logging/logger";

const retryableRmCodes = new Set(["EBUSY", "EPERM", "ENOTEMPTY"]);

const isRetryableRmError = (err: unknown): boolean => {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: unknown }).code;
  return typeof code === "string" && retryableRmCodes.has(code);
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function rmWithRetries(
  targetPath: string,
  options?: Parameters<typeof rm>[1],
  retries = 5,
  delayMs = 50
): Promise<void> {
  let attempt = 0;
  while (true) {
    try {
      await rm(targetPath, options);
      return;
    } catch (err) {
      if (attempt >= retries || !isRetryableRmError(err)) {
        throw err;
      }
      const wait = delayMs * Math.pow(2, attempt);
      await sleep(wait);
      attempt += 1;
    }
  }
}

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
      await rmWithRetries(dir, { force: true, recursive: true });
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
