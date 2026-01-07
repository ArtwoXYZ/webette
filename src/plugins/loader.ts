/**
 * Plugin loader: imports ESM plugin modules from disk.
 */

import * as path from "node:path";
import { pathToFileURL } from "node:url";
import type { Plugin, LoadedPlugin } from "./types";

// Load a plugin module (ESM .js/.mjs) from disk.
async function importPlugin(modulePath: string): Promise<Plugin | null> {
  try {
    const mod = await import(pathToFileURL(modulePath).href);
    const plugin = (mod?.default ?? mod) as Plugin;
    if (plugin && typeof plugin === "object") return plugin;
    return null;
  } catch {
    return null;
  }
}

export async function loadPlugins(options: {
  rootDir: string;
  pluginPaths?: string[];
}): Promise<LoadedPlugin[]> {
  const { rootDir, pluginPaths = [] } = options;
  const loaded: LoadedPlugin[] = [];

  for (const [index, rel] of pluginPaths.entries()) {
    const absPath = path.isAbsolute(rel) ? rel : path.join(rootDir, rel);
    const plugin = await importPlugin(absPath);
    if (!plugin) continue;
    // Derive a stable id from plugin or filename
    const fallbackId = plugin.pluginId ?? path.parse(absPath).name ?? `plugin_${index + 1}`;
    loaded.push({ ...plugin, pluginId: fallbackId });
  }

  return loaded;
}
