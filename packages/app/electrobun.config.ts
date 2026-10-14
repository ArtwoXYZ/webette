import * as fs from "node:fs";
import * as path from "node:path";
import type { ElectrobunConfig } from "electrobun/bun";
import packageJson from "./package.json";

// sharp's JavaScript is bundled into the main process, but its native
// binaries cannot be: at runtime sharp requires `@img/sharp-<platform>`
// by name, from wherever the bundle sits. Isolated installs keep those
// packages out of reach of `packages/app`, so they are copied next to
// the bundle (`Resources/app/node_modules/@img`), where that lookup
// finds them in dev and in a packaged app alike.
//
// Only the binaries installed on the build machine are copied: an app
// must be built on the platform it targets.
function sharpNativePackages(): Record<string, string> {
  // Plain folder walk, as Node would resolve it from the engine. (Asking
  // Bun's resolver here makes the Electrobun CLI lose track of `webette`.)
  const engineDir = path.join(import.meta.dir, "node_modules", "webette");
  if (!fs.existsSync(engineDir)) return {};
  let dir = fs.realpathSync(engineDir);
  let sharpDir: string | null = null;
  while (sharpDir === null) {
    const candidate = path.join(dir, "node_modules", "sharp");
    if (fs.existsSync(candidate)) sharpDir = fs.realpathSync(candidate);
    else if (path.dirname(dir) === dir) break;
    else dir = path.dirname(dir);
  }
  // sharp is optional for the engine: without it the app still builds
  // sites, and the engine logs that images are copied as they are.
  if (sharpDir === null) return {};

  // sharp's platform packages are installed as its siblings.
  const scopeDir = path.join(sharpDir, "..", "@img");
  if (!fs.existsSync(scopeDir)) return {};

  const copies: Record<string, string> = {};
  for (const name of fs.readdirSync(scopeDir)) {
    if (!name.startsWith("sharp-")) continue;
    // The app's Bun is a glibc build: the musl binaries would never load,
    // and one of their paths is too long for the Linux installer.
    if (name.includes("linuxmusl")) continue;
    const source = path.relative(import.meta.dir, path.join(scopeDir, name));
    copies[source] = `node_modules/@img/${name}`;
  }
  return copies;
}

// The tutorial site travels inside a packaged app as one archive, made by
// `scripts/package-app.ts`; the app unpacks it to its user data folder (see
// resolveTutorialDir). Copied as a folder, its accented file names make
// Electrobun 1.x fail when it hashes the bundle. `electrobun dev` reads the
// repository's tutorial instead.
function tutorialArchive(): Record<string, string> {
  const packaging = process.argv.some((arg) => arg === "--env=stable" || arg === "--env=canary");
  const archive = "build/tutorial.tar";
  return packaging && fs.existsSync(path.join(import.meta.dir, archive))
    ? { [archive]: "tutorial.tar" }
    : {};
}

export default {
  app: {
    name: "Webette",
    identifier: "org.webette.desktop",
    // The app and the engine are released together, under one version.
    version: packageJson.version,
  },
  build: {
    // One source image per system, in `icons/`. A missing icon does not
    // stop the build: the app then shows the system's default one.
    mac: { icons: "icons/icon.iconset" },
    win: { icon: "icons/icon.png" },
    linux: { icon: "icons/icon.png" },
    bun: {
      entrypoint: "./src/bun/index.ts",
    },
    views: {
      main: {
        entrypoint: "./src/web/index.ts",
      },
    },
    copy: {
      "./src/web/index.html": "views/main/index.html",
      "./src/web/init.css": "views/main/init.css",
      "./src/web/style.css": "views/main/style.css",
      "./src/web/app.css": "views/main/app.css",
      "./src/web/fonts": "views/main/fonts",
      "./src/web/assets": "views/main/assets",
      ...tutorialArchive(),
      ...sharpNativePackages(),
    },
  },
  scripts: {
    postWrap: "./scripts/post-wrap.ts",
  },
} satisfies ElectrobunConfig;
