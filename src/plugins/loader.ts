/**
 * Plugin loader: imports ESM plugin modules from disk.
 */

import * as path from "node:path";
import * as fs from "node:fs/promises";
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

// Parse plugin metadata from README.md header
async function parsePluginMetadata(readmePath: string): Promise<{
  name?: string;
  author?: string;
  license?: string;
  version?: string;
}> {
  try {
    const content = await fs.readFile(readmePath, "utf8");
    const lines = content.split('\n');
    const metadata: any = {};

    for (const line of lines) {
      const nameMatch = line.match(/\*\*Name\*\*:\s*(.+)/);
      const authorMatch = line.match(/\*\*Author\*\*:\s*(.+)/);
      const licenseMatch = line.match(/\*\*License\*\*:\s*(.+)/);
      const versionMatch = line.match(/\*\*Version\*\*:\s*(.+)/);

      if (nameMatch && nameMatch[1]) metadata.name = nameMatch[1].trim();
      if (authorMatch && authorMatch[1]) metadata.author = authorMatch[1].trim();
      if (licenseMatch && licenseMatch[1]) metadata.license = licenseMatch[1].trim();
      if (versionMatch && versionMatch[1]) metadata.version = versionMatch[1].trim();

      // Stop after the header section (first empty line or ##)
      if (line.startsWith('##') || (line.trim() === '' && Object.keys(metadata).length > 0)) {
        break;
      }
    }

    return metadata;
  } catch {
    return {};
  }
}

// Scan a directory for plugins (subdirectories with .js/.mjs + README.md)
async function scanPluginsDirectory(pluginsDir: string): Promise<{
  pluginPath: string;
  readmePath: string;
  folderName: string;
}[]> {
  const foundPlugins: any[] = [];

  try {
    const entries = await fs.readdir(pluginsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const folderPath = path.join(pluginsDir, entry.name);
      const folderEntries = await fs.readdir(folderPath);

      // Look for .js or .mjs file
      const jsFile = folderEntries.find(f => f.endsWith('.js') || f.endsWith('.mjs'));
      const readmeFile = folderEntries.find(f => f.toLowerCase() === 'readme.md');

      if (jsFile && readmeFile) {
        foundPlugins.push({
          pluginPath: path.join(folderPath, jsFile),
          readmePath: path.join(folderPath, readmeFile),
          folderName: entry.name
        });
      }
    }

    // Sort alphabetically by folder name for deterministic order
    return foundPlugins.sort((a, b) => a.folderName.localeCompare(b.folderName));
  } catch {
    return [];
  }
}

export async function loadPlugins(options: {
  rootDir: string;
  pluginPaths?: string[];
  pluginsDir?: string;
}): Promise<LoadedPlugin[]> {
  const { rootDir, pluginPaths = [], pluginsDir } = options;
  const loaded: LoadedPlugin[] = [];

  // New directory-based loading
  if (pluginsDir) {
    const absDir = path.isAbsolute(pluginsDir) ? pluginsDir : path.join(rootDir, pluginsDir);
    const pluginsToLoad = await scanPluginsDirectory(absDir);

    for (const pluginInfo of pluginsToLoad) {
      const plugin = await importPlugin(pluginInfo.pluginPath);
      if (!plugin) continue;

      // Parse metadata from README
      const metadata = await parsePluginMetadata(pluginInfo.readmePath);

      // Derive plugin ID from plugin or folder name
      const pluginId = plugin.pluginId ?? pluginInfo.folderName;

      // Add metadata to the plugin object
      const loadedPlugin: LoadedPlugin = {
        ...plugin,
        pluginId,
        metadata: {
          name: metadata.name ?? pluginId,
          author: metadata.author,
          license: metadata.license,
          version: metadata.version,
          folder: pluginInfo.folderName
        }
      };

      loaded.push(loadedPlugin);
    }
  }
  // Legacy array-based loading (for backward compatibility during transition)
  else if (pluginPaths.length > 0) {
    for (const [index, rel] of pluginPaths.entries()) {
      const absPath = path.isAbsolute(rel) ? rel : path.join(rootDir, rel);
      const plugin = await importPlugin(absPath);
      if (!plugin) continue;

      const fallbackId = plugin.pluginId ?? path.parse(absPath).name ?? `plugin_${index + 1}`;
      loaded.push({ ...plugin, pluginId: fallbackId });
    }
  }

  return loaded;
}
