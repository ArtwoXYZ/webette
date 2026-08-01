/**
 * Shared Sharp module loader with single-instance cache.
 *
 * Used by both image/engine.ts and build/utils/icons.ts to avoid
 * loading Sharp twice and to share the availability check.
 */

import type { Logger } from "../../../logging/logger";

// The callable constructor (the module namespace itself is not callable).
type SharpModule = typeof import("sharp").default;
let cachedSharp: SharpModule | null | undefined;

export type { SharpModule };

export async function loadSharp(logger?: Logger): Promise<SharpModule | null> {
  if (cachedSharp !== undefined) return cachedSharp;
  try {
    const mod = await import("sharp");
    cachedSharp = mod.default;
    return cachedSharp;
  } catch (err) {
    logger?.warn("resolve.image.sharpMissing", { error: String(err) });
    cachedSharp = null;
    return cachedSharp;
  }
}
