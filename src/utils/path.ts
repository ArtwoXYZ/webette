// Normalize Windows paths to POSIX for model serialization and JSON friendliness
export const toPosix = (value: string): string => value.replace(/\\/g, "/");

