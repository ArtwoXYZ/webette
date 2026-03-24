/**
 * Site config loader (`webette.config.ts`) and initial Site model creation.
 */

import * as path from "node:path";
import type { Site, SortingConfig } from "../core/model";
import { loadDefaultExportFresh } from "../utils/load-module";
import type { Logger } from "../logging/logger";

interface WebetteConfigFile {
  site?: Record<string, unknown>;
  collections?: Record<string, unknown>;
  templates?: Record<string, unknown>;
  images?: Record<string, unknown>;
  audio?: Record<string, unknown>;
  markdown?: Record<string, unknown>;
  sorting?: SortingConfig;
  video?: Record<string, unknown>;
  plugins?: string[] | { dir: string };
  pluginConfig?: Record<string, unknown>;
  tags?: Record<string, unknown>;
}

async function loadConfigFile(rootDir: string, logger: Logger): Promise<WebetteConfigFile> {
  const configPath = path.join(rootDir, "webette.config.ts");

  try {
    // Bun caches ESM by path (ignores query/hash), so we load via Bun.build + data: import.
    const raw = await loadDefaultExportFresh<Record<string, unknown>>(configPath);

    if (!raw || typeof raw !== "object") {
      return {};
    }

    const site =
      raw.site && typeof raw.site === "object" ? { ...raw.site } : undefined;
    const collections =
      raw.collections && typeof raw.collections === "object"
        ? { ...raw.collections }
        : undefined;
    const templates =
      raw.templates && typeof raw.templates === "object"
        ? { ...raw.templates }
        : undefined;
    const images =
      raw.images && typeof raw.images === "object"
        ? { ...raw.images }
        : undefined;
    const audio =
      raw.audio && typeof raw.audio === "object"
        ? { ...raw.audio }
        : undefined;
    const video =
      raw.video && typeof raw.video === "object"
        ? { ...raw.video }
        : undefined;
    const markdown =
      raw.markdown && typeof raw.markdown === "object"
        ? { ...raw.markdown }
        : undefined;
    const sorting =
      raw.sorting && typeof raw.sorting === "object"
        ? { ...raw.sorting }
        : undefined;

    let plugins: WebetteConfigFile["plugins"] = undefined;
    if (raw.plugins !== undefined) {
      if (Array.isArray(raw.plugins) && raw.plugins.every((p: unknown) => typeof p === "string")) {
        plugins = [...raw.plugins];
      } else if (
        typeof raw.plugins === "object" &&
        raw.plugins !== null &&
        typeof (raw.plugins as { dir?: string }).dir === "string"
      ) {
        plugins = { dir: (raw.plugins as { dir: string }).dir };
      } else {
        logger.warn("config.site.pluginsInvalidFormat", {
          type: Array.isArray(raw.plugins) ? "array (non-string items)" : typeof raw.plugins,
        });
      }
    }

    const pluginConfig =
      raw.pluginConfig && typeof raw.pluginConfig === 'object' && !Array.isArray(raw.pluginConfig)
        ? { ...(raw.pluginConfig as Record<string, unknown>) }
        : undefined;

    const tags =
      raw.tags && typeof raw.tags === 'object' && !Array.isArray(raw.tags)
        ? { ...(raw.tags as Record<string, unknown>) }
        : undefined;

    return {
      site: site as Record<string, unknown> | undefined,
      collections: collections as Record<string, unknown> | undefined,
      templates: templates as Record<string, unknown> | undefined,
      images: images as Record<string, unknown> | undefined,
      audio: audio as Record<string, unknown> | undefined,
      video: video as Record<string, unknown> | undefined,
      markdown: markdown as Record<string, unknown> | undefined,
      sorting: sorting as SortingConfig | undefined,
      plugins,
      pluginConfig,
      tags,
    };
  } catch (err) {
    logger.warn("config.site.loadFailed", {
      path: configPath,
      error: String(err),
    });
    return {};
  }
}

export async function createSite(rootDir: string, logger: Logger): Promise<Site> {
  const config = await loadConfigFile(rootDir, logger);

  const siteSection: Record<string, unknown> =
    config.site && typeof config.site === "object" ? { ...config.site } : {};

  const plugins: string[] | { dir: string } | undefined = config.plugins;
  const collectionsConfig: Record<string, unknown> | undefined =
    config.collections && typeof config.collections === "object"
      ? { ...config.collections }
      : undefined;
  const templatesConfig: Record<string, unknown> | undefined =
    config.templates && typeof config.templates === "object"
      ? { ...config.templates }
      : undefined;

  if (typeof siteSection.title !== "string") {
    siteSection.title = "My Webette site";
  }
  if (typeof siteSection.lang !== "string") {
    siteSection.lang = "en";
  }

  const rawConfig: Record<string, unknown> = {
    ...(config.site ? { site: config.site } : {}),
    ...(config.collections ? { collections: config.collections } : {}),
    ...(config.templates ? { templates: config.templates } : {}),
    ...(config.images ? { images: config.images } : {}),
    ...(config.audio ? { audio: config.audio } : {}),
    ...(config.video ? { video: config.video } : {}),
    ...(config.markdown ? { markdown: config.markdown } : {}),
    ...(config.sorting ? { sorting: config.sorting } : {}),
    ...(plugins ? { plugins } : {}),
    ...(config.pluginConfig ? { pluginConfig: config.pluginConfig } : {}),
    ...(config.tags ? { tags: config.tags } : {}),
  };

  const site: Site = {
    rootDir,
    site: siteSection,
    config: {
      collections: collectionsConfig,
      ...(plugins ? { plugins } : {}),
      ...(templatesConfig ? { templates: templatesConfig } : {}),
      ...(config.pluginConfig ? { pluginConfig: config.pluginConfig } : {}),
      ...(config.tags ? { tags: config.tags } : {}),
      ...(config.images ? { images: config.images } : {}),
      ...(config.audio ? { audio: config.audio } : {}),
      ...(config.video ? { video: config.video } : {}),
      ...(config.markdown ? { markdown: config.markdown } : {}),
      ...(config.sorting ? { sorting: config.sorting } : {}),
      rawConfig,
    },
  };

  return site;
}
