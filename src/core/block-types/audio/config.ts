/**
 * Audio pipeline config resolution (tool defaults + site overrides).
 */

import * as path from "node:path";
import type { Site } from "../../model";
import type { WebetteEnv } from "../../../config/env";

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

const DEFAULT_AUDIO_OUTPUT_DIR = "assets/audio";

// Merge tool defaults with optional site overrides to build the audio pipeline config.
export function resolveAudioConfig(
  rootDir: string,
  env: WebetteEnv,
  site: Site
): AudioPipelineConfig {
  const rawSiteAudio = site?.config?.audio;

  const outputDirSegment =
    (rawSiteAudio && typeof rawSiteAudio === "object"
      ? (rawSiteAudio as Record<string, unknown>).outputDir
      : undefined) ?? DEFAULT_AUDIO_OUTPUT_DIR;

  const outputDir = normalizeOutputDir(
    rootDir,
    env.build.outputDirName,
    outputDirSegment,
    DEFAULT_AUDIO_OUTPUT_DIR
  );

  const publicBase =
    typeof outputDirSegment === "string" && outputDirSegment.trim()
      ? outputDirSegment.replace(/^\/+|\/+$/g, "")
      : DEFAULT_AUDIO_OUTPUT_DIR.replace(/^\/+|\/+$/g, "");

  return {
    outputDir,
    publicBase,
  };
}
