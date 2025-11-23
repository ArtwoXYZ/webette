import * as path from "node:path";
import { readFile } from "node:fs/promises";
import type { Site } from "./model";

interface WebetteConfigFile {
  site?: Record<string, unknown>;
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

    return { site: site as Record<string, unknown> | undefined };
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
  };

  return site;
}
