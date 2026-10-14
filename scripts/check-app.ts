/**
 * Starts the desktop app just packaged by `bun run package:app` and checks
 * that it works: the window loads the interface, and the app builds its
 * tutorial site.
 *
 *   bun run check:app
 *
 * The app runs its self-check (`WEBETTE_APP_SELF_CHECK` in
 * `packages/app/src/bun/index.ts`), writes the result to a file and quits.
 * Needs a desktop session: on Linux without a screen, run it under
 * `xvfb-run`.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const root = path.resolve(import.meta.dir, "..");
const buildDir = path.join(root, "packages", "app", "build");
const TIMEOUT_MS = 5 * 60_000;

/** Electrobun's launcher in the stable build: what the installer puts in place. */
function findLauncher(): string {
  const names = new Set(["launcher", "launcher.exe"]);
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.includes("staging")) walk(full);
      else if (entry.isFile() && names.has(entry.name)) found.push(full);
    }
  };
  for (const name of fs.existsSync(buildDir) ? fs.readdirSync(buildDir) : []) {
    if (name.startsWith("stable-")) walk(path.join(buildDir, name));
  }
  if (found.length === 0) {
    throw new Error('No packaged app found: run "bun run package:app" first.');
  }
  console.log(`Launchers in the build:\n  ${found.map((file) => path.relative(root, file)).join("\n  ")}`);
  // Windows only starts programs that carry their extension.
  const startable = process.platform === "win32" ? found.filter((file) => file.endsWith(".exe")) : found;
  startable.sort((a, b) => a.length - b.length);
  if (startable.length === 0) throw new Error("None of these launchers can be started here.");
  return startable[0]!;
}

try {
  const launcher = findLauncher();
  const resultFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "webette-check-")), "result.json");
  console.log(`Starting ${path.relative(root, launcher)}`);

  const app = Bun.spawn([launcher], {
    cwd: path.dirname(launcher),
    env: { ...process.env, WEBETTE_APP_SELF_CHECK: resultFile },
    stdio: ["ignore", "inherit", "inherit"],
  });

  const deadline = Date.now() + TIMEOUT_MS;
  while (!fs.existsSync(resultFile) && Date.now() < deadline) await Bun.sleep(1000);
  // Leave the app a moment to quit on its own before stopping it.
  await Promise.race([app.exited, Bun.sleep(10_000)]);
  app.kill();

  if (!fs.existsSync(resultFile)) {
    throw new Error(`The app wrote no result within ${TIMEOUT_MS / 60_000} minutes.`);
  }
  const result = JSON.parse(fs.readFileSync(resultFile, "utf8")) as {
    uiLoaded?: boolean;
    homePageBuilt?: boolean;
  };
  console.log(JSON.stringify(result, null, 2));
  if (!result.uiLoaded) throw new Error("The window did not load the interface.");
  if (!result.homePageBuilt) throw new Error("The app did not build its tutorial site.");
  console.log("\nThe app starts and builds its tutorial site.");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
