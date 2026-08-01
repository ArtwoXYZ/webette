/**
 * Local control API (`webette api`): lets external interfaces (desktop app,
 * scripts) drive the engine over HTTP — build, serve lifecycle, status, logs.
 *
 * Single active site at a time; binds to 127.0.0.1 only.
 */

import * as path from "node:path";
import { existsSync, statSync } from "node:fs";
import { stat } from "node:fs/promises";

import { getEnv } from "../config/env";
import { build, type BuildOptions } from "./build";
import { serve, type ServeHandle, type ServeOptions } from "./serve";
import { createProjectLogger, type Logger } from "../logging/logger";
import { loadVersion } from "../version";

export const DEFAULT_API_PORT = 4177;

export interface ApiServerOptions {
  port?: number;
  verbose?: boolean;
}

export interface ApiHandle {
  port: number;
  stop(): Promise<void>;
}

interface LastBuild {
  at: string;
  ok: boolean;
  durationMs: number;
  errors: string[];
}

interface ApiState {
  activeSite: string | null;
  serve: { handle: ServeHandle; port: number } | null;
  lastBuild: LastBuild | null;
  buildRunning: boolean;
}

// ── JSON response helpers ───────────────────────────────────────

/**
 * Stable machine-readable error codes: clients match on `code` and
 * localize themselves; `error` is an English debug/fallback message.
 */
export type ApiErrorCode =
  | "invalid_json_body"
  | "missing_root_dir"
  | "invalid_root_dir"
  | "invalid_cursor"
  | "build_already_running"
  | "serve_already_running"
  | "build_running"
  | "other_site_active"
  | "no_serve_running"
  | "no_active_site"
  | "serve_start_failed"
  | "unknown_route"
  | "internal_error";

function ok(data: unknown, status = 200): Response {
  return Response.json({ ok: true, data }, { status });
}

function fail(code: ApiErrorCode, error: string, status: number): Response {
  return Response.json({ ok: false, code, error }, { status });
}

// ── Request body parsing ────────────────────────────────────────

interface SiteRequestBody {
  rootDir: string;
  options?: Partial<BuildOptions & ServeOptions>;
}

async function readSiteBody(
  req: Request
): Promise<{ body: SiteRequestBody } | { error: Response }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { error: fail("invalid_json_body", "Invalid JSON body.", 400) };
  }

  const rootDir = (raw as { rootDir?: unknown })?.rootDir;
  if (typeof rootDir !== "string" || rootDir.trim() === "") {
    return { error: fail("missing_root_dir", 'Body must include a "rootDir" string.', 400) };
  }

  const resolved = path.resolve(rootDir);
  if (!existsSync(resolved) || !statSync(resolved).isDirectory()) {
    return { error: fail("invalid_root_dir", `rootDir is not a directory: ${resolved}`, 400) };
  }

  const options = (raw as { options?: unknown })?.options;
  return {
    body: {
      rootDir: resolved,
      options:
        options && typeof options === "object"
          ? (options as SiteRequestBody["options"])
          : undefined,
    },
  };
}

// ── Log reading (incremental, byte-offset cursor) ───────────────

async function readLogsSince(
  logPath: string,
  cursor: number
): Promise<{ entries: unknown[]; cursor: number; reset: boolean }> {
  let size: number;
  try {
    size = (await stat(logPath)).size;
  } catch {
    return { entries: [], cursor: 0, reset: false };
  }

  let from = Math.max(0, cursor);
  let reset = false;
  if (from > size) {
    // File was recreated or truncated (new build): restart from the top.
    from = 0;
    reset = true;
  }
  if (from === size) {
    return { entries: [], cursor: size, reset };
  }

  const buf = Buffer.from(await Bun.file(logPath).slice(from, size).arrayBuffer());
  // Only consume complete lines; a partial trailing line stays for next poll.
  const lastNewline = buf.lastIndexOf(0x0a);
  if (lastNewline === -1) {
    return { entries: [], cursor: from, reset };
  }

  const entries = buf
    .subarray(0, lastNewline + 1)
    .toString("utf8")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => {
      try {
        return JSON.parse(line) as unknown;
      } catch {
        return { raw: line };
      }
    });

  return { entries, cursor: from + lastNewline + 1, reset };
}

// ── API server ──────────────────────────────────────────────────

export async function startApiServer(
  options: ApiServerOptions,
  logger: Logger
): Promise<ApiHandle> {
  const scoped = logger.child("api");
  const { env: toolEnv } = await getEnv();
  const port = options.port ?? DEFAULT_API_PORT;
  const verbose = options.verbose ?? false;

  const state: ApiState = {
    activeSite: null,
    serve: null,
    lastBuild: null,
    buildRunning: false,
  };

  const siteLogger = (rootDir: string, command: string) =>
    createProjectLogger(rootDir, `webette.api.${command}`, verbose, toolEnv);

  async function handleStatus(): Promise<Response> {
    return ok({
      version: loadVersion(),
      activeSite: state.activeSite,
      serve: state.serve ? { port: state.serve.port } : null,
      lastBuild: state.lastBuild,
    });
  }

  async function handleBuild(req: Request): Promise<Response> {
    const parsed = await readSiteBody(req);
    if ("error" in parsed) return parsed.error;
    const { rootDir, options: buildOptions } = parsed.body;

    if (state.buildRunning) {
      return fail("build_already_running", "A build is already running.", 409);
    }
    if (state.serve) {
      return state.activeSite === rootDir
        ? fail(
          "serve_already_running",
          "A serve is running on this site; concurrent writes to the output are not allowed. POST /stop first.",
          409
        )
        : fail(
          "other_site_active",
          `Another site is active (${state.activeSite}). POST /stop first.`,
          409
        );
    }

    state.buildRunning = true;
    state.activeSite = rootDir;
    const startedAt = performance.now();
    const at = new Date().toISOString();
    const errors: string[] = [];

    try {
      const logger = await siteLogger(rootDir, "build");
      await build(rootDir, { verbose, ...buildOptions }, logger);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    } finally {
      state.buildRunning = false;
    }

    const summary: LastBuild = {
      at,
      ok: errors.length === 0,
      durationMs: Math.round(performance.now() - startedAt),
      errors,
    };
    state.lastBuild = summary;
    return ok(summary);
  }

  async function handleServe(req: Request): Promise<Response> {
    const parsed = await readSiteBody(req);
    if ("error" in parsed) return parsed.error;
    const { rootDir, options: serveOptions } = parsed.body;

    if (state.serve) {
      return fail(
        "serve_already_running",
        `A serve is already running on port ${state.serve.port} for ${state.activeSite}. POST /stop first.`,
        409
      );
    }
    if (state.buildRunning) {
      return fail("build_running", "A build is running; retry once it completes.", 409);
    }

    const logger = await siteLogger(rootDir, "serve");
    try {
      const handle = await serve(rootDir, { verbose, ...serveOptions }, logger);
      state.activeSite = rootDir;
      state.serve = { handle, port: handle.port };
      return ok({ port: handle.port, rootDir });
    } catch (error) {
      return fail(
        "serve_start_failed",
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  }

  async function handleStop(): Promise<Response> {
    if (!state.serve) {
      return fail("no_serve_running", "No serve is currently running.", 409);
    }
    const { handle, port: servePort } = state.serve;
    await handle.stop();
    state.serve = null;
    return ok({ stopped: true, port: servePort });
  }

  async function handleLogs(url: URL): Promise<Response> {
    if (!state.activeSite) {
      return fail("no_active_site", "No active site yet; POST /build or /serve first.", 409);
    }
    const sinceRaw = url.searchParams.get("since") ?? "0";
    const since = Number.parseInt(sinceRaw, 10);
    if (Number.isNaN(since) || since < 0) {
      return fail("invalid_cursor", '"since" must be a non-negative integer (byte offset).', 400);
    }

    const logPath = path.join(
      state.activeSite,
      toolEnv.logging.dirName,
      "logs.jsonl"
    );
    return ok(await readLogsSince(logPath, since));
  }

  const server = Bun.serve({
    hostname: "127.0.0.1",
    port,
    // Synchronous builds can be slow on large sites; avoid idle disconnects.
    idleTimeout: 255,
    async fetch(req) {
      const url = new URL(req.url);
      const route = `${req.method} ${url.pathname}`;

      let response: Response;
      try {
        switch (route) {
          case "GET /status":
            response = await handleStatus();
            break;
          case "POST /build":
            response = await handleBuild(req);
            break;
          case "POST /serve":
            response = await handleServe(req);
            break;
          case "POST /stop":
            response = await handleStop();
            break;
          case "GET /logs":
            response = await handleLogs(url);
            break;
          default:
            response = fail("unknown_route", `Unknown route: ${route}`, 404);
            break;
        }
      } catch (error) {
        response = fail(
          "internal_error",
          error instanceof Error ? error.message : String(error),
          500
        );
      }

      scoped.debug("api.request", {
        method: req.method,
        path: url.pathname,
        status: response.status,
      });
      return response;
    },
  });

  const boundPort = server.port ?? port;

  scoped.info("api.listening", {
    url: `http://127.0.0.1:${boundPort}`,
    port: boundPort,
  });

  return {
    port: boundPort,
    async stop() {
      if (state.serve) {
        await state.serve.handle.stop();
        state.serve = null;
      }
      await server.stop(true);
      scoped.info("api.stopped", { port: boundPort });
    },
  };
}
