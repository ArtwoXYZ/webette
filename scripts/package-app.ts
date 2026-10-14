/**
 * Builds the desktop app for the system this runs on, ready to hand out.
 *
 *   bun run package:app
 *
 * Electrobun only builds for its host, so the release workflow
 * (`.github/workflows/release.yml`) runs this once per system. The result
 * is a single file in `packages/app/artifacts/`, named after webette and
 * its version.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { ARTIFACT_FOLDER, distributableFor } from "./app-artifacts";

const root = path.resolve(import.meta.dir, "..");
const appDir = path.join(root, "packages", "app");
const artifactDir = path.join(root, ARTIFACT_FOLDER);

function megabytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

try {
  const { version } = (await Bun.file(path.join(appDir, "package.json")).json()) as {
    version: string;
  };
  const { built, published } = distributableFor(version, process.platform, process.arch);

  // The tutorial goes in as one archive (see electrobun.config.ts): the
  // files Git tracks, without build output or logs.
  const tutorialDir = path.join(appDir, "tutorial");
  const tracked = Bun.spawnSync(["git", "ls-files", "-z"], { cwd: tutorialDir });
  if (tracked.exitCode !== 0) throw new Error("Could not list the tutorial's files with Git.");
  // Read up front: Bun.Archive writes lazy Bun.file() entries as empty files.
  const tutorialFiles: Record<string, Blob> = {};
  for (const file of tracked.stdout.toString().split("\0").filter(Boolean)) {
    tutorialFiles[file] = new Blob([await Bun.file(path.join(tutorialDir, file)).bytes()]);
  }
  fs.mkdirSync(path.join(appDir, "build"), { recursive: true });
  await Bun.write(
    path.join(appDir, "build", "tutorial.tar"),
    await new Bun.Archive(tutorialFiles).bytes()
  );

  const build = Bun.spawnSync([process.execPath, "x", "electrobun", "build", "--env=stable"], {
    cwd: appDir,
    stdio: ["ignore", "inherit", "inherit"],
  });
  if (build.exitCode !== 0) {
    throw new Error("The desktop app did not build: see the messages above.");
  }

  const builtPath = path.join(artifactDir, built);
  if (!fs.existsSync(builtPath)) {
    throw new Error(`The build finished without producing ${built}.`);
  }

  // Electrobun also writes what its updater would download (a second
  // archive and `update.json`). In-app update is not wired yet: only the
  // installer is kept, so the folder holds exactly what gets published.
  const publishedPath = path.join(artifactDir, published);
  fs.renameSync(builtPath, publishedPath);
  for (const name of fs.readdirSync(artifactDir)) {
    if (name !== published) fs.rmSync(path.join(artifactDir, name), { recursive: true });
  }

  const { size } = fs.statSync(publishedPath);
  console.log(`\nDesktop app ready: ${path.relative(root, publishedPath)} (${megabytes(size)})`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
