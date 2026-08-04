/**
 * Exposes the engine package version to the CLI and programmatic API.
 */

import enginePackage from "../package.json" with { type: "json" };

export const ENGINE_VERSION = enginePackage.version;

export function loadVersion(): string {
  return ENGINE_VERSION;
}
