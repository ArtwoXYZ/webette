/**
 * Builds the tutorial site from scratch and compares its `_public/` with the
 * recorded reference (`scripts/tutorial-reference.txt`), or fails loudly.
 *
 *   bun run check:tutorial            # compare with the reference
 *   bun run check:tutorial --accept   # record the current output as the reference
 *
 * The build runs with a fixed clock and in UTC, and starts from an empty
 * `_public/`, so the same sources always give the same output.
 */

process.env.TZ = "UTC";

import { readdir, rm } from "node:fs/promises";
import * as path from "node:path";
import { build, createProjectLogger } from "../packages/engine/src/index";
import { getEnv } from "../packages/engine/src/config/env";
import { loadSharp } from "../packages/engine/src/core/block-types/image/sharp-loader";
import { diffReference, formatReference, type OutputFile } from "./tutorial-reference";

const root = path.resolve(import.meta.dir, "..");
// Relative on purpose: the site folder is written as given in the exported model.
const siteDir = path.join("packages", "app", "tutorial");
const outputDir = path.join(siteDir, "_public");
const referencePath = path.join("scripts", "tutorial-reference.txt");
const buildClock = new Date("2026-01-01T12:00:00.000Z");

async function readOutput(dir: string): Promise<OutputFile[]> {
  const names = await readdir(dir, { recursive: true, withFileTypes: true });
  const files: OutputFile[] = [];
  for (const item of names) {
    if (!item.isFile()) continue;
    const absolute = path.join(item.parentPath, item.name);
    files.push({
      path: path.relative(dir, absolute).split(path.sep).join("/"),
      content: await Bun.file(absolute).bytes(),
    });
  }
  return files;
}

function printList(title: string, files: string[]) {
  if (!files.length) return;
  console.error(`\n${title}`);
  for (const file of files) console.error(`  ${file}`);
}

process.chdir(root);
const accept = process.argv.includes("--accept");

// Without sharp the site is built without image variants: other pages, other files.
if (!(await loadSharp())) {
  console.error(
    "sharp could not be loaded: the tutorial reference is recorded with image variants.\n" +
      "Run `bun install` and try again."
  );
  process.exit(1);
}

await rm(outputDir, { recursive: true, force: true });
const { env: toolEnv } = await getEnv();
const logger = await createProjectLogger(siteDir, "webette.check", false, toolEnv);
await build(siteDir, { verbose: false, quiet: true, now: buildClock }, logger);

const actual = formatReference(await readOutput(outputDir));
const referenceFile = Bun.file(referencePath);

if (accept) {
  await Bun.write(referencePath, actual);
  console.log(`\nReference recorded in ${referencePath}. Commit it with your change.`);
  process.exit(0);
}

if (!(await referenceFile.exists())) {
  console.error(`\nNo reference yet. Record one with: bun run check:tutorial --accept`);
  process.exit(1);
}

const diff = diffReference(await referenceFile.text(), actual);
if (!diff.added.length && !diff.removed.length && !diff.changed.length) {
  console.log("\nThe tutorial output matches the reference.");
  process.exit(0);
}

console.error("\nThe tutorial output differs from the reference.");
printList("Changed:", diff.changed);
printList("Added:", diff.added);
printList("Removed:", diff.removed);
console.error(
  "\nIf this change is intended, record it with: bun run check:tutorial --accept\n" +
    "and commit scripts/tutorial-reference.txt."
);
process.exit(1);
