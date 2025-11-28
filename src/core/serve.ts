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
    return parts.some((part) => ignoreNames.has(part));
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

  // 3. File watchers (site root + fallback templates)
  for (const watchPath of watchPaths) {
    watch(
      watchPath,
      { recursive: true },
      (eventType, filename) => {
        const name = filename?.toString() ?? "";

        if (!name || shouldIgnore(name)) return;

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
