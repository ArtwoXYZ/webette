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

export function resolveVideoConfig(
  rootDir: string,
  env: WebetteEnv,
  site: Site
): VideoPipelineConfig {
  const rawSiteVideo =
    site?.site && typeof site.site === "object"
      ? (site.site as Record<string, unknown>).video
      : undefined;

  const envVideo = env.video;

  const outputDirSegment =
    (rawSiteVideo && typeof rawSiteVideo === "object"
      ? (rawSiteVideo as Record<string, unknown>).outputDir
      : undefined) ?? envVideo.outputDir;

  const outputDir = normalizeOutputDir(
    rootDir,
    env.build.outputDirName,
    outputDirSegment,
    envVideo.outputDir
  );

  const publicBase =
    typeof outputDirSegment === "string" && outputDirSegment.trim()
      ? outputDirSegment.replace(/^\/+|\/+$/g, "")
      : envVideo.outputDir.replace(/^\/+|\/+$/g, "");

  return {
    outputDir,
    publicBase,
  };
}
