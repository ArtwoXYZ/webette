/**
 * Image pipeline config resolution (tool defaults + site overrides).
 */

import * as path from "node:path";
import type { Site } from "../../model";
import type { ImageFit, ImageFormat } from "../../model";
import type { WebetteEnv } from "../../../config/env";
import { normalizeAssetOutputDir } from "../../../utils/path";

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
const DEFAULT_REQUIRES_IMAGE_ENGINE = false;
const DEFAULT_SIZES = { small: 480, medium: 960, large: 1440 };
const DEFAULT_QUALITY = 80;
const DEFAULT_REENCODE_DEFAULT = false;
const DEFAULT_IMAGES_OUTPUT_DIR = "assets/images";

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
  // Site overrides live under site.config.images; inline defaults apply as fallback.
  const rawSiteImages = site?.config?.images;

  const fallbackVariants = {
    small: { width: clampDimension(DEFAULT_SIZES.small) ?? 480 },
    medium: { width: clampDimension(DEFAULT_SIZES.medium) ?? 960 },
    large: { width: clampDimension(DEFAULT_SIZES.large) ?? 1440 },
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
    DEFAULT_REQUIRES_IMAGE_ENGINE;

  const format = normalizeFormat(
    rawSiteImages && typeof rawSiteImages === "object"
      ? (rawSiteImages as Record<string, unknown>).format
      : undefined,
    DEFAULT_FORMAT
  );

  const qualityRaw =
    rawSiteImages && typeof rawSiteImages === "object"
      ? (rawSiteImages as Record<string, unknown>).quality
      : undefined;
  const quality =
    typeof qualityRaw === "number" && Number.isFinite(qualityRaw)
      ? Math.min(Math.max(Math.round(qualityRaw), 1), 100)
      : Math.min(Math.max(Math.round(DEFAULT_QUALITY), 1), 100);

  const fit = normalizeFit(
    rawSiteImages && typeof rawSiteImages === "object"
      ? (rawSiteImages as Record<string, unknown>).fit
      : undefined,
    DEFAULT_FIT
  );

  const reencodeDefault =
    rawSiteImages && typeof rawSiteImages === "object" &&
    typeof (rawSiteImages as Record<string, unknown>).reencodeDefault === "boolean"
      ? ((rawSiteImages as Record<string, unknown>).reencodeDefault as boolean)
      : DEFAULT_REENCODE_DEFAULT;

  const outputDirSegment =
    (rawSiteImages && typeof rawSiteImages === "object"
      ? (rawSiteImages as Record<string, unknown>).outputDir
      : undefined) ?? DEFAULT_IMAGES_OUTPUT_DIR;

  const outputDir = normalizeAssetOutputDir(
    rootDir,
    env.build.outputDirName,
    outputDirSegment,
    DEFAULT_IMAGES_OUTPUT_DIR
  );

  // Public base mirrors the outputDir segment so routes reflect the static path
  const publicBase =
    typeof outputDirSegment === "string" && outputDirSegment.trim()
      ? outputDirSegment.replace(/^\/+|\/+$/g, "")
      : DEFAULT_IMAGES_OUTPUT_DIR.replace(/^\/+|\/+$/g, "");

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
