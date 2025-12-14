import { readFile, readdir, stat } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import Handlebars from "handlebars";
import { registerDefaultHelpers } from "./templates/helpers";
import type { Logger } from "../logging/logger";
import { runExtendTemplates } from "../plugins/runner";
import type { LoadedPlugin, PluginContext } from "../plugins/types";

type TemplateResolution = {
  templatePath: string; // resolved wrapper path
  templatesRoot: string; // root that provided the wrapper
  render: (context: Record<string, unknown>) => string;
};

export type TemplatesRoots = {
  siteTemplatesRoot: string;
  toolTemplatesRoot: string;
  effectiveRoot: string; // chosen root (site if present, else tool)
  source: "site" | "tool";
  hasSiteTemplates: boolean;
  toolRoot: string;
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
  logger?: Logger;
}): Promise<TemplatesRoots> {
  const toolRoot = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    ".."
  );

  const siteTemplatesRoot = path.isAbsolute(options.templatesRoot)
    ? options.templatesRoot
    : path.join(options.rootDir, options.templatesRoot);

  const toolTemplatesRoot = path.isAbsolute(options.templatesRoot)
    ? options.templatesRoot
    : path.join(toolRoot, options.templatesRoot);

  const hasSiteTemplates = await pathExists(siteTemplatesRoot);
  const source: TemplatesRoots["source"] = hasSiteTemplates ? "site" : "tool";
  const effectiveRoot = hasSiteTemplates ? siteTemplatesRoot : toolTemplatesRoot;

  return {
    siteTemplatesRoot,
    toolTemplatesRoot,
    effectiveRoot,
    source,
    hasSiteTemplates,
    toolRoot,
  };
}

async function registerPartials(templatesRoot: string, logger?: Logger) {
  const partialsDir = path.join(templatesRoot, "partial");

  try {
    const entries = await readdir(partialsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
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

// Compile a Handlebars wrapper from site or tool templates (site-first fallback to tool).
export async function createTemplateRenderer(options: {
  rootDir: string;
  defaultWrapperName: string;
  defaultLayoutName: string;
  templatesRoot: string; // from tool config
  logger?: Logger;
  plugins?: LoadedPlugin[];
  pluginContext?: PluginContext;
}): Promise<TemplateResolution> {
  const layoutPartialName = path.parse(options.defaultLayoutName).name || options.defaultLayoutName;
  registerDefaultHelpers({ defaultLayoutName: layoutPartialName });

  const {
    siteTemplatesRoot,
    toolTemplatesRoot,
    toolRoot,
  } = await resolveTemplatesRoots({
    rootDir: options.rootDir,
    templatesRoot: options.templatesRoot,
    logger: options.logger,
  });

  // Register shared partials and layouts: tool first, then site overrides.
  await registerLayouts(toolTemplatesRoot, options.logger);
  await registerPartials(toolTemplatesRoot, options.logger);
  await registerLayouts(siteTemplatesRoot, options.logger);
  await registerPartials(siteTemplatesRoot, options.logger);

  if (options.plugins && options.plugins.length && options.pluginContext) {
    await runExtendTemplates(options.plugins, options.pluginContext);
  }

  // Resolve default wrapper (site > tool)
  const wrapperCandidates = [
    path.join(siteTemplatesRoot, options.defaultWrapperName),
    path.join(toolTemplatesRoot, options.defaultWrapperName),
  ];

  const { templatePath, templatesRoot } = await resolveTemplatePath(
    wrapperCandidates,
    options.logger
  );
  const selectedSource =
    path.normalize(templatesRoot) === path.normalize(siteTemplatesRoot)
      ? "site"
      : "tool";
  const logBase = selectedSource === "site" ? options.rootDir : toolRoot;
  const templatePathForLog =
    path.relative(logBase, templatePath) || templatePath;
  const templatesRootForLog =
    path.relative(logBase, templatesRoot) || templatesRoot;
  options.logger?.debug("template.resolved", {
    kind: "wrapper",
    templatePath: templatePathForLog,
    templatesRoot: templatesRootForLog,
    source: selectedSource,
  });

  // Resolve default layout to confirm availability and log the source.
  const layoutCandidates = [
    path.join(siteTemplatesRoot, options.defaultLayoutName),
    path.join(toolTemplatesRoot, options.defaultLayoutName),
  ];
  const layoutResolution = await resolveTemplatePath(layoutCandidates, options.logger);
  const layoutSelectedSource =
    path.normalize(layoutResolution.templatesRoot) ===
    path.normalize(siteTemplatesRoot)
      ? "site"
      : "tool";
  const layoutLogBase =
    layoutSelectedSource === "site" ? options.rootDir : toolRoot;
  const layoutPathForLog =
    path.relative(layoutLogBase, layoutResolution.templatePath) ||
    layoutResolution.templatePath;
  const layoutRootForLog =
    path.relative(layoutLogBase, layoutResolution.templatesRoot) ||
    layoutResolution.templatesRoot;
  options.logger?.debug("template.resolved", {
    kind: "layout",
    templatePath: layoutPathForLog,
    templatesRoot: layoutRootForLog,
    source: layoutSelectedSource,
  });

  const templateSource = await readFile(templatePath, "utf8");
  const compiled = Handlebars.compile(templateSource);

  return {
    templatePath,
    templatesRoot,
    render: (context) => compiled(context),
  };
}
