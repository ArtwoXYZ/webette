import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { getEnv, resolveLocale } from "../config/env";
import { t } from "../logging/i18n";
import { createSite } from "./config";
import { scanSite } from "./scan";
import { renderTemplate } from "./template";
import type { Logger } from "../logging/logger";

export interface BuildOptions {
  verbose: boolean;
  liveReload?: boolean; // enabled only in "serve" mode
  quiet?: boolean;      // new: fewer logs when true
}

export async function build(
  rootDir: string,
  options: BuildOptions,
  logger: Logger
): Promise<void> {
  const scoped = logger.child("build");
  const toolEnv = await getEnv();
  const locale = resolveLocale(toolEnv);

  scoped.debug("build.start", { rootDir });

  const site = await createSite(rootDir);
  scoped.debug("build.siteLoaded", { title: site.title });

  const scannedSite = await scanSite(site);
  const outputDir = path.join(rootDir, toolEnv.build.outputDirName);
  const overwrite = toolEnv.build.overwrite;

  // Handle existing output directory according to policy
  let outputDirExists = false;
  try {
    const dirStat = await stat(outputDir);
    if (!dirStat.isDirectory()) {
      const message = t(locale, "build.outputNotDirectory", { outputDir });
      scoped.error("build.outputNotDirectory", { outputDir });
      throw new Error(message);
    }
    outputDirExists = true;
  } catch (err: any) {
    if (err?.code !== "ENOENT") {
      scoped.error("build.mkdirFailed", {
        outputDir,
        error: String(err),
      });
      throw err;
    }
  }

  if (outputDirExists) {
    scoped.debug("build.outputDirExists", { outputDir });
    switch (overwrite) {
      case "none":
        scoped.error("build.overwriteDenied", { outputDir });
        throw new Error(t(locale, "build.overwriteDenied", { outputDir }));
      case "replace-all":
        await rm(outputDir, { recursive: true, force: true });
        break;
      case "replace-files":
        // keep directory, individual files handled below
        break;
      default:
        break;
    }
  }

  try {
    await mkdir(outputDir, { recursive: true });
  } catch (err: any) {
    if (err?.code !== "EEXIST") {
      scoped.error("build.mkdirFailed", {
        outputDir,
        error: String(err),
      });
      throw err;
    }
    // Directory already exists: not fatal when recursive, continue
    scoped.debug("build.outputDirExists", { outputDir });
  }

  const liveReloadScript = options.liveReload
    ? `
  <script>
    (function () {
      let lastVersion = null;
      async function check() {
        try {
          const res = await fetch("/__webette-version", { cache: "no-store" });
          if (!res.ok) return;
          const text = await res.text();
          if (lastVersion === null) {
            lastVersion = text;
          } else if (lastVersion !== text) {
            location.reload();
          }
        } catch (e) {
          // Non-fatal: we will retry later
        }
      }
      setInterval(check, ${toolEnv.serve.liveReloadIntervalMs});
      check();
    })();
  </script>`
    : "";

  const templatesRoot = path.isAbsolute(toolEnv.templates.root)
    ? toolEnv.templates.root
    : path.join(process.cwd(), toolEnv.templates.root);

  const templatePath = path.join(templatesRoot, toolEnv.templates.default);

  let template: string;
  try {
    template = await readFile(templatePath, "utf8");
  } catch (err: any) {
    scoped.error("build.templateReadFailed", {
      templatePath,
      error: String(err),
    });
    throw err;
  }

  const html = renderTemplate(template, {
    title: scannedSite.title,
    lang: scannedSite.lang || "en",
    liveReloadScript,
  });

  const indexPath = path.join(outputDir, "index.html");
  await writeFile(indexPath, html, "utf8");
  scoped.debug("build.fileGenerated", { path: indexPath });

  if (options.quiet) {
    scoped.debug("build.success", { path: indexPath });
  } else {
    scoped.info("build.success", { path: indexPath });
  }
}
