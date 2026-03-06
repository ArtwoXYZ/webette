/**
 * Site config loader (`webette.config.ts`) and initial Site model creation.
 */

import * as path from "node:path";
import type { Site } from "./model";
import { loadDefaultExportFresh } from "../utils/load-module";

interface WebetteConfigFile {
  site?: Record<string, unknown>;
  collections?: Record<string, unknown>;
  templates?: Record<string, unknown>;
  images?: Record<string, unknown>;
  audio?: Record<string, unknown>;
  markdown?: Record<string, unknown>;
  sorting?: Record<string, unknown>;
  video?: Record<string, unknown>;
  plugins?: string[] | { dir: string };
}

// Build the in-memory Site object based on the project folder and config file

// reads webette.config.ts if present (default export)
async function loadConfigFile(rootDir: string): Promise<WebetteConfigFile> {
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
    const plugins =
      Array.isArray(raw.plugins) && raw.plugins.every((p: unknown) => typeof p === "string")
        ? [...raw.plugins]
        : typeof raw.plugins === "object" && raw.plugins !== null && typeof (raw.plugins as { dir?: string }).dir === "string"
        ? { dir: (raw.plugins as { dir: string }).dir }
        : undefined;

    return {
      site: site as Record<string, unknown> | undefined,
      collections: collections as Record<string, unknown> | undefined,
      templates: templates as Record<string, unknown> | undefined,
      images: images as Record<string, unknown> | undefined,
      audio: audio as Record<string, unknown> | undefined,
      video: video as Record<string, unknown> | undefined,
      markdown: markdown as Record<string, unknown> | undefined,
      sorting: sorting as Record<string, unknown> | undefined,
      plugins,
    };
  } catch {
    // no file or invalid module -> empty config
    return {};
  }
}

// function used by the rest of the codebase
export async function createSite(rootDir: string): Promise<Site> {
  const config = await loadConfigFile(rootDir);

  const siteSection: Record<string, unknown> =
    config.site && typeof config.site === "object" ? { ...config.site } : {};
  // Merge top-level sections into site metadata to keep consumers simple.
  if (config.images && typeof config.images === "object") {
    siteSection.images = {
      ...(siteSection.images as Record<string, unknown> | undefined),
      ...config.images,
    };
    const img = siteSection.images as Record<string, unknown>;
    if (typeof img.defaultVariant !== "string" || !img.defaultVariant.trim()) {
      img.defaultVariant = "default";
    } else {
      img.defaultVariant = img.defaultVariant.toLowerCase();
    }
  }
  if (config.audio && typeof config.audio === "object") {
    siteSection.audio = {
      ...(siteSection.audio as Record<string, unknown> | undefined),
      ...config.audio,
    };
  }
  if (config.video && typeof config.video === "object") {
    siteSection.video = {
      ...(siteSection.video as Record<string, unknown> | undefined),
      ...config.video,
    };
  }
  if (config.markdown && typeof config.markdown === "object") {
    siteSection.markdown = {
      ...(siteSection.markdown as Record<string, unknown> | undefined),
      ...config.markdown,
    };
  }
  if (config.sorting && typeof config.sorting === "object") {
    siteSection.sorting = {
      ...(siteSection.sorting as Record<string, unknown> | undefined),
      ...config.sorting,
    };
  }
  const plugins: string[] | { dir: string } | undefined =
    Array.isArray((config as any).plugins) && (config as any).plugins.every((p: unknown) => typeof p === "string")
      ? ((config as any).plugins as string[])
      : typeof (config as any).plugins === "object" && (config as any).plugins !== null && typeof ((config as any).plugins as { dir?: string }).dir === "string"
      ? { dir: ((config as any).plugins as { dir: string }).dir }
      : undefined;
  const collectionsConfig: Record<string, unknown> | undefined =
    config.collections && typeof config.collections === "object"
      ? { ...config.collections }
      : undefined;
  const templatesConfig: Record<string, unknown> | undefined =
    config.templates && typeof config.templates === "object"
      ? { ...config.templates }
      : undefined;

  // Apply minimal defaults for expected fields if absent
  if (typeof siteSection.title !== "string") {
    siteSection.title = "My Webette site";
  }
  if (typeof siteSection.lang !== "string") {
    siteSection.lang = "en";
  }

  const site: Site = {
    rootDir,
    site: siteSection,
    config: {
      collections: collectionsConfig,
      ...(plugins ? { plugins } : {}),
      ...(templatesConfig ? { templates: templatesConfig } : {}),
    },
  };

  return site;
}
