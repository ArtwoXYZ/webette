import * as path from "node:path";
import { readFileSync } from "node:fs";

let cachedVersion: string | undefined;

export function getVersion(): string {
  if (cachedVersion) return cachedVersion;

  const candidates = [
    path.join(process.cwd(), "package.json"),
    path.join(path.dirname(path.dirname(import.meta.url.replace("file://", ""))), "package.json"),
  ];

  for (const pkgPath of candidates) {
    try {
      const raw = readFileSync(pkgPath, "utf8");
      const parsed = JSON.parse(raw) as { version?: unknown };
      if (typeof parsed?.version === "string") {
        cachedVersion = parsed.version;
        return cachedVersion;
      }
    } catch {
      // try next candidate
    }
  }

  cachedVersion = "unknown";
  return cachedVersion;
}
