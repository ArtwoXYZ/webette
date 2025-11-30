import * as path from "node:path";
import type { Site } from "../../model";
import type { WebetteEnv } from "../../../config/env";

// Minimal audio pipeline config: only controls copy/output locations (no variants yet).
export interface AudioPipelineConfig {
  outputDir: string; // absolute path: <root>/<outputDirName>/<audio.outputDir>
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

// Merge tool defaults with optional site overrides to build the audio pipeline config.
export function resolveAudioConfig(
  rootDir: string,
  env: WebetteEnv,
  site: Site
): AudioPipelineConfig {
  const rawSiteAudio =
    site?.site && typeof site.site === "object"
      ? (site.site as Record<string, unknown>).audio
      : undefined;

  const envAudio = env.audio;

  const outputDirSegment =
    (rawSiteAudio && typeof rawSiteAudio === "object"
      ? (rawSiteAudio as Record<string, unknown>).outputDir
      : undefined) ?? envAudio.outputDir;

  const outputDir = normalizeOutputDir(
    rootDir,
    env.build.outputDirName,
    outputDirSegment,
    envAudio.outputDir
  );

  const publicBase =
    typeof outputDirSegment === "string" && outputDirSegment.trim()
      ? outputDirSegment.replace(/^\/+|\/+$/g, "")
      : envAudio.outputDir.replace(/^\/+|\/+$/g, "");

  return {
    outputDir,
    publicBase,
  };
}
