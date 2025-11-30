import { readFile, readdir, stat } from "node:fs/promises";
import * as path from "node:path";
import Handlebars from "handlebars";
import { registerDefaultHelpers } from "./templates/helpers";
import type { Logger } from "../logging/logger";

type TemplateResolution = {
  templatePath: string;
  templatesRoot: string;
  render: (context: Record<string, unknown>) => string;
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

async function registerPartials(templatesRoot: string, logger?: Logger) {
  const partialsDir = path.join(templatesRoot, "partials");

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

// Compile a Handlebars template from site or tool templates (site-first fallback to tool).
export async function createTemplateRenderer(options: {
  rootDir: string;
  defaultTemplateName: string;
  templatesRoot: string; // from tool config
  logger?: Logger;
}): Promise<TemplateResolution> {
  registerDefaultHelpers();

  const siteTemplatesRoot = path.isAbsolute(options.templatesRoot)
    ? options.templatesRoot
    : path.join(options.rootDir, options.templatesRoot);

  const toolTemplatesRoot = path.isAbsolute(options.templatesRoot)
    ? options.templatesRoot
    : path.join(process.cwd(), options.templatesRoot);

  const candidates = [
    path.join(siteTemplatesRoot, options.defaultTemplateName),
    path.join(toolTemplatesRoot, options.defaultTemplateName),
  ];

  const { templatePath, templatesRoot } = await resolveTemplatePath(
    candidates,
    options.logger
  );
  // Register partials after the final templates root is chosen.
  await registerPartials(templatesRoot, options.logger);

  const source = await readFile(templatePath, "utf8");
  const compiled = Handlebars.compile(source);

  return {
    templatePath,
    templatesRoot,
    render: (context) => compiled(context),
  };
}
