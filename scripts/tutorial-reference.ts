/**
 * Reference of the tutorial build output: one line per file of `_public/`.
 *
 * Kept as plain text so a rendering change shows up as a readable diff in
 * a pull request. Shared by `check-tutorial.ts` and its tests.
 */

import { createHash } from "node:crypto";
import * as path from "node:path";

// Images go through sharp, whose encoders do not give the same bytes on
// every platform: they are listed but their content is not compared.
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".ico"]);
const NOT_COMPARED = "(image)";

export interface OutputFile {
  path: string; // relative to `_public/`, with forward slashes
  content: Uint8Array;
}

export function formatReference(files: OutputFile[]): string {
  const lines = files
    .map((file) => {
      const isImage = IMAGE_EXTENSIONS.has(path.extname(file.path).toLowerCase());
      const mark = isImage
        ? NOT_COMPARED
        : createHash("sha256").update(file.content).digest("hex").slice(0, 16);
      return `${file.path}  ${mark}`;
    })
    .sort();
  return `${lines.join("\n")}\n`;
}

export interface ReferenceDiff {
  added: string[];
  removed: string[];
  changed: string[];
}

function parseReference(reference: string): Map<string, string> {
  const files = new Map<string, string>();
  for (const line of reference.split("\n")) {
    const split = line.lastIndexOf("  ");
    if (split === -1) continue;
    files.set(line.slice(0, split), line.slice(split + 2));
  }
  return files;
}

export function diffReference(expected: string, actual: string): ReferenceDiff {
  const before = parseReference(expected);
  const after = parseReference(actual);
  const diff: ReferenceDiff = { added: [], removed: [], changed: [] };
  for (const [file, mark] of after) {
    if (!before.has(file)) diff.added.push(file);
    else if (before.get(file) !== mark) diff.changed.push(file);
  }
  for (const file of before.keys()) {
    if (!after.has(file)) diff.removed.push(file);
  }
  return diff;
}
