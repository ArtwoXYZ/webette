/**
 * Image pipeline config resolution (tool defaults + site overrides).
 */

import * as path from "node:path";
import type { Site } from "../../model";
import type { ImageFit, ImageFormat, WebetteEnv } from "../../../config/env";

// Fixed set of generated variants to keep themes and sites aligned
export type GeneratedVariantName = "small" | "medium" | "large";
export const generatedVariants: GeneratedVariantName[] = ["small", "medium", "large"];

export interface ImageVariantSize {
  width: number;
  height?: number;
}

export interface ImagePipelineConfig {
  requiresImageEngine: boolean;
  variants: Record<GeneratedVariantName, ImageVariantSize>;
  format: ImageFormat;
  quality: number;
  fit: ImageFit;
  reencodeDefault: boolean;
  outputDir: string; // absolute path: <root>/<outputDirName>/<images.outputDir>
  publicBase: string; // URL prefix for routes, derived from outputDir segment
}

const MAX_DIMENSION = 4000;
const DEFAULT_FORMAT: ImageFormat = "webp";
const DEFAULT_FIT: ImageFit = "cover";

function clampDimension(value: number | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return undefined;
  return Math.min(Math.round(value), MAX_DIMENSION);
}

function normalizeVariantSize(raw: unknown): ImageVariantSize | undefined {
  if (typeof raw === "number") {
    const width = clampDimension(raw);
    return width ? { width } : undefined;
  }

  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const width = clampDimension(obj.width as number | undefined);
    const height = clampDimension(obj.height as number | undefined);
    if (!width && !height) return undefined;
    return { ...(width ? { width } : {}), ...(height ? { height } : {}) } as ImageVariantSize;
  }

  return undefined;
}

function normalizeOutputDir(
  rootDir: string,
  outputDirName: string,
  raw: unknown,
  fallback: string
): string {
  const candidate = typeof raw === "string" && raw.trim() ? raw.trim() : fallback;
  if (path.isAbsolute(candidate)) {
    return candidate;
  }

  const clean = candidate.replace(/^[/\\]+/, "");
  return path.join(rootDir, outputDirName, clean);
}

function normalizeFormat(raw: unknown, fallback: ImageFormat): ImageFormat {
  if (raw === "webp" || raw === "avif" || raw === "jpeg" || raw === "png") {
    return raw;
  }
  return fallback;
}

function normalizeFit(raw: unknown, fallback: ImageFit): ImageFit {
  if (
    raw === "cover" ||
    raw === "contain" ||
    raw === "fill" ||
    raw === "inside" ||
    raw === "outside"
  ) {
    return raw;
  }
  return fallback;
}

export function resolveImageConfig(
  rootDir: string,
  env: WebetteEnv,
  site: Site
): ImagePipelineConfig {
  // Site overrides live under site.images; tool defaults come from env.images.
  const rawSiteImages =
    site?.site && typeof site.site === "object"
      ? (site.site as Record<string, unknown>).images
      : undefined;

  const envImages = env.images;

  const fallbackVariants = {
    small: { width: clampDimension(envImages.sizes.small) ?? 480 },
    medium: { width: clampDimension(envImages.sizes.medium) ?? 960 },
    large: { width: clampDimension(envImages.sizes.large) ?? 1440 },
  } as Record<GeneratedVariantName, ImageVariantSize>;

  const siteSizes =
    rawSiteImages && typeof rawSiteImages === "object"
      ? (rawSiteImages as Record<string, unknown>).sizes
      : undefined;

  const variants = generatedVariants.reduce((acc, name) => {
    const rawSize =
      siteSizes && typeof siteSizes === "object"
        ? (siteSizes as Record<string, unknown>)[name]
        : undefined;

    acc[name] = normalizeVariantSize(rawSize) ?? fallbackVariants[name];
    return acc;
  }, {} as Record<GeneratedVariantName, ImageVariantSize>);

  const requiresImageEngine =
    (rawSiteImages && typeof rawSiteImages === "object" &&
      typeof (rawSiteImages as Record<string, unknown>).requiresImageEngine ===
        "boolean"
      ? (rawSiteImages as Record<string, unknown>).requiresImageEngine
      : undefined) ??
    envImages.requiresImageEngine;

  const format = normalizeFormat(
    rawSiteImages && typeof rawSiteImages === "object"
      ? (rawSiteImages as Record<string, unknown>).format
      : undefined,
    envImages.format ?? DEFAULT_FORMAT
  );

  const qualityRaw =
    rawSiteImages && typeof rawSiteImages === "object"
      ? (rawSiteImages as Record<string, unknown>).quality
      : undefined;
  const quality =
    typeof qualityRaw === "number" && Number.isFinite(qualityRaw)
      ? Math.min(Math.max(Math.round(qualityRaw), 1), 100)
      : Math.min(Math.max(Math.round(envImages.quality ?? 80), 1), 100);

  const fit = normalizeFit(
    rawSiteImages && typeof rawSiteImages === "object"
      ? (rawSiteImages as Record<string, unknown>).fit
      : undefined,
    envImages.fit ?? DEFAULT_FIT
  );

  const reencodeDefault =
    rawSiteImages && typeof rawSiteImages === "object" &&
    typeof (rawSiteImages as Record<string, unknown>).reencodeDefault === "boolean"
      ? ((rawSiteImages as Record<string, unknown>).reencodeDefault as boolean)
      : envImages.reencodeDefault;

  const outputDirSegment =
    (rawSiteImages && typeof rawSiteImages === "object"
      ? (rawSiteImages as Record<string, unknown>).outputDir
      : undefined) ?? envImages.outputDir;

  const outputDir = normalizeOutputDir(
    rootDir,
    env.build.outputDirName,
    outputDirSegment,
    envImages.outputDir
  );

  // Public base mirrors the outputDir segment so routes reflect the static path
  const publicBase =
    typeof outputDirSegment === "string" && outputDirSegment.trim()
      ? outputDirSegment.replace(/^\/+|\/+$/g, "")
      : envImages.outputDir.replace(/^\/+|\/+$/g, "");

  return {
    requiresImageEngine: Boolean(requiresImageEngine),
    variants,
    format,
    quality,
    fit,
    reencodeDefault: Boolean(reencodeDefault),
    outputDir,
    publicBase,
  };
}
