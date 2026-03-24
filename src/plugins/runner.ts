/**
 * Plugin runner: executes lifecycle hooks and transform hooks in order.
 */

import type { Block, Collection, Entry, Site } from "../core/model";
import type { LoadedPlugin, PluginContext, RenderPage } from "./types";
import Handlebars from "handlebars";

const logError = (logger: PluginContext["logger"], pluginId: string, hook: string, error: unknown) => {
  logger.error("plugin.hookError", { pluginId, hook, error: String(error) });
};

export async function runOnInit(plugins: LoadedPlugin[], ctx: PluginContext) {
  for (const plugin of plugins) {
    if (!plugin.onInit) continue;
    try {
      const pluginCtx = {
        ...ctx,
        pluginId: plugin.pluginId,
        siteConfig: ctx.siteConfig,
        pluginConfig: ctx.pluginConfig,
        thisPluginConfig: ctx.pluginConfig?.[plugin.pluginId] as Record<string, unknown> | undefined
      };
      await plugin.onInit(pluginCtx);
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
      const pluginCtx = {
        ...ctx,
        pluginId: plugin.pluginId,
        siteConfig: ctx.siteConfig,
        pluginConfig: ctx.pluginConfig,
        thisPluginConfig: ctx.pluginConfig?.[plugin.pluginId] as Record<string, unknown> | undefined
      };
      const result = await plugin.onScan(current, pluginCtx);
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
      const pluginCtx = {
        ...ctx,
        pluginId: plugin.pluginId,
        siteConfig: ctx.siteConfig,
        pluginConfig: ctx.pluginConfig,
        thisPluginConfig: ctx.pluginConfig?.[plugin.pluginId] as Record<string, unknown> | undefined
      };
      const result = await plugin.onResolved(current, pluginCtx);
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
          thisPluginConfig: ctx.pluginConfig?.[plugin.pluginId] as Record<string, unknown> | undefined,
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
        thisPluginConfig: ctx.pluginConfig?.[plugin.pluginId] as Record<string, unknown> | undefined,
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
      await plugin.extendTemplates(Handlebars, {
        ...ctx,
        pluginId: plugin.pluginId,
        thisPluginConfig: ctx.pluginConfig?.[plugin.pluginId] as Record<string, unknown> | undefined,
      });
    } catch (err) {
      logError(ctx.logger, plugin.pluginId, "extendTemplates", err);
    }
  }
}

export async function runOnGeneratePages(
  plugins: LoadedPlugin[],
  site: Site,
  ctx: PluginContext,
  renderPage: RenderPage,
): Promise<void> {
  const tooLateAddReservedRoute = (segment: string) => {
    ctx.logger.warn("plugin.addReservedRoute.tooLate", { segment });
  };
  for (const plugin of plugins) {
    if (!plugin.onGeneratePages) continue;
    try {
      const pluginCtx = {
        ...ctx,
        pluginId: plugin.pluginId,
        thisPluginConfig: ctx.pluginConfig?.[plugin.pluginId] as Record<string, unknown> | undefined,
        addReservedRoute: tooLateAddReservedRoute,
        renderPage,
      };
      await plugin.onGeneratePages(site, pluginCtx);
    } catch (err) {
      logError(ctx.logger, plugin.pluginId, "onGeneratePages", err);
    }
  }
}
