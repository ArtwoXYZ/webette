/**
 * Desktop app builds: how the files people download are named, and what
 * a Tangled release artifact accepts.
 *
 * Electrobun names its outputs after its own channels
 * (`stable-linux-x64-Webette-Setup.tar.gz`). People get one file per
 * system, named after webette and its version
 * (`webette-v2026.10.0-linux-x64.tar.gz`).
 */

import { tagForVersion } from "./release";

/** Where `electrobun build` leaves its outputs, and where ours stay. */
export const ARTIFACT_FOLDER = "packages/app/artifacts";

/**
 * Upper size of a `sh.tangled.repo.artifact` blob (50 MiB, from the
 * Tangled lexicon). A build above it cannot be attached to a tag.
 */
export const MAX_ARTIFACT_BYTES = 52_428_800;

interface Distributable {
  /** The file Electrobun produces for this system. */
  built: string;
  /** The name it is published under. */
  published: string;
}

// Electrobun's installer for each system: a disk image on macOS, a zip
// holding the setup program on Windows, a self-extracting installer in a
// tarball on Linux.
const SYSTEMS: Record<string, { electrobun: string; name: string; file: string; ext: string }> = {
  darwin: { electrobun: "macos", name: "macos", file: "Webette.dmg", ext: "dmg" },
  win32: { electrobun: "win", name: "windows", file: "Webette-Setup.zip", ext: "zip" },
  linux: { electrobun: "linux", name: "linux", file: "Webette-Setup.tar.gz", ext: "tar.gz" },
};

/** `platform` and `arch` as Node reports them (`process.platform`, `process.arch`). */
export function distributableFor(version: string, platform: string, arch: string): Distributable {
  const system = SYSTEMS[platform];
  if (!system) {
    throw new Error(`webette has no desktop build for "${platform}".`);
  }
  return {
    built: `stable-${system.electrobun}-${arch}-${system.file}`,
    published: `${artifactPrefix(version)}${system.name}-${arch}.${system.ext}`,
  };
}

/** What every published build of `version` starts with. */
export function artifactPrefix(version: string): string {
  return `webette-${tagForVersion(version)}-`;
}

/**
 * A Tangled artifact points at its tag with the raw bytes of the tag
 * object's hash; over the wire those bytes travel as unpadded base64.
 */
export function tagHashBytes(hash: string): string {
  if (!/^[0-9a-f]{40}$/.test(hash)) {
    throw new Error(`"${hash}" is not a Git object hash.`);
  }
  return Buffer.from(hash, "hex").toString("base64").replace(/=+$/, "");
}
