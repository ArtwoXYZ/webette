/**
 * Helpers to match collections/entries for internal targets (links, indexes, navigation).
 */

import * as path from "node:path";
import type { Collection, Entry, Site, Block } from "../model";
import { cleanName, slugify } from "../../utils/naming";

export type ParsedTarget =
  | { kind: "collection"; collectionName: string }
  | { kind: "entry"; collectionName?: string; entryName: string }
  | { kind: "block"; collectionName?: string; entryName?: string; blockName: string };

// Parsed internal reference with optional extra options (e.g. variant).
export type ParsedInternal = {
  target: ParsedTarget | null;
  options: Record<string, string>;
  anchor?: string;
};

function decodeValue(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
}

function normalizeName(value: string): string {
  const base = path.parse(value).name;
  return cleanName(base).toLowerCase();
}

// Only keep the explicit keys we support (collection has "coll" alias).
function normalizeTargetKey(raw: string): "collection" | "entry" | "block" | undefined {
  if (raw === "collection" || raw === "coll") return "collection";
  if (raw === "entry") return "entry";
  if (raw === "block") return "block";
  return undefined;
}

// Parse a "collection:/entry:/block:" reference and return target + options.
export function parseInternalReference(rawUrl: string): ParsedInternal | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  const splitSegments = (raw: string): string[] => {
    const keys = ["collection", "coll", "entry", "block"];
    const result: string[] = [];
    let start = 0;
    for (let i = 0; i < raw.length; i += 1) {
      if (raw[i] !== ",") continue;
      let j = i + 1;
      while (j < raw.length && /\s/.test(raw[j] ?? "")) j += 1;
      let matched = false;
      for (const key of keys) {
        const slice = raw.slice(j, j + key.length);
        const after = raw[j + key.length];
        if (slice.toLowerCase() === key && after === ":") {
          const segment = raw.slice(start, i).trim();
          if (segment) result.push(segment);
          start = j;
          matched = true;
          break;
        }
      }
      if (matched) {
        i = j - 1;
      }
    }
    const tail = raw.slice(start).trim();
    if (tail) result.push(tail);
    return result;
  };

  const segments = splitSegments(trimmed);
  const data: Record<string, string> = {};
  const options: Record<string, string> = {};
  let anchor: string | undefined;

  const splitAnchor = (value: string): { value: string; anchor?: string } => {
    const idx = value.indexOf("#");
    if (idx <= 0) return { value };
    const base = value.slice(0, idx).trim();
    const hash = value.slice(idx + 1).trim();
    const anchor = hash ? slugify(hash) : undefined;
    return { value: base, anchor };
  };

  for (const seg of segments) {
    const [rawKey, ...rest] = seg.split(":");
    if (!rawKey || rest.length === 0) continue;
    const key = rawKey.trim().toLowerCase();
    const value = decodeValue(rest.join(":").trim());
    if (!value) continue;
    const targetKey = normalizeTargetKey(key);
    if (targetKey) {
      if (targetKey === "entry") {
        const split = splitAnchor(value);
        data[targetKey] = split.value;
        anchor = split.anchor ?? anchor;
      } else {
        data[targetKey] = value;
      }
    } else {
      options[key] = value;
    }
  }

  if (Object.keys(data).length === 0) {
    const lower = trimmed.toLowerCase();
    const prefixes = ["collection:", "coll:", "entry:", "block:"] as const;
    const match = prefixes.find((prefix) => lower.startsWith(prefix));
    if (match) {
      const key = normalizeTargetKey(match.replace(":", ""))!;
      const value = decodeValue(trimmed.slice(match.length).trim());
      if (value) {
        if (key === "entry") {
          const split = splitAnchor(value);
          data[key] = split.value;
          anchor = split.anchor ?? anchor;
        } else {
          data[key] = value;
        }
      }
    }
  }

  let target: ParsedTarget | null = null;
  if (data.block) {
    target = {
      kind: "block",
      collectionName: data.collection,
      entryName: data.entry,
      blockName: data.block,
    };
  } else if (data.entry) {
    target = {
      kind: "entry",
      collectionName: data.collection,
      entryName: data.entry,
    };
  } else if (data.collection) {
    target = { kind: "collection", collectionName: data.collection };
  }

  if (!target) return null;

  return { target, options, ...(anchor ? { anchor } : {}) };
}

export function matchCollection(site: Site, name: string): Collection | undefined {
  const target = normalizeName(name);
  return site.collections?.find((col) => {
    const names = [col.slug, col.id, col.name, normalizeName(col.rawName)]
      .filter(Boolean)
      .map((n) => normalizeName(String(n)));
    return names.includes(target);
  });
}

export function matchEntry(collection: Collection, name: string): Entry | undefined {
  const target = normalizeName(name);
  return collection.entries.find((entry) => {
    const names = [entry.slug, entry.id, entry.name, normalizeName(entry.rawName)]
      .filter(Boolean)
      .map((n) => normalizeName(String(n)));
    return names.includes(target);
  });
}

export function matchBlock(entry: Entry, name: string): Block | undefined {
  const targetBase = normalizeName(name);
  const targetWithExt = normalizeName(path.parse(name).name);
  return entry.blocks.find((blk) => {
    const names = [
      blk.slug,
      blk.id,
      blk.name,
      normalizeName(blk.rawName),
      normalizeName(path.parse(blk.rawName).name),
    ]
      .filter(Boolean)
      .map((n) => normalizeName(String(n)));
    return names.includes(targetBase) || names.includes(targetWithExt);
  });
}
