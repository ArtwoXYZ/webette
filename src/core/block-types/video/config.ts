/**
 * Video pipeline config resolution (tool defaults + site overrides).
 */

import * as path from "node:path";
import type { Site } from "../../model";
import type { WebetteEnv } from "../../../config/env";

export interface VideoPipelineConfig {
  outputDir: string; // absolute path: <root>/<outputDirName>/<video.outputDir>
  publicBase: string; // URL prefix for routes, derived from outputDir segment
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

const DEFAULT_VIDEO_OUTPUT_DIR = "assets/video";

export function resolveVideoConfig(
  rootDir: string,
  env: WebetteEnv,
  site: Site
): VideoPipelineConfig {
  const rawSiteVideo = site?.config?.video;

  const outputDirSegment =
    (rawSiteVideo && typeof rawSiteVideo === "object"
      ? (rawSiteVideo as Record<string, unknown>).outputDir
      : undefined) ?? DEFAULT_VIDEO_OUTPUT_DIR;

  const outputDir = normalizeOutputDir(
    rootDir,
    env.build.outputDirName,
    outputDirSegment,
    DEFAULT_VIDEO_OUTPUT_DIR
  );

  const publicBase =
    typeof outputDirSegment === "string" && outputDirSegment.trim()
      ? outputDirSegment.replace(/^\/+|\/+$/g, "")
      : DEFAULT_VIDEO_OUTPUT_DIR.replace(/^\/+|\/+$/g, "");

  return {
    outputDir,
    publicBase,
  };
}
