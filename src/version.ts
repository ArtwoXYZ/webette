/**
 * Webette version helper.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

let cachedVersion: string | undefined;

export function getVersion(): string {
  if (cachedVersion) return cachedVersion;
  const pkgPath = fileURLToPath(new URL("../package.json", import.meta.url));

  try {
    const raw = readFileSync(pkgPath, "utf8");
    const parsed = JSON.parse(raw) as { version?: unknown };
    if (typeof parsed?.version === "string") {
      cachedVersion = parsed.version;
      return cachedVersion;
    }
  } catch {
    // fallback below
  }

  cachedVersion = "unknown";
  return cachedVersion;
}
