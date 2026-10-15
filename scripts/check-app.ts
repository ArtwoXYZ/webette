/**
 * Installs the desktop app just packaged by `bun run package:app`, the way
 * a person would, then starts it and checks that it works: the window
 * loads the interface, and the app builds its tutorial site.
 *
 *   bun run check:app
 *
 * The app runs its self-check (`WEBETTE_APP_SELF_CHECK` in
 * `packages/app/src/bun/index.ts`) and writes the result to a file; this
 * takes a screenshot of the screen (`packages/app/build/screenshot.png`),
 * removes the file, and the app quits.
 * This installs into the current user's folders, so it is meant for build
 * machines; it needs a desktop session (on Linux without a screen, run it
 * under `xvfb-run`).
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { ARTIFACT_FOLDER, distributableFor } from "./app-artifacts";

const root = path.resolve(import.meta.dir, "..");
const IDENTIFIER = "org.webette.desktop";
const TIMEOUT_MS = 5 * 60_000;
const SCREENSHOT = path.join(root, "packages", "app", "build", "screenshot.png");

/** Best effort: a missing screenshot never fails the check. */
function takeScreenshot(): void {
  const command =
    process.platform === "darwin"
      ? ["screencapture", "-x", SCREENSHOT]
      : process.platform === "win32"
        ? [
            "powershell",
            "-NoProfile",
            "-Command",
            "Add-Type -AssemblyName System.Windows.Forms,System.Drawing; " +
              "$b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; " +
              "$bmp = New-Object System.Drawing.Bitmap $b.Width, $b.Height; " +
              "[System.Drawing.Graphics]::FromImage($bmp).CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size); " +
              `$bmp.Save('${SCREENSHOT}')`,
          ]
        : ["import", "-window", "root", SCREENSHOT];
  const shot = Bun.spawnSync(command, { stdio: ["ignore", "inherit", "inherit"] });
  console.log(
    shot.exitCode === 0 ? `Screenshot: ${path.relative(root, SCREENSHOT)}` : "No screenshot taken."
  );
}

function run(command: string[], cwd: string): void {
  const result = Bun.spawnSync(command, { cwd, stdio: ["ignore", "inherit", "inherit"] });
  if (result.exitCode !== 0) {
    throw new Error(`"${command.join(" ")}" failed (exit code ${result.exitCode}).`);
  }
}

function findFile(dir: string, name: string): string | null {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true, recursive: true })) {
    if (entry.isFile() && entry.name === name) return path.join(entry.parentPath, entry.name);
  }
  return null;
}

/** Where Electrobun's installers put the app (its `Utils.paths` app data folder). */
function installedApp(): string {
  const appData =
    process.platform === "win32"
      ? (process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local"))
      : (process.env.XDG_DATA_HOME ?? path.join(os.homedir(), ".local", "share"));
  return path.join(appData, IDENTIFIER, "stable", "app");
}

/** Installs the packaged file; returns the program that starts the app. */
function install(installer: string, workDir: string): string {
  if (process.platform === "darwin") {
    // The disk image holds the app: copy it out, as people drag it out.
    const mount = path.join(workDir, "volume");
    run(["hdiutil", "attach", "-nobrowse", "-readonly", "-mountpoint", mount, installer], workDir);
    try {
      run(["cp", "-R", path.join(mount, "Webette.app"), workDir], workDir);
    } finally {
      run(["hdiutil", "detach", mount], workDir);
    }
    // A bundle whose signature does not hold is reported as "damaged" once
    // downloaded, with no way to open it: refuse it here.
    run(["codesign", "--verify", "--deep", "--strict", "--verbose=2", path.join(workDir, "Webette.app")], workDir);
    return path.join(workDir, "Webette.app", "Contents", "MacOS", "launcher");
  }

  // Linux and Windows: unpack the download, run the setup program it holds.
  run(["tar", "-xf", installer, "-C", workDir], workDir);
  const setup = findFile(workDir, process.platform === "win32" ? "Webette-Setup.exe" : "installer");
  if (!setup) throw new Error(`No setup program in ${path.basename(installer)}.`);
  run([setup], path.dirname(setup));

  const launcher = path.join(
    installedApp(),
    "bin",
    process.platform === "win32" ? "launcher.exe" : "launcher"
  );
  if (!fs.existsSync(launcher)) {
    const listing = fs.existsSync(installedApp())
      ? fs.readdirSync(installedApp(), { recursive: true }).slice(0, 40).join("\n  ")
      : "(nothing installed)";
    throw new Error(`The setup did not install ${launcher}. Installed:\n  ${listing}`);
  }
  return launcher;
}

try {
  const { version } = (await Bun.file(path.join(root, "packages", "app", "package.json")).json()) as {
    version: string;
  };
  const { published } = distributableFor(version, process.platform, process.arch);
  const installer = path.join(root, ARTIFACT_FOLDER, published);
  if (!fs.existsSync(installer)) {
    throw new Error(`No ${published}: run "bun run package:app" first.`);
  }

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "webette-check-"));
  const launcher = install(installer, workDir);
  const resultFile = path.join(workDir, "result.json");
  console.log(`Starting ${launcher}`);

  const app = Bun.spawn([launcher], {
    cwd: path.dirname(launcher),
    env: { ...process.env, WEBETTE_APP_SELF_CHECK: resultFile },
    stdio: ["ignore", "inherit", "inherit"],
  });

  // On its first launch the macOS app unpacks itself and starts again as a
  // new process, leaving with code 0: only a failure ends the wait early.
  let failed = false;
  void app.exited.then((code) => (failed = code !== 0));
  const deadline = Date.now() + TIMEOUT_MS;
  while (!fs.existsSync(resultFile) && !failed && Date.now() < deadline) await Bun.sleep(1000);

  let resultText: string | null = null;
  if (fs.existsSync(resultFile)) {
    await Bun.sleep(500); // let the write finish
    resultText = fs.readFileSync(resultFile, "utf8");
    takeScreenshot();
    fs.rmSync(resultFile); // tells the app it can quit
  }
  // Leave the app a moment to quit on its own before stopping it.
  await Promise.race([app.exited, Bun.sleep(10_000)]);
  app.kill();

  if (resultText === null) {
    throw new Error(
      failed
        ? `The app stopped (exit code ${app.exitCode}) without a result: see its messages above.`
        : `The app wrote no result within ${TIMEOUT_MS / 60_000} minutes.`
    );
  }
  const result = JSON.parse(resultText) as {
    uiLoaded?: boolean;
    homePageBuilt?: boolean;
  };
  console.log(JSON.stringify(result, null, 2));
  if (!result.uiLoaded) throw new Error("The window did not load the interface.");
  if (!result.homePageBuilt) throw new Error("The app did not build its tutorial site.");
  console.log("\nThe app installs, starts and builds its tutorial site.");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
