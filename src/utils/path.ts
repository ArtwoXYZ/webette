/**
 * Path utilities (POSIX normalization, route helpers).
 */
export const toPosix = (value: string): string => value.replace(/\\/g, "/");

/** Strip leading and trailing slashes from a route segment. */
export const stripRouteSlashes = (route: string): string =>
  route.replace(/^\/+/, "").replace(/\/+$/, "");
