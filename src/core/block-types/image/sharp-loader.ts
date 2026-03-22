/**
 * Shared Sharp module loader with single-instance cache.
 *
 * Used by both image/engine.ts and build/utils/icons.ts to avoid
 * loading Sharp twice and to share the availability check.
 */

import type { Logger } from "../../../logging/logger";

type SharpModule = typeof import("sharp");
let cachedSharp: SharpModule | null | undefined;

export type { SharpModule };

export async function loadSharp(logger?: Logger): Promise<SharpModule | null> {
  if (cachedSharp !== undefined) return cachedSharp;
  try {
    const mod = await import("sharp");
    cachedSharp = mod.default ?? (mod as SharpModule);
    return cachedSharp;
  } catch (err) {
    logger?.warn("resolve.image.sharpMissing", { error: String(err) });
    cachedSharp = null;
    return cachedSharp;
  }
}
