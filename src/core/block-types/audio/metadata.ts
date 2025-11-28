import type { Logger } from "../../../logging/logger";

// Minimal shape of the optional music-metadata module (kept inline to avoid hard dependency).
interface MusicMetadataModule {
  parseFile: (
    filePath: string,
    opts?: { duration?: boolean }
  ) => Promise<{
    common: Record<string, any>;
    format: {
      duration?: number;
      bitrate?: number;
      sampleRate?: number;
      numberOfChannels?: number;
      codec?: string;
    };
  }>;
}

let cachedMusicMetadata: MusicMetadataModule | null | undefined;

// Lazy-load music-metadata; cache null when missing so we don't retry on every file.
async function loadMusicMetadata(logger?: Logger): Promise<MusicMetadataModule | null> {
  if (cachedMusicMetadata !== undefined) return cachedMusicMetadata;
  try {
    const mod = (await import("music-metadata")) as unknown as MusicMetadataModule;
    cachedMusicMetadata = mod;
    return cachedMusicMetadata;
  } catch (err) {
    logger?.warn("resolve.audio.metadataModuleMissing", {
      error: String(err),
    });
    cachedMusicMetadata = null;
    return null;
  }
}

export interface AudioMetadataSummary {
  duration?: number; // seconds
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
  codec?: string;
  title?: string;
  artist?: string;
  album?: string;
  year?: number;
  genre?: string[];
}

export async function readAudioMetadata(
  filePath: string,
  logger?: Logger
): Promise<AudioMetadataSummary | null> {
  // Best-effort: if the lib is missing or parsing fails, caller will fall back to base meta.
  const musicMetadata = await loadMusicMetadata(logger);
  if (!musicMetadata) return null;

  try {
    const parsed = await musicMetadata.parseFile(filePath, { duration: true });
    const { common, format } = parsed;

    const artists = Array.isArray(common.artists)
      ? common.artists.filter(Boolean)
      : undefined;

    const genre = Array.isArray(common.genre)
      ? (common.genre
          .map((g: unknown) => (g != null ? g.toString().trim() : ""))
          .filter((val: string) => Boolean(val)) as string[])
      : undefined;

    return {
      duration: format.duration,
      bitrate: format.bitrate,
      sampleRate: format.sampleRate,
      channels: format.numberOfChannels,
      codec: format.codec,
      title: common.title,
      artist: common.artist ?? artists?.[0],
      album: common.album,
      year: common.year,
      ...(genre && genre.length ? { genre } : {}),
    };
  } catch (err) {
    logger?.warn("resolve.audio.metadataFailed", {
      path: filePath,
      error: String(err),
    });
    return null;
  }
}
