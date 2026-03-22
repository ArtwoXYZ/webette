/**
 * Image output path helpers for the build pipeline.
 */

import * as path from "node:path";
import type { Block } from "../../model";
import { escapeExtForRegex } from "../../../utils/path";

export function stripDot(ext?: string | null): string | undefined {
  if (!ext) return undefined;
  return ext.startsWith(".") ? ext.slice(1) : ext;
}

export function formatToExtension(format: string): string {
  if (format === "jpeg") return "jpg";
  return format;
}

// Derive a stable stem from the block route/path without extension to group outputs
export function normalizeRouteStem(block: Block): { stem: string; slug: string } {
  const raw =
    (block.route ?? block.path ?? block.rawName ?? "").toString().replace(/\\/g, "/");
  const trimmed = raw.replace(/^\/+/, "");
  const stem =
    block.ext && trimmed
      ? trimmed.replace(new RegExp(`${escapeExtForRegex(block.ext)}$`, "i"), "")
      : trimmed.replace(/\/+$/, "");

  return {
    stem: stem || block.slug || block.rawName,
    slug: block.slug || block.rawName,
  };
}

export function buildVariantFileName(slug: string, name: string, ext: string): string {
  return `${slug}@${name}.${ext}`;
}

export function resolveOutputPaths(options: {
  block: Block;
  outputDir: string;
  publicBase: string;
  routeHint?: string;
  routeSegments?: string[];
}) {
  const { block, outputDir, publicBase, routeHint, routeSegments } = options;

  // Prefer slug-based segments; drop the block segment for the parent stem.
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
    const normalized = normalizeRouteStem(block);
    stem = normalized.stem;
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
