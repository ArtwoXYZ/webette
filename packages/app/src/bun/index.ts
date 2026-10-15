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
import { normalizeLocale, type Locale } from "../shared/locale";

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
// Whether the window has asked for the interface yet (read by the self-check).
let uiRequested = false;
const uiServer = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  async fetch(req) {
    const pathname = decodeURIComponent(new URL(req.url).pathname);
    if (pathname === "/main/index.html") uiRequested = true;
    const target = path.normalize(path.join(viewsDir, pathname));
    if (!target.startsWith(path.normalize(viewsDir) + path.sep)) {
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
// but cwd stays at the project root (packages/app): the repository's
// tutorial is used as it is. A packaged app carries it as an archive
// (see electrobun.config.ts). Building writes next to the site and the
// app folder may be read-only, so the archive is unpacked once to the
// app's user data folder: the tutorial then keeps whatever the person
// changes in it.

function isSite(dir: string): boolean {
  return fs.existsSync(path.join(dir, "webette.config.ts"));
}

// Asked by the window and by the self-check, possibly at the same time:
// unpack once, and let every caller wait for that same unpacking.
let tutorialLookup: Promise<string | null> | null = null;

function resolveTutorialDir(): Promise<string | null> {
  tutorialLookup ??= findOrUnpackTutorial();
  return tutorialLookup;
}

async function findOrUnpackTutorial(): Promise<string | null> {
  const repoCandidates = [
    path.resolve(process.cwd(), "tutorial"),
    path.resolve(import.meta.dir, "../../../../../../tutorial"),
  ];
  const fromRepo = repoCandidates.find(isSite);
  if (fromRepo) return fromRepo;

  const archive = path.resolve(import.meta.dir, "../tutorial.tar");
  if (!fs.existsSync(archive)) return null;
  const copy = path.join(Utils.paths.userData, "tutorial");
  if (!isSite(copy)) {
    await new Bun.Archive(await Bun.file(archive).bytes()).extract(copy);
    logger.info(`Tutorial unpacked to ${copy}`);
  }
  return copy;
}

// ── Persistent app state ────────────────────────────────────────

const MAX_RECENT_FOLDERS = 5;
const appStatePath = path.join(Utils.paths.userData, "app-state.json");

interface AppState {
  recentFolders: string[];
  locale: Locale;
}

function loadStoredState(): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(fs.readFileSync(appStatePath, "utf8"));
    return value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function loadAppState(): AppState {
  const stored = loadStoredState();
  const folders = Array.isArray(stored.recentFolders)
    ? stored.recentFolders
        .filter((folder): folder is string => typeof folder === "string")
        .slice(0, MAX_RECENT_FOLDERS)
    : [];
  const locale =
    stored.locale === "en" || stored.locale === "fr"
      ? stored.locale
      : normalizeLocale(Intl.DateTimeFormat().resolvedOptions().locale);
  return { recentFolders: folders, locale };
}

function updateAppState(patch: Partial<AppState>): AppState {
  const next = { ...loadAppState(), ...patch };
  fs.mkdirSync(path.dirname(appStatePath), { recursive: true });
  fs.writeFileSync(
    appStatePath,
    JSON.stringify({ ...loadStoredState(), ...next }, null, 2)
  );
  return next;
}

function rememberRecentFolder(folder: string): string[] {
  const current = loadAppState();
  const recentFolders = [
    folder,
    ...current.recentFolders.filter((recent) => recent !== folder),
  ].slice(0, MAX_RECENT_FOLDERS);
  return updateAppState({ recentFolders }).recentFolders;
}

// ── Actions outside the app ─────────────────────────────────────
// The UI can ask for two things that leave the window: a web page in
// the browser and a folder in the file explorer. Nothing else: no other
// link scheme, and no file, since opening a file would launch whatever
// program is tied to it.

function openWebPage(url: string): boolean {
  let protocol: string;
  try {
    protocol = new URL(url).protocol;
  } catch {
    return false;
  }
  if (protocol !== "http:" && protocol !== "https:") return false;
  return Utils.openExternal(url);
}

function openFolder(folder: string): boolean {
  try {
    if (!fs.statSync(folder).isDirectory()) return false;
  } catch {
    return false;
  }
  return Utils.openPath(folder);
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
        response: {
          tutorialDir: string | null;
          recentFolders: string[];
          locale: Locale;
        };
      };
      pickFolder: { params: undefined; response: string | null };
      rememberRecentFolder: { params: { path: string }; response: string[] };
      setLocale: { params: { locale: Locale }; response: Locale };
      openExternal: { params: { url: string }; response: boolean };
      openPath: { params: { path: string }; response: boolean };
      closeWindow: { params: undefined; response: boolean };
      getWindowFrame: {
        params: undefined;
        response: { x: number; y: number; width: number; height: number };
      };
      setWindowFrame: {
        params: { x: number; y: number; width: number; height: number };
        response: boolean;
      };
    };
    messages: Record<never, never>;
  };
  webview: {
    requests: Record<never, never>;
    messages: Record<never, never>;
  };
};

let closeWindow = (): void => {};
let getWindowFrame = () => ({ x: 0, y: 0, width: 1100, height: 750 });
let setWindowFrame = (_frame: {
  x: number;
  y: number;
  width: number;
  height: number;
}): void => {};

// What the window asked for, reported by the self-check: tells a window
// that never started its interface from one that just did not repaint.
const windowRequests: string[] = [];

const rpc = defineElectrobunRPC<AppRPC>("bun", {
  handlers: {
    requests: {
      apiFetch: async (params: unknown) => {
        const { path: apiPath, method, body } = params as {
          path: string;
          method?: string;
          body?: string;
        };
        windowRequests.push(`api ${method ?? "GET"} ${apiPath}`);
        const response = await fetch(`${apiBase}${apiPath}`, {
          method: method ?? "GET",
          headers: body ? { "Content-Type": "application/json" } : undefined,
          body,
        });
        return { status: response.status, body: await response.text() };
      },
      getBootstrap: async () => {
        windowRequests.push("getBootstrap");
        const state = loadAppState();
        return { tutorialDir: await resolveTutorialDir(), ...state };
      },
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
      setLocale: (params: unknown) =>
        updateAppState({
          locale: normalizeLocale((params as { locale: string }).locale),
        }).locale,
      openExternal: (params: unknown) =>
        openWebPage((params as { url: string }).url),
      openPath: (params: unknown) =>
        openFolder((params as { path: string }).path),
      closeWindow: () => {
        setTimeout(closeWindow, 0);
        return true;
      },
      getWindowFrame: () => getWindowFrame(),
      setWindowFrame: (params: unknown) => {
        setWindowFrame(
          params as { x: number; y: number; width: number; height: number }
        );
        return true;
      },
    },
  },
});

// Windows and macOS show the console as an object of its own: no system
// title bar, a power button to close it, edges to resize it. Linux keeps
// its window manager's frame, which the console cannot replace reliably.
const isFrameless = process.platform === "win32" || process.platform === "darwin";
const win = new BrowserWindow({
  title: "Webette",
  frame: { x: 100, y: 100, width: 1100, height: 750 },
  url: `http://127.0.0.1:${uiServer.port}/main/index.html${isFrameless ? "?frameless=1" : ""}`,
  titleBarStyle: isFrameless ? "hidden" : "default",
  transparent: isFrameless,
  passthrough: false,
  rpc,
});
closeWindow = () => win.close();
getWindowFrame = () => win.getFrame();
setWindowFrame = ({ x, y, width, height }) =>
  win.setFrame(x, y, width, height);

// Graceful shutdown: stop an active serve + the API before the
// default exit-on-last-window-closed kicks in.
win.on("close", () => {
  uiServer.stop(true);
  void api.stop();
});

// ── Self-check ──────────────────────────────────────────────────
// Set by `scripts/check-app.ts` on a freshly packaged app: once the
// window shows the interface, build the tutorial through the engine
// API, write what happened to the given file, and quit once the check
// has taken its screenshot and removed that file (or after a minute).

const selfCheckFile = process.env.WEBETTE_APP_SELF_CHECK;
if (selfCheckFile) {
  void runSelfCheck(selfCheckFile);
}

async function runSelfCheck(resultFile: string): Promise<void> {
  const result: Record<string, unknown> = { uiLoaded: false };
  try {
    const deadline = Date.now() + 60_000;
    while (!uiRequested && Date.now() < deadline) await Bun.sleep(250);
    result.uiLoaded = uiRequested;

    const tutorialDir = await resolveTutorialDir();
    result.tutorialDir = tutorialDir;
    if (tutorialDir) {
      const response = await fetch(`${apiBase}/build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rootDir: tutorialDir }),
      });
      const build = (await response.json()) as {
        data?: { ok: boolean; outputDir: string };
      };
      result.build = build;
      result.homePageBuilt =
        build.data?.ok === true &&
        fs.existsSync(path.join(build.data.outputDir, "index.html"));
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }
  result.windowRequests = windowRequests;
  fs.writeFileSync(resultFile, JSON.stringify(result, null, 2));
  const deadline = Date.now() + 60_000;
  while (fs.existsSync(resultFile) && Date.now() < deadline) await Bun.sleep(250);
  Utils.quit();
}
