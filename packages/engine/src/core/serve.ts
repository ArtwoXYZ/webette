/**
 * Dev server (`serve`): rebuilds on change and serves `_public/`.
 */

import * as path from "node:path";
import { stat } from "node:fs/promises";
import { watch, type FSWatcher } from "node:fs";

import { getEnv } from "../config/env";
import { build } from "./build";
import type { BuildOptions } from "./build";
import type { Logger } from "../logging/logger";
import { resolveTemplatesRoots } from "./templates/engine";
import { createSite } from "../config/site";
import { resolveTemplatesConfig } from "./templates/config";

export interface ServeOptions extends BuildOptions { }

export interface ServeHandle {
  port: number;
  /** Stops the HTTP server and closes all file watchers. Idempotent. */
  stop(): Promise<void>;
}

export async function serve(
  rootDir: string,
  options: ServeOptions,
  logger: Logger
): Promise<ServeHandle> {
  const scoped = logger.child("serve");
  const { env: toolEnv } = await getEnv();
  const site = await createSite(rootDir, scoped);
  const { siteTemplatesRoot } = resolveTemplatesConfig(
    toolEnv.templates,
    site.config?.templates
  );
  const port = toolEnv.serve.port;
  let buildVersion = Date.now().toString();
  const outputDir = path.join(rootDir, toolEnv.build.outputDirName);
  const { siteTemplatesRoot: templatesRoot } =
    await resolveTemplatesRoots({
      rootDir,
      templatesRoot: toolEnv.templates.root,
      siteTemplatesRoot,
      logger: scoped,
    });
  const notFoundPath = path.join(outputDir, "404.html");

  scoped.info("serve.initialBuild", { rootDir });

  await build(
    rootDir,
    { ...options, liveReload: true, quiet: true },
    logger
  );

  buildVersion = Date.now().toString();
  scoped.debug("serve.initialBuildDone", { version: buildVersion });

  // 2. HTTP Server
  try {
    const server = Bun.serve({
      port,
      async fetch(req) {
        const url = new URL(req.url);

        if (url.pathname === "/__webette-version") {
          return new Response(buildVersion, {
            headers: { "Cache-Control": "no-store" },
          });
        }

        const requestedPath =
          url.pathname === "/" ? "/index.html" : url.pathname;

        const filePath = path.join(outputDir, requestedPath);

        try {
          const fileStat = await stat(filePath);
          if (fileStat.isDirectory()) {
            const indexPath = path.join(filePath, "index.html");
            return new Response(Bun.file(indexPath));
          }
          return new Response(Bun.file(filePath));
        } catch {
          try {
            const notFoundStat = await stat(notFoundPath);
            if (notFoundStat.isFile()) {
              return new Response(Bun.file(notFoundPath), {
                status: 404,
                headers: { "Content-Type": "text/html; charset=utf-8" },
              });
            }
          } catch {
            // fall through to plain text 404
          }
          return new Response("Not found", { status: 404 });
        }
      },
    });

    scoped.info("serve.listening", {
      url: `http://localhost:${port}`,
      port,
      rootDir,
    });

    const watchLogger = scoped.child("watch");

    const collectSegments = (p: string | undefined) =>
      (p ?? "")
        .split(/[\\/]/)
        .map((s) => s.trim())
        .filter(Boolean);

    const ignoreNames = new Set<string>([
      ...collectSegments(toolEnv.build.outputDirName),
      ...collectSegments(toolEnv.logging.dirName),
      ...collectSegments(path.join(toolEnv.build.outputDirName, "_model")),
    ]);

    const shouldIgnore = (name: string) => {
      const parts = name.split(/[\\/]/).filter(Boolean);
      if (parts.some((part) => ignoreNames.has(part))) return true;

      // Also ignore anything inside the absolute output or logging directories
      const fullPath = path.join(rootDir, name);
      const normalized = path.normalize(fullPath);
      const outputNormalized = path.normalize(outputDir);
      const loggingNormalized = path.normalize(path.join(rootDir, toolEnv.logging.dirName));
      const exportNormalized = path.normalize(path.join(outputDir, "_model"));

      return (
        normalized.startsWith(outputNormalized + path.sep) ||
        normalized === outputNormalized ||
        normalized.startsWith(exportNormalized + path.sep) ||
        normalized === exportNormalized ||
        normalized.startsWith(loggingNormalized + path.sep) ||
        normalized === loggingNormalized
      );
    };

    let rebuildTimer: ReturnType<typeof setTimeout> | null = null;

    let rebuildRunning = false;
    let rebuildPending = false;
    let stopped = false;

    const runRebuild = async () => {
      // Serialize rebuilds: never run two builds concurrently.
      if (stopped) return;
      if (rebuildRunning) {
        rebuildPending = true;
        return;
      }

      rebuildRunning = true;

      try {
        // Coalesce multiple file events into as few builds as possible.
        do {
          rebuildPending = false;

          await build(
            rootDir,
            { ...options, liveReload: true, quiet: true },
            logger
          );

          buildVersion = Date.now().toString();

          watchLogger.info("serve.rebuildSuccess", {
            version: buildVersion,
          });
        } while (rebuildPending);
      } catch (err) {
        watchLogger.error("serve.rebuildError", {
          error: String(err),
        });
      } finally {
        rebuildRunning = false;
      }
    };

    const scheduleRebuild = () => {
      if (stopped) return;
      if (rebuildTimer) clearTimeout(rebuildTimer);

      rebuildTimer = setTimeout(() => {
        void runRebuild();
      }, toolEnv.serve.watcherDebounceMs);
    };

    const watchPaths = new Set<string>([rootDir]);
    if (path.normalize(templatesRoot) !== path.normalize(rootDir)) {
      watchPaths.add(templatesRoot);
    }

    const lastMtime = new Map<string, number>();

    // 3. File watchers (site root + fallback templates)
    const watchers: FSWatcher[] = [];
    for (const watchPath of watchPaths) {
      const watcher = watch(
        watchPath,
        { recursive: true },
        async (eventType, filename) => {
          const name = filename?.toString() ?? "";

          if (!name) {
            watchLogger.debug("serve.watchEvent", {
              eventType,
              filename: "<unknown>",
              base: watchPath,
            });
            if (rebuildRunning) {
              rebuildPending = true;
            }
            scheduleRebuild();
            return;
          }
          if (shouldIgnore(name)) return;

          const fullPath = path.join(watchPath, name);
          try {
            const s = await stat(fullPath);
            const prev = lastMtime.get(fullPath);
            lastMtime.set(fullPath, s.mtimeMs);
            if (prev != null && prev === s.mtimeMs) {
              return; // ignore pure atime changes
            }
          } catch {
            // ignore stat errors (deleted files etc.)
          }

          watchLogger.debug("serve.watchEvent", {
            eventType,
            filename: name,
            base: watchPath,
          });

          if (rebuildRunning) {
            rebuildPending = true;
          }

          scheduleRebuild();
        }
      );
      watchers.push(watcher);
    }

    watchLogger.debug("serve.watchReady", { rootDir, templatesRoot });

    scoped.info("serve.stopHint");

    return {
      port,
      async stop() {
        if (stopped) return;
        stopped = true;

        if (rebuildTimer) {
          clearTimeout(rebuildTimer);
          rebuildTimer = null;
        }
        for (const watcher of watchers) {
          watcher.close();
        }
        await server.stop(true);

        scoped.info("serve.stopped", { port });
      },
    };
  } catch (error) {
    const normalizedError =
      error instanceof Error &&
        /^Failed to start server\. Is port \d+ in use\?$/.test(error.message)
        ? (() => {
          // Bun can throw a generic message with a stale hardcoded port number.
          error.message = `Failed to start server. Is port ${port} in use?`;
          return error;
        })()
        : error;

    const errorMessage =
      normalizedError instanceof Error ? normalizedError.message : String(normalizedError);
    const looksLikePortInUse =
      normalizedError instanceof Error &&
      (errorMessage.includes("EADDRINUSE") ||
        /^Failed to start server\. Is port \d+ in use\?$/.test(errorMessage));

    if (looksLikePortInUse) {
      scoped.error("serve.portInUse", {
        port: port,
        error: errorMessage,
      });
      console.error(`\n${"=".repeat(60)}`);
      console.error(`ERROR: Port ${port} is already in use!`);
      console.error("\nPossible solutions:");
      console.error(`  1. Kill the process using port ${port}`);
      console.error("  2. Change the port in webette.tool.ts (or src/config/env.ts default)");
      console.error("  3. Wait for the port to be freed");
      console.error(`${"=".repeat(60)}\n`);
    } else {
      scoped.error("serve.startFailed", {
        error: errorMessage,
        stack: normalizedError instanceof Error ? normalizedError.stack : undefined,
      });
    }
    throw normalizedError;
  }
}
