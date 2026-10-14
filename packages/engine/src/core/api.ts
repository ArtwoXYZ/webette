/**
 * Local control API (`webette api`): lets external interfaces (desktop app,
 * scripts) drive the engine over HTTP — build, serve lifecycle, status, logs.
 *
 * Single active site at a time; binds to 127.0.0.1 only.
 * Endpoints are described in docs/local-api.md.
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
  outputDir: string;
}

interface ApiState {
  activeSite: string | null;
  // Size of the active site's log file when the site became active: log
  // streams opened earlier start there, so they skip the previous runs.
  logStart: number;
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

interface LogChunk {
  // Each entry comes with the cursor that points right after it.
  lines: { entry: unknown; cursor: number }[];
  cursor: number;
  reset: boolean;
}

async function readLogsSince(logPath: string, cursor: number): Promise<LogChunk> {
  let size: number;
  try {
    size = (await stat(logPath)).size;
  } catch {
    return { lines: [], cursor: 0, reset: false };
  }

  let from = Math.max(0, cursor);
  let reset = false;
  if (from > size) {
    // File was recreated or truncated (new build): restart from the top.
    from = 0;
    reset = true;
  }
  if (from === size) {
    return { lines: [], cursor: size, reset };
  }

  const buf = Buffer.from(await Bun.file(logPath).slice(from, size).arrayBuffer());
  const lines: LogChunk["lines"] = [];
  let lineStart = 0;
  // Only consume complete lines; a partial trailing line stays for next read.
  for (;;) {
    const newline = buf.indexOf(0x0a, lineStart);
    if (newline === -1) break;
    const line = buf.subarray(lineStart, newline).toString("utf8");
    lineStart = newline + 1;
    if (line.trim() === "") continue;
    let entry: unknown;
    try {
      entry = JSON.parse(line);
    } catch {
      entry = { raw: line };
    }
    lines.push({ entry, cursor: from + lineStart });
  }

  return { lines, cursor: from + lineStart, reset };
}

function logSize(logPath: string): number {
  try {
    return statSync(logPath).size;
  } catch {
    return 0;
  }
}

function parseCursor(raw: string): number | null {
  const cursor = Number.parseInt(raw, 10);
  return Number.isNaN(cursor) || cursor < 0 ? null : cursor;
}

// ── Log stream (server-sent events) ─────────────────────────────

// The log file is the source of truth: the stream tails it, so it carries
// the same entries and the same cursors as GET /logs.
const LOG_STREAM_INTERVAL_MS = 250;

function sseEvent(event: string, data: unknown, id?: number): string {
  const idLine = id === undefined ? "" : `id: ${id}\n`;
  return `${idLine}event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
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
    logStart: 0,
    serve: null,
    lastBuild: null,
    buildRunning: false,
  };

  const siteLogger = (rootDir: string, command: string) =>
    createProjectLogger(rootDir, `webette.api.${command}`, verbose, toolEnv);

  const logPathFor = (rootDir: string) =>
    path.join(rootDir, toolEnv.logging.dirName, "logs.jsonl");

  function activateSite(rootDir: string) {
    if (state.activeSite === rootDir) return;
    state.logStart = logSize(logPathFor(rootDir));
    state.activeSite = rootDir;
  }

  // Open log streams, so stop() can end them.
  const logStreams = new Set<() => void>();

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
    activateSite(rootDir);
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
      outputDir: path.join(rootDir, toolEnv.build.outputDirName),
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

    // Active before the first build, so its logs can be followed as they come.
    activateSite(rootDir);
    const logger = await siteLogger(rootDir, "serve");
    try {
      const handle = await serve(rootDir, { verbose, ...serveOptions }, logger);
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
    const since = parseCursor(url.searchParams.get("since") ?? "0");
    if (since === null) {
      return fail("invalid_cursor", '"since" must be a non-negative integer (byte offset).', 400);
    }

    const { lines, cursor, reset } = await readLogsSince(logPathFor(state.activeSite), since);
    return ok({ entries: lines.map((line) => line.entry), cursor, reset });
  }

  function handleLogStream(req: Request, url: URL): Response {
    // EventSource sends back the last id it received when it reconnects.
    const sinceRaw = url.searchParams.get("since") ?? req.headers.get("last-event-id");
    const since = sinceRaw === null ? null : parseCursor(sinceRaw);
    if (sinceRaw !== null && since === null) {
      return fail("invalid_cursor", '"since" must be a non-negative integer (byte offset).', 400);
    }

    // Without a cursor, only what is written from now on is sent.
    let site = state.activeSite;
    let cursor = since ?? (site ? logSize(logPathFor(site)) : 0);
    let reading = false;
    let close = () => {};
    const encoder = new TextEncoder();

    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        const send = (text: string) => controller.enqueue(encoder.encode(text));

        const tick = async () => {
          if (reading) return;
          reading = true;
          try {
            if (state.activeSite !== site) {
              const first = site === null;
              site = state.activeSite;
              cursor = state.logStart;
              if (!first) send(sseEvent("reset", { site }));
            }
            if (!site) return;
            const chunk = await readLogsSince(logPathFor(site), cursor);
            if (chunk.reset) send(sseEvent("reset", { site }));
            for (const line of chunk.lines) {
              send(sseEvent("log", line.entry, line.cursor));
            }
            cursor = chunk.cursor;
          } catch {
            // The client left between two reads: close() already ran.
          } finally {
            reading = false;
          }
        };

        const timer = setInterval(tick, LOG_STREAM_INTERVAL_MS);
        close = () => {
          clearInterval(timer);
          if (!logStreams.delete(close)) return;
          try {
            controller.close();
          } catch {
            // Already closed by the client.
          }
        };
        logStreams.add(close);
        req.signal.addEventListener("abort", close);

        // A first comment line makes the response start right away.
        send(": webette logs\n\n");
        void tick();
      },
      cancel() {
        close();
      },
    });

    return new Response(body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  }

  const server = Bun.serve({
    hostname: "127.0.0.1",
    port,
    // Synchronous builds can be slow on large sites; avoid idle disconnects.
    idleTimeout: 255,
    async fetch(req, server) {
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
          case "GET /logs/stream":
            // A stream stays open as long as the client listens.
            server.timeout(req, 0);
            response = handleLogStream(req, url);
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
      for (const close of [...logStreams]) close();
      await server.stop(true);
      scoped.info("api.stopped", { port: boundPort });
    },
  };
}
