/**
 * Path utilities (POSIX normalization).
 */
export const toPosix = (value: string): string => value.replace(/\\/g, "/");
