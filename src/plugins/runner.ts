/**
 * Plugin runner: executes lifecycle hooks and transform hooks in order.
 */

import type { Block, Collection, Entry, Site } from "../core/model";
import type { LoadedPlugin, PluginContext } from "./types";
import Handlebars from "handlebars";

const logError = (logger: PluginContext["logger"], pluginId: string, hook: string, error: unknown) => {
  logger.error("plugin.hookError", { pluginId, hook, error: String(error) });
};

// Lifecycle hooks onInit/onScan/onResolved
export async function runOnInit(plugins: LoadedPlugin[], ctx: PluginContext) {
  for (const plugin of plugins) {
    if (!plugin.onInit) continue;
    try {
      await plugin.onInit({ ...ctx, pluginId: plugin.pluginId });
    } catch (err) {
      logError(ctx.logger, plugin.pluginId, "onInit", err);
    }
  }
}

export async function runOnScan(plugins: LoadedPlugin[], site: Site, ctx: PluginContext): Promise<Site> {
  let current = site;
  for (const plugin of plugins) {
    if (!plugin.onScan) continue;
    try {
      const result = await plugin.onScan(current, { ...ctx, pluginId: plugin.pluginId });
      if (result && typeof result === "object") {
        current = result as Site;
      }
    } catch (err) {
      logError(ctx.logger, plugin.pluginId, "onScan", err);
    }
  }
  return current;
}

export async function runOnResolved(plugins: LoadedPlugin[], site: Site, ctx: PluginContext): Promise<Site> {
  let current = site;
  for (const plugin of plugins) {
    if (!plugin.onResolved) continue;
    try {
      const result = await plugin.onResolved(current, { ...ctx, pluginId: plugin.pluginId });
      if (result && typeof result === "object") {
        current = result as Site;
      }
    } catch (err) {
      logError(ctx.logger, plugin.pluginId, "onResolved", err);
    }
  }
  return current;
}

export async function runTransformBlocks(
  plugins: LoadedPlugin[],
  collection: Collection,
  entry: Entry,
  ctx: PluginContext
): Promise<Block[]> {
  // Depth-first transform with recursion on subBlocks
  const transformBlock = async (blk: Block): Promise<Block> => {
    let current = blk;
    for (const plugin of plugins) {
      if (!plugin.transformBlock) continue;
      try {
        const res = await plugin.transformBlock(current, {
          ...ctx,
          entry,
          collection,
          pluginId: plugin.pluginId,
        });
        if (res && typeof res === "object") {
          current = res as Block;
        }
      } catch (err) {
        logError(ctx.logger, plugin.pluginId, "transformBlock", err);
      }
    }

    if (current.subBlocks && current.subBlocks.length) {
      const updatedSubs = await Promise.all(current.subBlocks.map(transformBlock));
      current = { ...current, subBlocks: updatedSubs };
    }

    return current;
  };

  return Promise.all(entry.blocks.map(transformBlock));
}

export async function runTransformEntry(
  plugins: LoadedPlugin[],
  collection: Collection,
  entry: Entry,
  ctx: PluginContext
): Promise<Entry> {
  let current = entry;
  for (const plugin of plugins) {
    if (!plugin.transformEntry) continue;
    try {
      const res = await plugin.transformEntry(current, {
        ...ctx,
        collection,
        pluginId: plugin.pluginId,
      });
      if (res && typeof res === "object") {
        current = res as Entry;
      }
    } catch (err) {
      logError(ctx.logger, plugin.pluginId, "transformEntry", err);
    }
  }
  return current;
}

export async function runExtendTemplates(plugins: LoadedPlugin[], ctx: PluginContext) {
  for (const plugin of plugins) {
    if (!plugin.extendTemplates) continue;
    try {
      await plugin.extendTemplates(Handlebars, { ...ctx, pluginId: plugin.pluginId });
    } catch (err) {
      logError(ctx.logger, plugin.pluginId, "extendTemplates", err);
    }
  }
}
