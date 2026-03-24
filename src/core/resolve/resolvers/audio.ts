/**
 * Extracts audio metadata (duration, codec, tags) and copies the asset to the public output path.
 */

import { stat } from "node:fs/promises";
import * as path from "node:path";
import type { Resolver } from "../registry";
import { readAudioMetadata } from "../../block-types/audio/metadata";
import { copyAudioAsset } from "../../block-types/audio/engine";

const mimeByExt: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".flac": "audio/flac",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
};

export const resolveAudio: Resolver = async (block, ctx) => {
  if (ctx.readContent === false) return undefined;

  const filePath = path.join(ctx.rootDir, block.path);
  const stats = await stat(filePath);
  const ext = block.ext?.toLowerCase() ?? "";
  const mime = mimeByExt[ext];

  const baseMeta = {
    size: stats.size,
    ...(mime ? { mime } : {}),
  };

  const audioConfig = ctx.audioConfig;
  if (!audioConfig) {
    return { meta: baseMeta };
  }

  const parsedMeta = await readAudioMetadata(filePath, ctx.logger);

  const meta = {
    ...baseMeta,
    ...(parsedMeta?.duration ? { duration: parsedMeta.duration } : {}),
    ...(parsedMeta?.bitrate ? { bitrate: parsedMeta.bitrate } : {}),
    ...(parsedMeta?.sampleRate ? { sampleRate: parsedMeta.sampleRate } : {}),
    ...(parsedMeta?.channels ? { channels: parsedMeta.channels } : {}),
    ...(parsedMeta?.codec ? { codec: parsedMeta.codec } : {}),
    ...(parsedMeta?.title ? { title: parsedMeta.title } : {}),
    ...(parsedMeta?.artist ? { artist: parsedMeta.artist } : {}),
    ...(parsedMeta?.album ? { album: parsedMeta.album } : {}),
    ...(parsedMeta?.year ? { year: parsedMeta.year } : {}),
    ...(parsedMeta?.genre && parsedMeta.genre.length ? { genre: parsedMeta.genre } : {}),
  };

  const copied = await copyAudioAsset({
    block,
    filePath,
    config: audioConfig,
    logger: ctx.logger,
    routeHint: ctx.routeHint,
    routeSegments: ctx.routeSegments,
  });

  const blockRoute = copied?.route;

  return {
    meta,
    ...(blockRoute ? { blockRoute } : {}),
  };
};
