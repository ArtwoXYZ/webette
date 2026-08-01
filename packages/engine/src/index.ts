/**
 * Webette public entrypoint (programmatic API).
 *
 * Exposes the engine primitives so external tooling (desktop app,
 * scripts) can drive webette without going through the CLI.
 */

export { build } from "./core/build";
export type { BuildOptions } from "./core/build";

export { serve } from "./core/serve";
export type { ServeOptions } from "./core/serve";

export { createProjectLogger } from "./logging/logger";
export type { Logger } from "./logging/logger";

export { loadVersion } from "./version";
