import * as path from "node:path";
import { readFile } from "node:fs/promises";
import type { Site } from "./model";

interface WebetteConfigFile {
  site?: {
    title?: string;
    lang?: string;
  };
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
      raw.site && typeof raw.site === "object"
        ? {
            title: typeof raw.site.title === "string" ? raw.site.title : undefined,
            lang: typeof raw.site.lang === "string" ? raw.site.lang : undefined,
          }
        : undefined;

    return { site };
  } catch {
    // no file or invalid module -> empty config
    return {};
  }
}

// function used by the rest of the codebase
export async function createSite(rootDir: string): Promise<Site> {
  const config = await loadConfigFile(rootDir);

  const site: Site = {
    rootDir,
    title: config.site?.title ?? "My Webette site",
    lang: config.site?.lang ?? "en",
  };

  return site;
}
