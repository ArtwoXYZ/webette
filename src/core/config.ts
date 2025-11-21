import { readFile } from "node:fs/promises";
import * as path from "node:path";
import type { Site } from "./model";

interface WebetteConfigFile {
  title?: string;
}

// Build the in-memory Site object based on the project folder and config file

// reads webette.config.json if present
async function loadConfigFile(rootDir: string): Promise<WebetteConfigFile> {
  const configPath = path.join(rootDir, "webette.config.json");

  try {
    const raw = await readFile(configPath, "utf8");
    const json = JSON.parse(raw);
    return {
      title: typeof json.title === "string" ? json.title : undefined,
    };
  } catch {
    // no file or invalid JSON -> empty config
    return {};
  }
}

// function used by the rest of the codebase
export async function createSite(rootDir: string): Promise<Site> {
  const config = await loadConfigFile(rootDir);

  const site: Site = {
    rootDir,
    title: config.title ?? "My Webette site",
  };

  return site;
}
