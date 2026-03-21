/**
 * Path utilities (POSIX normalization, route helpers).
 */
import * as path from "node:path";

export const toPosix = (value: string): string => value.replace(/\\/g, "/");

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
