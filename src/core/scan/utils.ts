/**
 * Shared scan helpers (path normalization, sorting and file/folder predicates).
 */

import * as path from "node:path";
import { cleanName, orderKey, slugify } from "../../utils/naming";
import { toPosix } from "../../utils/path";
import type { ScanDirent, SortOrder } from "./internal-types";

export function normalizeIndexFolderName(raw: unknown): string {
  if (typeof raw !== "string") return "index";
  const trimmed = raw.trim();
  if (!trimmed) return "index";
  const normalized = slugify(cleanName(trimmed));
  return normalized || "index";
}

export function isIndexFolderName(rawName: string, normalizedName: string): boolean {
  if (!rawName || !normalizedName) return false;
  return slugify(cleanName(rawName)) === normalizedName;
}

export function sortByName<T extends { rawName: string }>(
  items: T[],
  order: SortOrder = "asc"
): void {
  const dir = order === "desc" ? -1 : 1;
  items.sort((a, b) => {
    const orderA = orderKey(a.rawName);
    const orderB = orderKey(b.rawName);
    if (orderA !== orderB) return (orderA - orderB) * dir;
    return a.rawName.localeCompare(b.rawName, undefined, { sensitivity: "base" }) * dir;
  });
}

export function isVisibleContentName(rawName: string): boolean {
  return !!rawName && !rawName.startsWith(".") && !rawName.startsWith("_");
}

export function isNavigationBlockFile(rawName: string, isDirectory: boolean): boolean {
  return !isDirectory && cleanName(rawName).toLowerCase() === "navigation.webt";
}

export function isReferenceBlockFile(
  rawName: string,
  ext: string | undefined,
  isDirectory: boolean
): boolean {
  return !isDirectory && ext?.toLowerCase() === ".webt" && rawName.toLowerCase().includes("reference");
}

export function isBlockCandidateFileOutsideEntry(fsEntry: ScanDirent): boolean {
  if (!fsEntry.isFile()) return false;
  const rawName = fsEntry.name;
  if (!isVisibleContentName(rawName)) return false;

  const ext = path.extname(rawName) || undefined;
  const isNavigation = isNavigationBlockFile(rawName, false);
  const isReference = isReferenceBlockFile(rawName, ext, false);

  if (ext?.toLowerCase() === ".webt" && !isNavigation && !isReference) {
    return false;
  }

  return true;
}

export function isIgnoredMetaFileOutsideEntry(fsEntry: ScanDirent): boolean {
  if (!fsEntry.isFile()) return false;
  const rawName = fsEntry.name;
  if (!isVisibleContentName(rawName)) return false;
  const ext = path.extname(rawName) || undefined;
  if (ext?.toLowerCase() !== ".webt") return false;
  return !isNavigationBlockFile(rawName, false) && !isReferenceBlockFile(rawName, ext, false);
}
