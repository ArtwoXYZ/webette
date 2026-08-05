import "./env";
import {
  BrowserWindow,
  Utils,
  defineElectrobunRPC,
  type ElectrobunRPCSchema,
} from "electrobun/bun";
import * as fs from "node:fs";
import * as path from "node:path";
import { startApiServer, Logger, type ApiHandle } from "webette";

// ── Engine API (in-process) ─────────────────────────────────────
// The engine API runs inside the main process: no child process to
// babysit, no orphan risk — when the app dies, the API (and any
// active serve) dies with it. Port 0 lets the OS pick a free port,
// so we never clash with a CLI-launched `webette api` (4177).

const logger = new Logger({
  scope: "webette.app",
  locale: "en",
  minLevel: "info",
  compact: true,
});

const api: ApiHandle = await startApiServer({ port: 0 }, logger);
const apiBase = `http://127.0.0.1:${api.port}`;

// ── UI static server ────────────────────────────────────────────
// Workaround for an electrobun bug on Windows: the views:// scheme
// handler only knows js/css/png MIME types and serves everything
// else (svg, woff2…) as text/html, which breaks the whole design.
// Serving the built views folder over localhost HTTP gives correct
// MIME types (Bun.file) and dies with the process like the API.

function resolveViewsDir(): string {
  const candidates = [
    path.resolve(import.meta.dir, "../views"),
    path.resolve(process.cwd(), "../Resources/app/views"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "main", "index.html"))) {
      return candidate;
    }
  }
  throw new Error("Cannot locate the app views folder");
}

const viewsDir = resolveViewsDir();
const uiServer = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  async fetch(req) {
    const pathname = decodeURIComponent(new URL(req.url).pathname);
    const target = path.normalize(path.join(viewsDir, pathname));
    if (!target.startsWith(path.normalize(viewsDir))) {
      return new Response("Forbidden", { status: 403 });
    }
    const file = Bun.file(target);
    if (!(await file.exists())) {
      return new Response("Not found", { status: 404 });
    }
    return new Response(file);
  },
});

// ── Tutorial site resolution ────────────────────────────────────
// `electrobun dev` runs the bundle from build/…/Resources/app/bun,
// but cwd stays at the project root (packages/app). Try both.

function resolveTutorialDir(): string | null {
  const candidates = [
    path.resolve(process.cwd(), "tutorial"),
    path.resolve(import.meta.dir, "../../../../../../tutorial"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "webette.config.ts"))) {
      return candidate;
    }
  }
  return null;
}

// ── Recent folders ──────────────────────────────────────────────

const MAX_RECENT_FOLDERS = 5;
const appStatePath = path.join(Utils.paths.userData, "app-state.json");

function loadRecentFolders(): string[] {
  try {
    const value: unknown = JSON.parse(fs.readFileSync(appStatePath, "utf8"));
    if (!value || typeof value !== "object") return [];
    const folders = (value as { recentFolders?: unknown }).recentFolders;
    if (!Array.isArray(folders)) return [];
    return folders
      .filter((folder): folder is string => typeof folder === "string")
      .slice(0, MAX_RECENT_FOLDERS);
  } catch {
    return [];
  }
}

function rememberRecentFolder(folder: string): string[] {
  const recentFolders = [
    folder,
    ...loadRecentFolders().filter((recent) => recent !== folder),
  ].slice(0, MAX_RECENT_FOLDERS);
  fs.mkdirSync(path.dirname(appStatePath), { recursive: true });
  fs.writeFileSync(appStatePath, JSON.stringify({ recentFolders }, null, 2));
  return recentFolders;
}

// ── RPC bridge ──────────────────────────────────────────────────
// The webview cannot fetch 127.0.0.1 directly (views:// origin,
// CORS); the bun process proxies API calls instead.

type AppRPC = ElectrobunRPCSchema & {
  bun: {
    requests: {
      apiFetch: {
        params: { path: string; method?: string; body?: string };
        response: { status: number; body: string };
      };
      getBootstrap: {
        params: undefined;
        response: { tutorialDir: string | null; recentFolders: string[] };
      };
      pickFolder: { params: undefined; response: string | null };
      rememberRecentFolder: { params: { path: string }; response: string[] };
      openExternal: { params: { url: string }; response: boolean };
      openPath: { params: { path: string }; response: boolean };
    };
    messages: Record<never, never>;
  };
  webview: {
    requests: Record<never, never>;
    messages: Record<never, never>;
  };
};

const rpc = defineElectrobunRPC<AppRPC>("bun", {
  handlers: {
    requests: {
      apiFetch: async (params: unknown) => {
        const { path: apiPath, method, body } = params as {
          path: string;
          method?: string;
          body?: string;
        };
        const response = await fetch(`${apiBase}${apiPath}`, {
          method: method ?? "GET",
          headers: body ? { "Content-Type": "application/json" } : undefined,
          body,
        });
        return { status: response.status, body: await response.text() };
      },
      getBootstrap: () => ({
        tutorialDir: resolveTutorialDir(),
        recentFolders: loadRecentFolders(),
      }),
      pickFolder: async () => {
        const picked = await Utils.openFileDialog({
          canChooseFiles: false,
          canChooseDirectory: true,
          allowsMultipleSelection: false,
        });
        return picked[0] ?? null;
      },
      rememberRecentFolder: (params: unknown) =>
        rememberRecentFolder((params as { path: string }).path),
      openExternal: (params: unknown) =>
        Utils.openExternal((params as { url: string }).url),
      openPath: (params: unknown) =>
        Utils.openPath((params as { path: string }).path),
    },
  },
});

const win = new BrowserWindow({
  title: "Webette",
  frame: { x: 100, y: 100, width: 1100, height: 750 },
  url: `http://127.0.0.1:${uiServer.port}/main/index.html`,
  rpc,
});

// The initial webview layout on Windows is computed before the
// native container settles (title bar offset); nudging the size
// forces a proper re-layout, like a manual resize does.
setTimeout(() => {
  win.setSize(1101, 750);
  setTimeout(() => win.setSize(1100, 750), 50);
}, 600);

// Graceful shutdown: stop an active serve + the API before the
// default exit-on-last-window-closed kicks in.
win.on("close", () => {
  uiServer.stop(true);
  void api.stop();
});
