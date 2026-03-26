/**
 * Tag filtering API — pure functions, no side effects.
 * Used by Handlebars helpers, PluginContext, and any internal consumer.
 *
 * Entry tags are read from `tag.webt` (one tag per line) during scan.
 * This module only operates on already-enriched Entry/Collection objects.
 */

import type { Collection, Entry } from "./model";

export type TagFilterMode = "and" | "or";

export interface TagFilterOptions {
  tags: string | string[];
  mode?: TagFilterMode;
}

export function normalizeTags(input: string | string[]): string[] {
  const raw = Array.isArray(input) ? input : input.split(",");
  return [...new Set(raw.map((t) => t.trim()).filter((t) => t.length > 0))];
}

export function matchEntryTags(
  entry: Entry,
  tags: string[],
  mode: TagFilterMode
): boolean {
  if (!tags.length) return true;
  const entryTags = entry.tags ?? [];
  if (mode === "and") return tags.every((t) => entryTags.includes(t));
  return tags.some((t) => entryTags.includes(t));
}

export function findEntriesByTags(
  entries: Entry[],
  options: TagFilterOptions
): Entry[] {
  const tags = normalizeTags(options.tags);
  const mode = options.mode ?? "or";
  if (!tags.length) return entries;
  return entries.filter((e) => matchEntryTags(e, tags, mode));
}

export function collectAllEntries(
  collections: Collection[],
  rootEntries?: Entry[]
): Entry[] {
  const fromCollections = collections.flatMap((c) => c.entries ?? []);
  return rootEntries ? [...rootEntries, ...fromCollections] : fromCollections;
}

export function collectAllTags(entries: Entry[]): string[] {
  const tagSet = new Set<string>();
  for (const entry of entries) {
    for (const tag of entry.tags ?? []) tagSet.add(tag);
  }
  return [...tagSet].sort();
}

export function collectCollectionTags(collection: Collection): string[] {
  return collectAllTags(collection.entries ?? []);
}

export function collectSiteTags(collections: Collection[], rootEntries?: Entry[]): string[] {
  return collectAllTags(collectAllEntries(collections, rootEntries));
}
