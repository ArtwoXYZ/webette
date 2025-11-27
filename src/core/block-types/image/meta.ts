import type { ImageInfo } from "image-size";

export const mimeByExt: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".apng": "image/apng",
};

export function collectImageMeta(info: ImageInfo): {
  width?: number;
  height?: number;
} {
  return {
    width: typeof info.width === "number" ? info.width : undefined,
    height: typeof info.height === "number" ? info.height : undefined,
  };
}
