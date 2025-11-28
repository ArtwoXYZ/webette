import * as path from "node:path";
import { readFile } from "node:fs/promises";
import type { Site } from "./model";

interface WebetteConfigFile {
  site?: Record<string, unknown>;
  collections?: Record<string, unknown>;
  images?: Record<string, unknown>;
  audio?: Record<string, unknown>;
}

// Build the in-memory Site object based on the project folder and config file

// reads webette.config.ts if present (default export)
async function loadConfigFile(rootDir: string): Promise<WebetteConfigFile> {
  const configPath = path.join(rootDir, "webette.config.ts");

  try {
    const source = await readFile(configPath, "utf8");
    const transpiled = new Bun.Transpiler({ loader: "ts" }).transformSync(source);
    const dataUrl = `data:text/javascript;base64,${Buffer.from(transpiled).toString(
      "base64"
    )}?ts-config=${Date.now()}`;
    const mod = await import(dataUrl);
    const raw = mod?.default ?? mod;

    if (!raw || typeof raw !== "object") {
      return {};
    }

    const site =
      raw.site && typeof raw.site === "object" ? { ...raw.site } : undefined;
    const collections =
      raw.collections && typeof raw.collections === "object"
        ? { ...raw.collections }
        : undefined;
    const images =
      raw.images && typeof raw.images === "object"
        ? { ...raw.images }
        : undefined;
    const audio =
      raw.audio && typeof raw.audio === "object"
        ? { ...raw.audio }
        : undefined;

    return {
      site: site as Record<string, unknown> | undefined,
      collections: collections as Record<string, unknown> | undefined,
      images: images as Record<string, unknown> | undefined,
      audio: audio as Record<string, unknown> | undefined,
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
  if (config.images && typeof config.images === "object") {
    siteSection.images = { ...(siteSection.images as Record<string, unknown> | undefined), ...config.images };
  }
  if (config.audio && typeof config.audio === "object") {
    siteSection.audio = { ...(siteSection.audio as Record<string, unknown> | undefined), ...config.audio };
  }
  const collectionsConfig: Record<string, unknown> | undefined =
    config.collections && typeof config.collections === "object"
      ? { ...config.collections }
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
    },
  };

  return site;
}
