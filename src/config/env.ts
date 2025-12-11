import { readFile } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { normalizeLocale, type Locale } from "../logging/i18n";

export type LogLevel = "debug" | "info" | "warn" | "error";
export type OverwritePolicy = "none" | "replace-all" | "replace-files";
export type ImageFormat = "webp" | "avif" | "jpeg" | "png";
export type ImageFit = "cover" | "contain" | "fill" | "inside" | "outside";

export interface ImagesEnv {
  requiresImageEngine: boolean;
  sizes: {
    small: number;
    medium: number;
    large: number;
  };
  format: ImageFormat;
  quality: number;
  fit: ImageFit;
  outputDir: string; // relative to the output directory (e.g. "assets/images")
  reencodeDefault: boolean;
}

export interface AudioEnv {
  outputDir: string; // relative to the output directory (e.g. "assets/audio")
}

export interface VideoEnv {
  outputDir: string; // relative to the output directory (e.g. "assets/video")
}

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
      enabled: boolean;
      dir: string;
      only: boolean;
    };
    readContent: boolean;
    prettyPrint: boolean;
  };
  templates: {
    root: string;
    defaultWrapper: string;
    defaultLayout: string;
    defaultIndexLayout: string;
    notFoundLayout: string;
    accessForbiddenLayout: string;
  };
  markdown: {
    remarkPlugins: unknown[];
    treatTxtAsMarkdown: boolean;
  };
  images: ImagesEnv;
  audio: AudioEnv;
  video: VideoEnv;
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
      | "protectAssets"
      | "writeHtaccess"
      | "writeNginxSample"
    >
  >;
  templates: Partial<
    Pick<
      WebetteEnv["templates"],
      "root" | "defaultWrapper" | "defaultLayout" | "defaultIndexLayout" | "notFoundLayout" | "accessForbiddenLayout"
    >
  >;
  markdown: Partial<
    Pick<WebetteEnv["markdown"], "remarkPlugins" | "treatTxtAsMarkdown">
  >;
  images: Partial<ImagesEnv>;
  audio: Partial<AudioEnv>;
  video: Partial<VideoEnv>;
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
    outputDirName: "_public",
    overwrite: "replace-all",
    protectAssets: true,
    writeHtaccess: false,
    writeNginxSample: false,
    generateIndex: true,
    exportModel: {
      enabled: false,
      dir: "_model",
      only: false,
    },
    readContent: true,
    prettyPrint: true,
  },
  templates: {
    root: "templates",
    defaultWrapper: "wrapper/wrapper.html",
    defaultLayout: "layout/post.html",
    defaultIndexLayout: "layout/index.html",
    notFoundLayout: "layout/not-found.html",
    accessForbiddenLayout: "layout/access-forbidden.html",
  },
  markdown: {
    remarkPlugins: [],
    treatTxtAsMarkdown: true,
  },
  images: {
    requiresImageEngine: false,
    sizes: {
      small: 480,
      medium: 960,
      large: 1440,
    },
    format: "webp",
    quality: 80,
    fit: "cover",
    outputDir: "assets/images",
    reencodeDefault: false,
  },
  audio: {
    outputDir: "assets/audio",
  },
  video: {
    outputDir: "assets/video",
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
            ...(typeof overrides.build.exportModel.enabled === "boolean"
              ? { enabled: overrides.build.exportModel.enabled }
              : {}),
            ...(typeof overrides.build.exportModel.dir === "string" &&
            overrides.build.exportModel.dir
              ? { dir: overrides.build.exportModel.dir }
              : {}),
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

  const templates = {
    ...defaults.templates,
    ...(typeof overrides.templates?.root === "string" && overrides.templates.root
      ? { root: overrides.templates.root }
      : {}),
    ...(typeof overrides.templates?.defaultWrapper === "string" &&
    overrides.templates.defaultWrapper
      ? { defaultWrapper: overrides.templates.defaultWrapper }
      : {}),
    ...(typeof overrides.templates?.defaultLayout === "string" &&
    overrides.templates.defaultLayout
      ? { defaultLayout: overrides.templates.defaultLayout }
      : {}),
    ...(typeof overrides.templates?.defaultIndexLayout === "string" &&
    overrides.templates.defaultIndexLayout
      ? { defaultIndexLayout: overrides.templates.defaultIndexLayout }
      : {}),
    ...(typeof overrides.templates?.notFoundLayout === "string" &&
    overrides.templates.notFoundLayout
      ? { notFoundLayout: overrides.templates.notFoundLayout }
      : {}),
    ...(typeof overrides.templates?.accessForbiddenLayout === "string" &&
    overrides.templates.accessForbiddenLayout
      ? { accessForbiddenLayout: overrides.templates.accessForbiddenLayout }
      : {}),
  };

  const markdown = {
    ...defaults.markdown,
    ...(Array.isArray(overrides.markdown?.remarkPlugins)
      ? { remarkPlugins: overrides.markdown.remarkPlugins }
      : {}),
    ...(typeof overrides.markdown?.treatTxtAsMarkdown === "boolean"
      ? { treatTxtAsMarkdown: overrides.markdown.treatTxtAsMarkdown }
      : {}),
  };

  const images = {
    ...defaults.images,
    ...(typeof overrides.images?.requiresImageEngine === "boolean"
      ? { requiresImageEngine: overrides.images.requiresImageEngine }
      : {}),
    sizes: {
      ...defaults.images.sizes,
      ...(overrides.images?.sizes &&
      typeof overrides.images.sizes === "object"
        ? (["small", "medium", "large"] as const).reduce(
            (acc, key) => {
              const value = (overrides.images?.sizes as Record<string, unknown>)[key];
              if (typeof value === "number" && value > 0) {
                acc[key] = value;
              }
              return acc;
            },
            {} as Partial<ImagesEnv["sizes"]>
          )
        : {}),
    },
    ...(typeof overrides.images?.format === "string" && overrides.images.format
      ? { format: overrides.images.format }
      : {}),
    ...(typeof overrides.images?.quality === "number"
      ? { quality: overrides.images.quality }
      : {}),
    ...(typeof overrides.images?.fit === "string" && overrides.images.fit
      ? { fit: overrides.images.fit }
      : {}),
    ...(typeof overrides.images?.outputDir === "string" && overrides.images.outputDir
      ? { outputDir: overrides.images.outputDir }
      : {}),
    ...(typeof overrides.images?.reencodeDefault === "boolean"
      ? { reencodeDefault: overrides.images.reencodeDefault }
      : {}),
  };

  const audio = {
    ...defaults.audio,
    ...(typeof overrides.audio?.outputDir === "string" && overrides.audio.outputDir
      ? { outputDir: overrides.audio.outputDir }
      : {}),
  };

  const video = {
    ...defaults.video,
    ...(typeof overrides.video?.outputDir === "string" && overrides.video.outputDir
      ? { outputDir: overrides.video.outputDir }
      : {}),
  };

  return { logging, serve, build, templates, markdown, images, audio, video };
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

export async function getEnv(toolRoot?: string): Promise<WebetteEnv> {
  const configPath = resolveConfigPath(toolRoot);

  let overrides: WebetteEnvOverrides = {};

  if (configPath) {
    try {
      const raw = await readFile(configPath, "utf8");
      const transpiled = new Bun.Transpiler({ loader: "ts" }).transformSync(raw);
      const dataUrl = `data:text/javascript;base64,${Buffer.from(transpiled).toString(
        "base64"
      )}?tool-config=${Date.now()}`;
      const mod = await import(dataUrl);
      const parsed = mod?.default ?? mod;
      overrides = parsed && typeof parsed === "object" ? (parsed as WebetteEnvOverrides) : {};
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
