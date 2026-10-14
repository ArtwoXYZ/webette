/**
 * Tool configuration (`webette.tool.ts`) loading + defaults.
 */

import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { normalizeLocale, type Locale } from "../logging/i18n";
import { loadDefaultExportFresh } from "../utils/load-module";

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
    outputDirName: string;
    overwrite: OverwritePolicy;
    protectAssets: boolean;
    writeHtaccess: boolean;
    writeNginxSample: boolean;
    generateIndex: boolean;
    exportModel: {
      only: boolean;
    };
    readContent: boolean;
    prettyPrint: boolean;
    includeDrafts: boolean;
  };
  templates: {
    root: string;
    default: {
      wrapper: string;
      layout: string;
      index: string;
      notFound: string;
      accessForbidden: string;
    };
  };
}

type WebetteEnvOverrides = Partial<{
  logging: Partial<Pick<WebetteEnv["logging"], "level" | "locale" | "dirName">>;
  serve: Partial<
    Pick<WebetteEnv["serve"], "port" | "liveReloadIntervalMs" | "watcherDebounceMs">
  >;
  build: Partial<
    Pick<
      WebetteEnv["build"],
      | "outputDirName"
      | "overwrite"
      | "exportModel"
      | "readContent"
      | "prettyPrint"
      | "generateIndex"
      | "includeDrafts"
      | "protectAssets"
      | "writeHtaccess"
      | "writeNginxSample"
    >
  >;
}>;

const defaultEnv: WebetteEnv = {
  logging: {
    level: "info",
    locale: "en",
    dirName: ".webette",
  },
  serve: {
    port: 4174,
    liveReloadIntervalMs: 1000,
    watcherDebounceMs: 150,
  },
  build: {
    outputDirName: "_public",
    overwrite: "replace-all",
    protectAssets: true,
    writeHtaccess: false,
    writeNginxSample: false,
    generateIndex: true,
    exportModel: {
      only: false,
    },
    readContent: true,
    prettyPrint: true,
    includeDrafts: true,
  },
  templates: {
    root: "templates",
    default: {
      wrapper: "wrapper/wrapper.hbs",
      layout: "layout/post.hbs",
      index: "layout/index.hbs",
      notFound: "layout/not-found.hbs",
      accessForbidden: "layout/access-forbidden.hbs",
    },
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

function warnInvalid(
  warnings: ConfigWarning[],
  field: string,
  value: unknown,
  expected: string,
  defaultVal: unknown
) {
  warnings.push({
    key: "config.tool.invalidValue",
    params: { field, value: String(value), expected, default: String(defaultVal) },
  });
}

function warnIfNotNumber(
  warnings: ConfigWarning[],
  field: string,
  value: unknown,
  defaultVal: number
) {
  if (value !== undefined && typeof value !== "number") {
    warnInvalid(warnings, field, value, "number", defaultVal);
  }
}

/**
 * Output and log folders are names inside the site folder. Anything
 * that could point elsewhere (absolute path, `..`, the site folder
 * itself) is refused: `overwrite: "replace-all"` empties the output
 * folder, and webette must never write or delete outside the site.
 */
function isSiteFolderName(value: string): boolean {
  if (path.isAbsolute(value) || path.win32.isAbsolute(value)) return false;
  const segments = value.split(/[\\/]/).filter(Boolean);
  return segments.length > 0 && segments.every((s) => s !== "." && s !== "..");
}

function siteFolderName(
  warnings: ConfigWarning[],
  field: string,
  value: unknown,
  defaultVal: string
): string {
  if (typeof value !== "string" || value === "") return defaultVal;
  if (isSiteFolderName(value)) return value;
  warnInvalid(warnings, field, value, "a folder name inside the site folder", defaultVal);
  return defaultVal;
}

function mergeEnv(defaults: WebetteEnv, overrides: WebetteEnvOverrides, warnings: ConfigWarning[]): WebetteEnv {
  const loggingLevel = overrides.logging?.level;
  const loggingLocale = overrides.logging?.locale;

  if (loggingLevel !== undefined && !isLogLevel(loggingLevel)) {
    warnInvalid(warnings, "logging.level", loggingLevel, validLogLevels.join(" | "), defaults.logging.level);
  }
  if (loggingLocale !== undefined && !isLocale(loggingLocale)) {
    warnInvalid(warnings, "logging.locale", loggingLocale, "en | fr", defaults.logging.locale);
  }

  const logging = {
    ...defaults.logging,
    ...(isLogLevel(loggingLevel) ? { level: loggingLevel } : {}),
    ...(isLocale(loggingLocale) ? { locale: loggingLocale } : {}),
    dirName: siteFolderName(
      warnings,
      "logging.dirName",
      overrides.logging?.dirName,
      defaults.logging.dirName
    ),
  };

  const port = overrides.serve?.port;
  const liveReloadIntervalMs = overrides.serve?.liveReloadIntervalMs;
  const watcherDebounceMs = overrides.serve?.watcherDebounceMs;

  warnIfNotNumber(warnings, "serve.port", port, defaults.serve.port);
  warnIfNotNumber(warnings, "serve.liveReloadIntervalMs", liveReloadIntervalMs, defaults.serve.liveReloadIntervalMs);
  warnIfNotNumber(warnings, "serve.watcherDebounceMs", watcherDebounceMs, defaults.serve.watcherDebounceMs);

  const serve = {
    ...defaults.serve,
    ...(typeof port === "number" ? { port } : {}),
    ...(typeof liveReloadIntervalMs === "number" ? { liveReloadIntervalMs } : {}),
    ...(typeof watcherDebounceMs === "number" ? { watcherDebounceMs } : {}),
  };

  const overwritePolicy = overrides.build?.overwrite;
  if (overwritePolicy !== undefined && !isOverwritePolicy(overwritePolicy)) {
    warnInvalid(warnings, "build.overwrite", overwritePolicy, "none | replace-all | replace-files", defaults.build.overwrite);
  }

  const build = {
    ...defaults.build,
    outputDirName: siteFolderName(
      warnings,
      "build.outputDirName",
      overrides.build?.outputDirName,
      defaults.build.outputDirName
    ),
    ...(isOverwritePolicy(overwritePolicy) ? { overwrite: overwritePolicy } : {}),
    ...(overrides.build?.exportModel &&
      typeof overrides.build.exportModel === "object"
      ? {
        exportModel: {
          ...defaults.build.exportModel,
          ...(typeof overrides.build.exportModel.only === "boolean"
            ? { only: overrides.build.exportModel.only }
            : {}),
        },
      }
      : {}),
    ...(typeof overrides.build?.readContent === "boolean"
      ? { readContent: overrides.build.readContent }
      : {}),
    ...(typeof overrides.build?.prettyPrint === "boolean"
      ? { prettyPrint: overrides.build.prettyPrint }
      : {}),
    ...(typeof overrides.build?.includeDrafts === "boolean"
      ? { includeDrafts: overrides.build.includeDrafts }
      : {}),
    ...(typeof overrides.build?.generateIndex === "boolean"
      ? { generateIndex: overrides.build.generateIndex }
      : {}),
    ...(typeof overrides.build?.protectAssets === "boolean"
      ? { protectAssets: overrides.build.protectAssets }
      : {}),
    ...(typeof overrides.build?.writeHtaccess === "boolean"
      ? { writeHtaccess: overrides.build.writeHtaccess }
      : {}),
    ...(typeof overrides.build?.writeNginxSample === "boolean"
      ? { writeNginxSample: overrides.build.writeNginxSample }
      : {}),
  };

  return { logging, serve, build, templates: defaults.templates };
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
    candidates.push(path.join(toolRoot, "webette.tool.ts"));
  }

  // 2) current working directory (typical use when running from repo root)
  candidates.push(path.join(process.cwd(), "webette.tool.ts"));

  // 3) directory of this file (fallback when bundled/installed elsewhere)
  const here = path.dirname(fileURLToPath(import.meta.url));
  candidates.push(path.join(here, "..", "..", "webette.tool.ts"));

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

export interface ConfigWarning {
  key: string;
  params: Record<string, unknown>;
}

export const env: WebetteEnv = defaultEnv;

export async function getEnv(toolRoot?: string): Promise<{ env: WebetteEnv; warnings: ConfigWarning[] }> {
  const configPath = resolveConfigPath(toolRoot);

  let overrides: WebetteEnvOverrides = {};
  const warnings: ConfigWarning[] = [];

  if (configPath) {
    try {
      const parsed = await loadDefaultExportFresh<WebetteEnvOverrides>(configPath);
      overrides = parsed && typeof parsed === "object" ? (parsed as WebetteEnvOverrides) : {};
    } catch (err) {
      warnings.push({
        key: "config.tool.loadFailed",
        params: { path: configPath, error: String(err) },
      });
    }
  }

  return { env: mergeEnv(defaultEnv, overrides, warnings), warnings };
}

export function resolveLocale(config: WebetteEnv): Locale {
  return normalizeLocale(
    config.logging.locale ?? process.env.WEBETTE_LANG ?? process.env.LANG
  );
}
