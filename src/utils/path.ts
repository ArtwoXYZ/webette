/**
 * Path utilities (POSIX normalization, route helpers).
 */
import * as path from "node:path";

export const toPosix = (value: string): string => value.replace(/\\/g, "/");

/** Normalize a media output dir: resolve relative paths under rootDir/outputDirName. */
export function normalizeAssetOutputDir(
  rootDir: string,
  outputDirName: string,
  raw: unknown,
  fallback: string
): string {
  const candidate = typeof raw === "string" && raw.trim() ? raw.trim() : fallback;
  if (path.isAbsolute(candidate)) return candidate;
  const clean = candidate.replace(/^[/\\]+/, "");
  return path.join(rootDir, outputDirName, clean);
}

/** Ensure a route starts with a leading slash. */
export const ensureLeadingSlash = (route: string): string =>
  route.startsWith("/") ? route : `/${route}`;

/** Strip leading and trailing slashes from a route segment. */
export const stripRouteSlashes = (route: string): string =>
  route.replace(/^\/+/, "").replace(/\/+$/, "");

/** Normalize a collection path for use as a lookup key (posix + strip slashes). */
export function normalizeCollectionPathKey(value: string | undefined): string {
  return stripRouteSlashes(toPosix(value ?? ""));
}

/** Get the parent collection path key (posix dirname, empty string for root). */
export function parentCollectionPathKey(collectionPath: string): string {
  const normalized = normalizeCollectionPathKey(collectionPath);
  if (!normalized) return "";
  const parent = path.posix.dirname(normalized);
  return parent === "." ? "" : parent;
}

const escapedExtCache = new Map<string, string>();
/** Escape a file extension for safe use in a RegExp pattern. */
export function escapeExtForRegex(ext: string): string {
  if (escapedExtCache.has(ext)) return escapedExtCache.get(ext)!;
  const escaped = ext.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  escapedExtCache.set(ext, escaped);
  return escaped;
}
