/**
 * Parser for `.webt` navigation block files.
 *
 * Extracts header options and item lines from the raw content of a navigation block.
 */

import type { Logger } from "../../../../logging/logger";
import { parseBoolean, parseList } from "../../../../utils/navigation";

// ── Types ──────────────────────────────────────────────────────────────────────

export type ParsedItemLine = {
  rawLine: string;
  level: number;
  title?: string;
  collection?: string;
  entry?: string;
};

export type NavigationOptions = {
  mode?: "collection";
  collection?: string;
  includeUnlisted?: boolean;
  includeDrafts?: boolean;
  excludeCollections?: string[];
  excludeEntries?: string[];
  hideCollections?: boolean;
  hideEntries?: boolean;
  collectionsLink?: boolean;
  entriesLink?: boolean;
};

export type ParsedNavigationBlock = {
  name: string | undefined;
  options: NavigationOptions;
  parsedItems: ParsedItemLine[];
};

// ── Pure parsing helpers ───────────────────────────────────────────────────────

function parseNavigationNameLine(rawLine: string): string | null {
  const trimmed = rawLine.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("#")) return null;

  const normalized = trimmed.startsWith("-") ? trimmed.slice(1).trim() : trimmed;
  const match = /^name\s*:\s*(.*)$/i.exec(normalized);
  if (!match) return null;

  const value = (match[1] ?? "").trim();
  return value ? value : null;
}

function parseHeaderOptionLine(rawLine: string): { key: string; value: string } | null {
  const trimmed = rawLine.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const normalized = trimmed.startsWith("-") ? trimmed.slice(1).trim() : trimmed;
  const match = /^([A-Za-z][A-Za-z0-9 _-]*)\s*:\s*(.*)$/.exec(normalized);
  if (!match) return null;

  const key = (match[1] ?? "").trim().toLowerCase();
  const value = (match[2] ?? "").trim();
  if (!key || !value) return null;

  return { key, value };
}

function countIndentSpaces(rawLine: string): {
  indentSpaces: number;
  hadTabs: boolean;
  content: string;
} {
  let indentSpaces = 0;
  let hadTabs = false;
  let i = 0;
  while (i < rawLine.length) {
    const ch = rawLine[i];
    if (ch === " ") {
      indentSpaces += 1;
      i += 1;
      continue;
    }
    if (ch === "\t") {
      hadTabs = true;
      indentSpaces += 2;
      i += 1;
      continue;
    }
    break;
  }
  return { indentSpaces, hadTabs, content: rawLine.slice(i) };
}

function normalizeItemLine(rawLine: string): string {
  const trimmed = rawLine.trim();
  if (!trimmed) return "";
  const withoutDash = trimmed.startsWith("-") ? trimmed.slice(1).trim() : trimmed;
  return withoutDash;
}

function parseItemLine(rawLine: string): Omit<ParsedItemLine, "level"> | null {
  const normalized = normalizeItemLine(rawLine);
  if (!normalized) return null;
  if (normalized.startsWith("#")) return null;

  const splitSegments = (raw: string): string[] => {
    const keys = ["title", "collection", "coll", "entry"];
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

  const parts = splitSegments(normalized);
  const parsed: Omit<ParsedItemLine, "level"> = { rawLine };

  for (const part of parts) {
    const [rawKey, ...rest] = part.split(":");
    if (!rawKey || rest.length === 0) continue;
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (!value) continue;

    if (key === "collection" || key === "coll") {
      parsed.collection = value;
    } else if (key === "entry") {
      parsed.entry = value;
    } else if (key === "title") {
      parsed.title = value;
    }
  }

  if (!parsed.collection && !parsed.entry && !parsed.title) return null;
  return parsed;
}

// ── Main block parser ──────────────────────────────────────────────────────────

export function parseNavigationBlock(
  rawLines: string[],
  blockPath: string,
  logger?: Logger
): ParsedNavigationBlock {
  let navigationName: string | undefined;
  const parsedItems: ParsedItemLine[] = [];
  const options: NavigationOptions = {};
  let itemsStarted = false;

  for (const rawLine of rawLines) {
    if (!rawLine.trim()) continue;
    if (rawLine.trimStart().startsWith("#")) continue;

    if (!navigationName) {
      const parsedName = parseNavigationNameLine(rawLine);
      if (parsedName) {
        navigationName = parsedName;
        continue;
      }
    }

    const headerOption = parseHeaderOptionLine(rawLine);
    if (!itemsStarted && headerOption) {
      const key = headerOption.key;
      const value = headerOption.value;
      const normalizedValue = value.toLowerCase();

      if (key === "name") {
        continue;
      }

      if (key === "mode") {
        if (normalizedValue === "collection") {
          options.mode = "collection";
        }
        continue;
      }

      if (key === "collection") {
        options.collection = value;
        continue;
      }

      if (key === "exclude collections" || key === "exclude collection") {
        options.excludeCollections = parseList(value);
        continue;
      }

      if (key === "exclude entries" || key === "exclude entry") {
        options.excludeEntries = parseList(value);
        continue;
      }

      const boolValue = parseBoolean(value);
      if (boolValue === undefined) {
        continue;
      }

      if (key === "include unlisted") {
        options.includeUnlisted = boolValue;
        continue;
      }

      if (key === "include drafts") {
        options.includeDrafts = boolValue;
        continue;
      }

      if (key === "hide collections" || key === "hide collection") {
        options.hideCollections = boolValue;
        continue;
      }

      if (key === "hide entries" || key === "hide entry") {
        options.hideEntries = boolValue;
        continue;
      }

      if (key === "collections link" || key === "collection link") {
        options.collectionsLink = boolValue;
        continue;
      }

      if (key === "entries link" || key === "entry link") {
        options.entriesLink = boolValue;
        continue;
      }
    }

    const { indentSpaces, hadTabs } = countIndentSpaces(rawLine);
    if (hadTabs) {
      logger?.warn("navigation.indentTabs", { path: blockPath, line: rawLine });
    }

    let normalizedIndent = indentSpaces;
    if (normalizedIndent % 2 !== 0) {
      logger?.warn("navigation.indentOdd", { path: blockPath, line: rawLine });
      normalizedIndent -= 1;
    }
    const level = Math.max(0, Math.floor(normalizedIndent / 2));

    const parsed = parseItemLine(rawLine);
    if (!parsed) continue;
    parsedItems.push({ ...parsed, level });
    itemsStarted = true;
  }

  return { name: navigationName, options, parsedItems };
}
