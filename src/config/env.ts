import { readFile } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { normalizeLocale, type Locale } from "../logging/i18n";

export type LogLevel = "debug" | "info" | "warn" | "error";
export type OverwritePolicy = "none" | "replace-all" | "replace-files";

export interface WebetteEnv {
  logging: {
    level: LogLevel;
    locale: "en" | "fr";
    dirName: string;
  };
  serve: {
    port: number;
    liveReloadIntervalMs: number;
    watcherDebounceMs: number;
  };
  build: {
    ignoreNames: string[];
    outputDirName: string;
    overwrite: OverwritePolicy;
  };
}

type WebetteEnvOverrides = Partial<{
  logging: Partial<Pick<WebetteEnv["logging"], "level" | "locale" | "dirName">>;
  serve: Partial<
    Pick<WebetteEnv["serve"], "port" | "liveReloadIntervalMs" | "watcherDebounceMs">
  >;
  build: Partial<
    Pick<WebetteEnv["build"], "ignoreNames" | "outputDirName" | "overwrite">
  >;
}>;

const defaultEnv: WebetteEnv = {
  logging: {
    level: "info",
    locale: "en",
    dirName: ".webette",
  },
  serve: {
    port: 4173,
    liveReloadIntervalMs: 1000,
    watcherDebounceMs: 150,
  },
  build: {
    ignoreNames: ["_public", ".webette"],
    outputDirName: "_public",
    overwrite: "replace-files",
  },
};

const validLogLevels: LogLevel[] = ["debug", "info", "warn", "error"];
function isLogLevel(value: unknown): value is LogLevel {
  return typeof value === "string" && validLogLevels.includes(value as LogLevel);
}

function isLocale(value: unknown): value is "en" | "fr" {
  return value === "en" || value === "fr";
}

function isOverwritePolicy(value: unknown): value is OverwritePolicy {
  return value === "none" || value === "replace-all" || value === "replace-files";
}

function mergeEnv(defaults: WebetteEnv, overrides: WebetteEnvOverrides): WebetteEnv {
  const logging = {
    ...defaults.logging,
    ...(isLogLevel(overrides.logging?.level) ? { level: overrides.logging.level } : {}),
    ...(isLocale(overrides.logging?.locale) ? { locale: overrides.logging.locale } : {}),
    ...(typeof overrides.logging?.dirName === "string" && overrides.logging.dirName
      ? { dirName: overrides.logging.dirName }
      : {}),
  };

  const serve = {
    ...defaults.serve,
    ...(typeof overrides.serve?.port === "number" ? { port: overrides.serve.port } : {}),
    ...(typeof overrides.serve?.liveReloadIntervalMs === "number"
      ? { liveReloadIntervalMs: overrides.serve.liveReloadIntervalMs }
      : {}),
    ...(typeof overrides.serve?.watcherDebounceMs === "number"
      ? { watcherDebounceMs: overrides.serve.watcherDebounceMs }
      : {}),
  };

  const build = {
    ...defaults.build,
    ...(Array.isArray(overrides.build?.ignoreNames)
      ? {
          ignoreNames: overrides.build.ignoreNames.filter(
            (v): v is string => typeof v === "string" && v.length > 0
          ),
        }
      : {}),
    ...(typeof overrides.build?.outputDirName === "string" && overrides.build.outputDirName
      ? { outputDirName: overrides.build.outputDirName }
      : {}),
    ...(isOverwritePolicy(overrides.build?.overwrite)
      ? { overwrite: overrides.build.overwrite }
      : {}),
  };

  return { logging, serve, build };
}

function resolveConfigPath(toolRoot?: string): string | null {
  const explicit = process.env.WEBETTE_TOOL_CONFIG;
  if (explicit) {
    return path.isAbsolute(explicit)
      ? explicit
      : path.join(process.cwd(), explicit);
  }

  const candidates: string[] = [];

  // 1) toolRoot override (if provided explicitly by caller)
  if (toolRoot) {
    candidates.push(path.join(toolRoot, "webette.tool.json"));
  }

  // 2) current working directory (typical use when running from repo root)
  candidates.push(path.join(process.cwd(), "webette.tool.json"));

  // 3) directory of this file (fallback when bundled/installed elsewhere)
  const here = path.dirname(fileURLToPath(import.meta.url));
  candidates.push(path.join(here, "..", "..", "webette.tool.json"));

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

export const env: WebetteEnv = defaultEnv;

export async function getEnv(toolRoot?: string): Promise<WebetteEnv> {
  const configPath = resolveConfigPath(toolRoot);

  let overrides: WebetteEnvOverrides = {};

  if (configPath) {
    try {
      const raw = await readFile(configPath, "utf8");
      const cleaned = raw.replace(/^\uFEFF/, "");
      overrides = JSON.parse(cleaned);
    } catch {
      // ignore and fall back to defaults
    }
  }

  return mergeEnv(defaultEnv, overrides);
}

export function resolveLocale(config: WebetteEnv): Locale {
  return normalizeLocale(
    config.logging.locale ?? process.env.WEBETTE_LANG ?? process.env.LANG
  );
}
