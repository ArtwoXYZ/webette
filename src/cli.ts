#!/usr/bin/env bun

/**
 * Webette CLI entrypoint (`build` / `serve`).
 */

import { build } from "./core/build";
import { serve } from "./core/serve";
import { createProjectLogger } from "./logging/logger";
import { getEnv } from "./config/env";
import { getVersion } from "./version";
import { WebetteError } from "./core/templates/engine";

type CliOptions = {
  verbose: boolean;
  exportModel?: {
    only?: boolean;
  };
  readContent?: boolean;
  includeDrafts?: boolean;
};

function parseArgs(argv: string[]) {
  const rawArgs = argv.slice(2);

  let verbose = false;
  const exportModel: CliOptions["exportModel"] = {};
  let readContent: boolean | undefined = undefined;
  let includeDrafts: boolean | undefined = undefined;

  const filtered: string[] = [];

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg === undefined) continue;

    if (arg === "--verbose" || arg === "-v") {
      verbose = true;
      continue;
    }

    if (arg === "--export-model-only") {
      exportModel.only = true;
      continue;
    }

    if (arg === "--skip-content") {
      readContent = false;
      continue;
    }

    if (arg === "--include-drafts") {
      includeDrafts = true;
      continue;
    }

    if (arg === "--no-include-drafts") {
      includeDrafts = false;
      continue;
    }

    filtered.push(arg);
  }

  const command = filtered[0];
  const sitePath = filtered[1];

  const options: CliOptions = {
    verbose,
    exportModel: Object.keys(exportModel).length ? exportModel : undefined,
    readContent,
    includeDrafts,
  };

  return { command, sitePath, options };
}

async function main() {
  const { command, sitePath, options } = parseArgs(Bun.argv);

  if (!command) {
    console.log(`webette ${getVersion()}`);
    console.log("Usage:");
    console.log("  webette build [site-folder]");
    console.log("  webette serve [site-folder]");
    console.log("");
    console.log("If no folder is provided, the current directory is used.");
    console.log("");
    console.log("Options:");
    console.log("  -v, --verbose             Show debug logs");
    console.log("  --export-model-only       Export the model and skip HTML generation");
    console.log("  --skip-content            Do not read/resolve block contents");
    console.log("  --include-drafts          Serve draft entries (default in serve)");
    console.log("  --no-include-drafts       Hide draft entries even in serve");
    return;
  }

  const rootDir = sitePath ?? process.cwd();

  // Load env first so warnings can be flushed through the logger after it's created.
  const { env: toolEnv, warnings: envWarnings } = await getEnv();
  const logger = await createProjectLogger(
    rootDir,
    `webette.cli.${command}`,
    options.verbose,
    toolEnv
  );
  for (const w of envWarnings) {
    logger.warn(w.key, w.params);
  }

  try {
    switch (command) {
      case "build":
        await build(rootDir, options, logger);
        break;

      case "serve":
        await serve(rootDir, options, logger);
        break;

      default:
        logger.error("cli.unknownCommand", { command });
        console.log("Available commands: build, serve");
        console.log("Options:");
        console.log("  -v, --verbose             Show debug logs");
        console.log("  --export-model-only       Export the model and skip HTML generation");
        console.log("  --skip-content            Do not read/resolve block contents");
        console.log("  --include-drafts          Serve draft entries (default in serve)");
        console.log("  --no-include-drafts       Hide draft entries even in serve");
        break;
    }
  } catch (error) {
    if (!(error instanceof WebetteError)) {
      logger.error("error.unexpected", { error: error instanceof Error ? error.message : String(error) });
    }
    process.exitCode = 1;
  }
}

await main();
