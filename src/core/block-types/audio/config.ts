/**
 * Audio pipeline config resolution (tool defaults + site overrides).
 */

import type { Site } from "../../model";
import type { WebetteEnv } from "../../../config/env";
import { normalizeAssetOutputDir } from "../../../utils/path";

export interface AudioPipelineConfig {
  outputDir: string; // absolute path: <root>/<outputDirName>/<audio.outputDir>
  publicBase: string; // URL prefix for routes, derived from outputDir segment
}

const DEFAULT_AUDIO_OUTPUT_DIR = "assets/audio";

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

  const outputDir = normalizeAssetOutputDir(
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
