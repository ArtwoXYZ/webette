/**
 * Prints the notes of the version being released, or fails loudly.
 *
 *   bun run release:notes            # notes for the current version
 *   bun run release:notes v2026.10.0  # also checks the tag name
 *
 * The engine's package.json holds the version; the app must match it.
 */

import * as path from "node:path";
import { extractReleaseNotes, tagForVersion } from "./release";

const root = path.resolve(import.meta.dir, "..");

async function readVersion(packageDir: string): Promise<string> {
  const file = Bun.file(path.join(root, "packages", packageDir, "package.json"));
  return ((await file.json()) as { version: string }).version;
}

try {
  const version = await readVersion("engine");
  const appVersion = await readVersion("app");
  if (appVersion !== version) {
    throw new Error(
      `packages/app is at ${appVersion} but packages/engine is at ${version}: they are released together.`
    );
  }

  const tag = process.argv[2];
  if (tag && tag !== tagForVersion(version)) {
    throw new Error(
      `Tag ${tag} does not match package.json (expected ${tagForVersion(version)}).`
    );
  }

  const changelog = await Bun.file(path.join(root, "CHANGELOG.md")).text();
  console.log(`webette ${tagForVersion(version)}\n`);
  console.log(extractReleaseNotes(changelog, version));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
