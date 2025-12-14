#!/usr/bin/env bun

import { build } from "./core/build";
import { serve } from "./core/serve";
import { createProjectLogger } from "./logging/logger";
import { getVersion } from "./version";

type CliOptions = {
  verbose: boolean;
  exportModel?: {
    only?: boolean;
  };
  readContent?: boolean;
  includeDrafts?: boolean; // serve-only flag to show/hide draft entries
};

function parseArgs(argv: string[]) {
  // Remove the first 2 entries (bun + script)
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

  // Remove flags from the "useful" args

  const command = filtered[0];      // "build" or "serve"
  const sitePath = filtered[1];     // path to the site folder

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

  // 🔹 NEW: create a logger for this project + this command
  const logger = await createProjectLogger(
    rootDir,
    `webette.cli.${command}`,
    options.verbose
  );

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
    logger.error("error.unexpected", { error: String(error) });
    process.exitCode = 1;
  }
}

await main();
