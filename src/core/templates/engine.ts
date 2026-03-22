/**
 * Handlebars template setup: registers partials/layouts and compiles the wrapper.
 */

import { readFile, readdir, stat } from "node:fs/promises";
import * as path from "node:path";
import Handlebars from "handlebars";
import { registerDefaultHelpers } from "./helpers";
import type { Logger } from "../../logging/logger";
import { runExtendTemplates } from "../../plugins/runner";
import type { LoadedPlugin, PluginContext } from "../../plugins/types";

/** Marks an error that has already been logged — the CLI catch-all should not re-log it. */
export class WebetteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebetteError";
  }
}

type TemplateResolution = {
  templatePath: string; // resolved wrapper path
  templatesRoot: string; // root that provided the wrapper
  render: (context: Record<string, unknown>) => string;
};

export type TemplatesRoots = {
  siteTemplatesRoot: string;
  hasSiteTemplates: boolean;
};

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveTemplatePath(
  candidates: string[],
  logger?: Logger
): Promise<{ templatePath: string; templatesRoot: string }> {
  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return { templatePath: candidate, templatesRoot: path.dirname(candidate) };
    }
  }
  const tried = candidates.map((c) => path.normalize(c)).join(", ");
  logger?.error("template.notFound", { paths: tried });
  throw new Error(`No template found. Looked for: ${tried}`);
}

export async function resolveTemplatesRoots(options: {
  rootDir: string;
  templatesRoot: string; // value from config (can be relative)
  siteTemplatesRoot?: string; // optional override for site templates root
  logger?: Logger;
}): Promise<TemplatesRoots> {
  const siteRootValue =
    typeof options.siteTemplatesRoot === "string" && options.siteTemplatesRoot.trim()
      ? options.siteTemplatesRoot.trim()
      : options.templatesRoot;
  const siteTemplatesRoot = path.isAbsolute(siteRootValue)
    ? siteRootValue
    : path.join(options.rootDir, siteRootValue);

  const hasSiteTemplates = await pathExists(siteTemplatesRoot);
  if (!hasSiteTemplates) {
    options.logger?.error("template.noTemplatesFolder", { path: siteTemplatesRoot });
    throw new WebetteError(`webette: no templates folder found at ${siteTemplatesRoot}`);
  }

  return { siteTemplatesRoot, hasSiteTemplates };
}

async function registerPartials(templatesRoot: string, logger?: Logger) {
  const partialsDir = path.join(templatesRoot, "partial");

  try {
    const entries = await readdir(partialsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (path.extname(entry.name).toLowerCase() !== ".hbs") continue;
      const name = path.parse(entry.name).name;
      const partialPath = path.join(partialsDir, entry.name);
      const source = await readFile(partialPath, "utf8");
      Handlebars.registerPartial(name, source);
    }
  } catch (err: any) {
    if (err?.code !== "ENOENT") {
      logger?.warn("template.partialsLoadFailed", {
        partialsDir,
        error: String(err),
      });
    }
  }
}

async function registerLayouts(templatesRoot: string, logger?: Logger) {
  const layoutsDir = path.join(templatesRoot, "layout");

  try {
    const entries = await readdir(layoutsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (path.extname(entry.name).toLowerCase() !== ".hbs") continue;
      const name = path.parse(entry.name).name;
      const layoutPath = path.join(layoutsDir, entry.name);
      const source = await readFile(layoutPath, "utf8");
      Handlebars.registerPartial(name, source);
    }
  } catch (err: any) {
    if (err?.code !== "ENOENT") {
      logger?.warn("template.layoutsLoadFailed", {
        layoutsDir,
        error: String(err),
      });
    }
  }
}

// Compile a Handlebars wrapper from site templates.
export async function createTemplateRenderer(options: {
  rootDir: string;
  defaultWrapperName: string;
  defaultLayoutName: string;
  templatesRoot: string; // from tool config
  siteTemplatesRoot?: string; // optional site templates root
  logger?: Logger;
  plugins?: LoadedPlugin[];
  pluginContext?: PluginContext;
}): Promise<TemplateResolution> {
  const layoutPartialName = path.parse(options.defaultLayoutName).name || options.defaultLayoutName;
  registerDefaultHelpers({ defaultLayoutName: layoutPartialName });

  const { siteTemplatesRoot } = await resolveTemplatesRoots({
    rootDir: options.rootDir,
    templatesRoot: options.templatesRoot,
    siteTemplatesRoot: options.siteTemplatesRoot,
    logger: options.logger,
  });

  await registerLayouts(siteTemplatesRoot, options.logger);
  await registerPartials(siteTemplatesRoot, options.logger);

  if (options.plugins && options.plugins.length && options.pluginContext) {
    await runExtendTemplates(options.plugins, options.pluginContext);
  }

  const wrapperCandidates = [
    path.join(siteTemplatesRoot, options.defaultWrapperName),
  ];

  const { templatePath, templatesRoot } = await resolveTemplatePath(
    wrapperCandidates,
    options.logger
  );
  const templatePathForLog =
    path.relative(options.rootDir, templatePath) || templatePath;
  const templatesRootForLog =
    path.relative(options.rootDir, templatesRoot) || templatesRoot;
  options.logger?.debug("template.resolved", {
    kind: "wrapper",
    templatePath: templatePathForLog,
    templatesRoot: templatesRootForLog,
  });

  const layoutCandidates = [
    path.join(siteTemplatesRoot, options.defaultLayoutName),
  ];
  const layoutResolution = await resolveTemplatePath(layoutCandidates, options.logger);
  const layoutPathForLog =
    path.relative(options.rootDir, layoutResolution.templatePath) ||
    layoutResolution.templatePath;
  const layoutRootForLog =
    path.relative(options.rootDir, layoutResolution.templatesRoot) ||
    layoutResolution.templatesRoot;
  options.logger?.debug("template.resolved", {
    kind: "layout",
    templatePath: layoutPathForLog,
    templatesRoot: layoutRootForLog,
  });

  const templateSource = await readFile(templatePath, "utf8");
  const compiled = Handlebars.compile(templateSource);

  return {
    templatePath,
    templatesRoot,
    render: (context) => compiled(context),
  };
}
