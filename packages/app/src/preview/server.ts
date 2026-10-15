/**
 * Browser preview of the desktop app UI.
 *
 *   bun run preview:app [--host <address>] [--port <n>]
 *
 * Serves `src/web` to a plain browser and answers the requests the UI
 * normally sends to the Electrobun main process, with the real engine
 * API running in this process. It exists for machines without a desktop
 * session and for remote previews; it is a dev tool, never shipped.
 *
 * The UI bundle is rebuilt on every page load, so a refresh shows the
 * current sources. The only difference with the desktop bundle is the
 * host module: `./host` resolves to `host.preview.ts`.
 *
 * Binds to 127.0.0.1 unless told otherwise. Anyone who can reach this
 * server can build and serve folders of this machine through the engine
 * API: only pass `--host` on a network you trust. With `--host`, served
 * sites are shared on the network too, so the remote browser can open
 * them.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { BunPlugin } from "bun";
import { startApiServer, Logger } from "webette";
import { normalizeLocale, type Locale } from "../shared/locale";

const DEFAULT_PREVIEW_PORT = 4178;
const MAX_RECENT_FOLDERS = 5;

const webDir = path.resolve(import.meta.dir, "../web");
const tutorialDir = path.resolve(import.meta.dir, "../../tutorial");

function readOption(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

const hostname = readOption("host") ?? "127.0.0.1";
const shared = hostname !== "127.0.0.1" && hostname !== "localhost";
const port = Number(readOption("port") ?? DEFAULT_PREVIEW_PORT);

// ── Engine API (in-process, like the desktop app) ───────────────

const logger = new Logger({
  scope: "webette.preview",
  locale: "en",
  minLevel: "info",
  compact: true,
});

const api = await startApiServer({ port: 0 }, logger);
const apiBase = `http://127.0.0.1:${api.port}`;

// ── App state ───────────────────────────────────────────────────
// Kept in memory: a preview starts fresh every time and never touches
// the desktop app's saved state.

let recentFolders: string[] = [];
let locale: Locale = normalizeLocale(
  Intl.DateTimeFormat().resolvedOptions().locale
);

// A preview opened from another machine needs the served site to be
// reachable from there as well: ask the engine to share it.
function shareServe(body: string): string {
  const request = JSON.parse(body) as { options?: Record<string, unknown> };
  return JSON.stringify({
    ...request,
    options: { ...request.options, share: true },
  });
}

// ── Host requests ───────────────────────────────────────────────
// Only the requests that need this machine land here; the rest is
// answered in the browser by `host.preview.ts`.

const hostRequests: Record<string, (params: unknown) => unknown> = {
  apiFetch: async (params) => {
    const { path: apiPath, method, body } = params as {
      path: string;
      method?: string;
      body?: string;
    };
    const response = await fetch(`${apiBase}${apiPath}`, {
      method: method ?? "GET",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: shared && apiPath === "/serve" && body ? shareServe(body) : body,
    });
    return { status: response.status, body: await response.text() };
  },
  getBootstrap: () => ({
    tutorialDir: fs.existsSync(path.join(tutorialDir, "webette.config.ts"))
      ? tutorialDir
      : null,
    recentFolders,
    locale,
  }),
  rememberRecentFolder: (params) => {
    const folder = (params as { path: string }).path;
    recentFolders = [
      folder,
      ...recentFolders.filter((recent) => recent !== folder),
    ].slice(0, MAX_RECENT_FOLDERS);
    return recentFolders;
  },
  setLocale: (params) => {
    locale = normalizeLocale((params as { locale: string }).locale);
    return locale;
  },
};

// ── UI bundle ───────────────────────────────────────────────────

const usePreviewHost: BunPlugin = {
  name: "webette-preview-host",
  setup(build) {
    build.onResolve({ filter: /^\.\/host$/ }, () => ({
      path: path.join(webDir, "host.preview.ts"),
    }));
  },
};

async function bundleUi(): Promise<Response> {
  const result = await Bun.build({
    entrypoints: [path.join(webDir, "index.ts")],
    target: "browser",
    plugins: [usePreviewHost],
    throw: false,
  });
  const output = result.outputs[0];
  if (!result.success || !output) {
    const details = result.logs.map((log) => String(log)).join("\n");
    console.error(details);
    // Surface the failure where the developer is looking: the page.
    return new Response(
      `document.body.textContent = ${JSON.stringify(`UI bundle failed:\n${details}`)};`,
      { headers: { "Content-Type": "text/javascript" } }
    );
  }
  return new Response(output, {
    headers: { "Content-Type": "text/javascript", "Cache-Control": "no-store" },
  });
}

// ── HTTP server ─────────────────────────────────────────────────

const server = Bun.serve({
  hostname,
  port,
  // Builds and serve startups can be slow on big sites.
  idleTimeout: 255,
  async fetch(req) {
    const pathname = decodeURIComponent(new URL(req.url).pathname);

    if (pathname.startsWith("/__host/")) {
      const handler = hostRequests[pathname.slice("/__host/".length)];
      if (!handler || req.method !== "POST") {
        return new Response("Unknown host request", { status: 404 });
      }
      return Response.json(await handler(await req.json()));
    }

    if (pathname === "/") return Response.redirect("/index.html");
    if (pathname === "/index.js") return bundleUi();

    const target = path.normalize(path.join(webDir, pathname));
    if (!target.startsWith(webDir + path.sep)) {
      return new Response("Forbidden", { status: 403 });
    }
    const file = Bun.file(target);
    if (!(await file.exists())) {
      return new Response("Not found", { status: 404 });
    }
    return new Response(file, { headers: { "Cache-Control": "no-store" } });
  },
});

console.log(`webette app preview: http://${server.hostname}:${server.port}/`);
console.log("Add ?frameless=1 to see the frameless (Windows and macOS) layout.");

process.on("SIGINT", () => {
  server.stop(true);
  void api.stop().finally(() => process.exit(0));
});
