/**
 * Video output path helpers for the build pipeline.
 */

import * as path from "node:path";
import type { Block } from "../../model";
import { escapeExtForRegex } from "../../../utils/path";

// Build output base/public paths for video assets using slug-based route hints (mirrors audio/image handling).
export function resolveVideoOutputPaths(options: {
  block: Block;
  outputDir: string;
  publicBase: string;
  routeHint?: string;
  routeSegments?: string[];
}) {
  const { block, outputDir, publicBase, routeHint, routeSegments } = options;

  const segments = Array.isArray(routeSegments) ? routeSegments.slice() : [];
  const parentSegments =
    segments.length > 0 ? segments.slice(0, -1) : undefined;

  let stem = "";
  if (routeHint) {
    const cleaned = routeHint.replace(/^\/+|\/+$/g, "");
    stem = block.ext
      ? cleaned.replace(new RegExp(`${escapeExtForRegex(block.ext)}$`, "i"), "")
      : cleaned.replace(/\/+$/, "");
  } else {
    const raw =
      (block.route ?? block.path ?? block.rawName ?? "").toString().replace(/\\/g, "/");
    const trimmed = raw.replace(/^\/+/, "");
    stem =
      block.ext && trimmed
        ? trimmed.replace(new RegExp(`${escapeExtForRegex(block.ext)}$`, "i"), "")
        : trimmed.replace(/\/+$/, "");
  }

  const parentStem =
    parentSegments && parentSegments.length > 0 ? parentSegments.join("/") : "";

  const slug = block.slug || block.rawName;
  const baseDir = parentStem ? path.join(outputDir, parentStem) : outputDir;
  const publicStem = parentStem
    ? path.posix.join(publicBase, parentStem)
    : publicBase;

  return { baseDir, publicStem, stem, slug };
}
