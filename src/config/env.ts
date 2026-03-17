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
    port: 4174, // Changed from 4173 to avoid EADDRINUSE error
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
    ...(typeof overrides.build?.outputDirName === "string" && overrides.build.outputDirName
      ? { outputDirName: overrides.build.outputDirName }
      : {}),
    ...(isOverwritePolicy(overrides.build?.overwrite)
      ? { overwrite: overrides.build.overwrite }
      : {}),
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

export const env: WebetteEnv = defaultEnv;

let warnedConfigLoadError = false;

export async function getEnv(toolRoot?: string): Promise<WebetteEnv> {
  const configPath = resolveConfigPath(toolRoot);

  let overrides: WebetteEnvOverrides = {};

  if (configPath) {
    try {
      const parsed = await loadDefaultExportFresh<WebetteEnvOverrides>(configPath);
      overrides = parsed && typeof parsed === "object" ? (parsed as WebetteEnvOverrides) : {};
    } catch (err) {
      if (!warnedConfigLoadError) {
        warnedConfigLoadError = true;
        const message = `webette: failed to load tool config at ${configPath}: ${String(err)}`;
        // eslint-disable-next-line no-console
        console.warn(message);
      }
    }
  }

  return mergeEnv(defaultEnv, overrides);
}

export function resolveLocale(config: WebetteEnv): Locale {
  return normalizeLocale(
    config.logging.locale ?? process.env.WEBETTE_LANG ?? process.env.LANG
  );
}
