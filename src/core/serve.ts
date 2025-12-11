import * as path from "node:path";
import { stat } from "node:fs/promises";
import { watch } from "node:fs";

import { getEnv } from "../config/env";
import { build } from "./build";
import type { BuildOptions } from "./build";
import type { Logger } from "../logging/logger";

export interface ServeOptions extends BuildOptions {}

function keepProcessAlive() {
  return new Promise<void>(() => {});
}

export async function serve(
  rootDir: string,
  options: ServeOptions,
  logger: Logger
): Promise<void> {
  const scoped = logger.child("serve");
  const toolEnv = await getEnv();
  const port = toolEnv.serve.port;
  let buildVersion = Date.now().toString();
  const outputDir = path.join(rootDir, toolEnv.build.outputDirName);
  const templatesRoot = path.isAbsolute(toolEnv.templates.root)
    ? toolEnv.templates.root
    : path.join(process.cwd(), toolEnv.templates.root);
  const notFoundPath = path.join(outputDir, "404.html");

  // 1. Initial build with liveReload = true, in quiet mode
  scoped.info("serve.initialBuild", { rootDir });

  await build(
    rootDir,
    { ...options, liveReload: true, quiet: true },
    logger
  );

  buildVersion = Date.now().toString();
  scoped.debug("serve.initialBuildDone", { version: buildVersion });

  // 2. HTTP Server
  Bun.serve({
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

  // Info level: server is ready
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
    ...collectSegments(toolEnv.build.exportModel.dir),
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

  const scheduleRebuild = () => {
    if (rebuildTimer) clearTimeout(rebuildTimer);

    rebuildTimer = setTimeout(() => {
      build(
        rootDir,
        { ...options, liveReload: true, quiet: true },
        logger
      )
        .then(() => {
          buildVersion = Date.now().toString();

          watchLogger.info("serve.rebuildSuccess", {
            version: buildVersion,
          });
        })
        .catch((err) => {
          watchLogger.error("serve.rebuildError", {
            error: String(err),
          });
        });
    }, toolEnv.serve.watcherDebounceMs);
  };

  const watchPaths = new Set<string>([rootDir]);
  if (path.normalize(templatesRoot) !== path.normalize(rootDir)) {
    watchPaths.add(templatesRoot);
  }

  const lastMtime = new Map<string, number>();

  // 3. File watchers (site root + fallback templates)
  for (const watchPath of watchPaths) {
    watch(
      watchPath,
      { recursive: true },
      async (eventType, filename) => {
        const name = filename?.toString() ?? "";

        if (!name || shouldIgnore(name)) return;

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

        scheduleRebuild();
      }
    );
  }

  // "watch ready" message -> debug
  watchLogger.debug("serve.watchReady", { rootDir, templatesRoot });

  // Final "Ctrl+C" hint -> info
  scoped.info("serve.stopHint");

  await keepProcessAlive();
}
