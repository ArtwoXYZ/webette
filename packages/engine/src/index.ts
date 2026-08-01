/**
 * Webette public entrypoint (programmatic API).
 *
 * Exposes the engine primitives so external tooling (desktop app,
 * scripts) can drive webette without going through the CLI.
 */

export { build } from "./core/build";
export type { BuildOptions } from "./core/build";

export { serve } from "./core/serve";
export type { ServeOptions, ServeHandle } from "./core/serve";

export { startApiServer, DEFAULT_API_PORT } from "./core/api";
export type { ApiServerOptions, ApiHandle, ApiErrorCode } from "./core/api";

export { createProjectLogger, Logger } from "./logging/logger";
export type { LogLevel } from "./logging/logger";

export { loadVersion } from "./version";
