/**
 * Plugin loader: imports ESM plugin modules from disk.
 */

import * as path from "node:path";
import * as fs from "node:fs/promises";
import { pathToFileURL } from "node:url";
import type { Plugin, LoadedPlugin } from "./types";
import type { Logger } from "../logging/logger";

interface PluginDescriptor {
  pluginPath: string;
  readmePath: string;
  id: string;
}

interface PluginMetadata {
  name?: string;
  author?: string;
  license?: string;
  version?: string;
}

const METADATA_FIELDS: { key: keyof PluginMetadata; pattern: RegExp }[] = [
  { key: "name", pattern: /\*\*Name\*\*:\s*(.+)/i },
  { key: "author", pattern: /\*\*Author\*\*:\s*(.+)/i },
  { key: "license", pattern: /\*\*License\*\*:\s*(.+)/i },
  { key: "version", pattern: /\*\*Version\*\*:\s*(.+)/i },
];

const REQUIRED_METADATA_FIELDS: (keyof PluginMetadata)[] = ["name", "version", "author", "license"];

// Load a plugin module (ESM .js/.mjs) from disk.
async function importPlugin(modulePath: string, logger: Logger): Promise<Plugin | null> {
  try {
    const mod = await import(pathToFileURL(modulePath).href);
    const plugin = (mod?.default ?? mod) as Plugin;
    if (plugin && typeof plugin === "object") return plugin;
    logger.warn("build.pluginImportInvalidExport", { path: modulePath });
    return null;
  } catch (err) {
    logger.warn("build.pluginImportFailed", { path: modulePath, error: String(err) });
    return null;
  }
}

// Parse plugin metadata from README.md header
async function parsePluginMetadata(readmePath: string, logger: Logger): Promise<PluginMetadata> {
  try {
    const content = await fs.readFile(readmePath, "utf8");
    const lines = content.split('\n');
    const metadata: PluginMetadata = {};

    for (const line of lines) {
      for (const field of METADATA_FIELDS) {
        const match = line.match(field.pattern);
        if (match && match[1]) metadata[field.key] = match[1].trim();
      }

      // Stop after the header section (first empty line or ##)
      if (line.startsWith('##') || (line.trim() === '' && Object.keys(metadata).length > 0)) {
        break;
      }
    }

    return metadata;
  } catch (err) {
    logger.warn("build.pluginReadmeParseError", { path: readmePath, error: String(err) });
    return {};
  }
}

// Scan a directory for plugin subdirectories (each with a .js/.mjs entry point)
async function scanPluginsDirectory(pluginsDir: string, logger: Logger): Promise<PluginDescriptor[]> {
  const descriptors: PluginDescriptor[] = [];

  try {
    const entries = await fs.readdir(pluginsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const folderPath = path.join(pluginsDir, entry.name);
      const folderEntries = await fs.readdir(folderPath);

      const jsFile = folderEntries.find(f => f.endsWith('.js') || f.endsWith('.mjs'));
      if (!jsFile) continue;

      const readmeFile = folderEntries.find(f => f.toLowerCase() === 'readme.md');
      if (!readmeFile) {
        logger.warn("build.pluginMissingReadme", { folder: entry.name });
        continue;
      }

      descriptors.push({
        pluginPath: path.join(folderPath, jsFile),
        readmePath: path.join(folderPath, readmeFile),
        id: entry.name,
      });
    }

    // Sort alphabetically by id for deterministic order
    return descriptors.sort((a, b) => a.id.localeCompare(b.id));
  } catch (err) {
    logger.warn("build.pluginScanDirError", { dir: pluginsDir, error: String(err) });
    return [];
  }
}

// Convert explicit plugin paths into descriptors (README required)
async function resolveDescriptorsFromPaths(
  paths: string[],
  rootDir: string,
  logger: Logger
): Promise<PluginDescriptor[]> {
  const descriptors: PluginDescriptor[] = [];

  for (const rel of paths) {
    const absPath = path.isAbsolute(rel) ? rel : path.join(rootDir, rel);
    const id = path.parse(absPath).name;
    const dir = path.dirname(absPath);
    const readmePath = path.join(dir, "README.md");

    try {
      await fs.access(readmePath);
    } catch {
      logger.warn("build.pluginMissingReadme", { folder: id });
      continue;
    }

    descriptors.push({ pluginPath: absPath, readmePath, id });
  }

  return descriptors;
}

// Resolve plugin config into loader parameters
export function resolvePluginSources(
  plugins: string[] | { dir: string } | undefined
): { pluginPaths?: string[]; pluginsDir?: string } {
  if (!plugins) return {};
  if (Array.isArray(plugins)) return { pluginPaths: plugins };
  return { pluginsDir: plugins.dir };
}

export async function loadPlugins(options: {
  rootDir: string;
  pluginPaths?: string[];
  pluginsDir?: string;
  logger: Logger;
}): Promise<LoadedPlugin[]> {
  const { rootDir, pluginPaths, pluginsDir, logger } = options;

  // Phase 1: Resolve descriptors
  let descriptors: PluginDescriptor[] = [];

  if (pluginsDir) {
    const absDir = path.isAbsolute(pluginsDir) ? pluginsDir : path.join(rootDir, pluginsDir);
    descriptors = await scanPluginsDirectory(absDir, logger);
  } else if (pluginPaths && pluginPaths.length > 0) {
    descriptors = await resolveDescriptorsFromPaths(pluginPaths, rootDir, logger);
  }

  // Phase 2: Import + enrich (unified for both paths)
  const loaded: LoadedPlugin[] = [];

  for (const desc of descriptors) {
    const plugin = await importPlugin(desc.pluginPath, logger);
    if (!plugin) continue;

    const metadata = await parsePluginMetadata(desc.readmePath, logger);

    const missing = REQUIRED_METADATA_FIELDS.filter(f => !metadata[f]);
    if (missing.length > 0) {
      logger.warn("build.pluginMetadataIncomplete", {
        folder: desc.id,
        missing: missing.join(", "),
      });
      continue;
    }

    const pluginId = plugin.pluginId ?? desc.id;

    loaded.push({
      ...plugin,
      pluginId,
      metadata: {
        name: metadata.name!,
        author: metadata.author,
        license: metadata.license,
        version: metadata.version,
        folder: desc.id,
      },
    });
  }

  return loaded;
}
