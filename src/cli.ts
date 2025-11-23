#!/usr/bin/env bun

import { build } from "./core/build";
import { serve } from "./core/serve";
import { createProjectLogger } from "./logging/logger";

type CliOptions = {
  verbose: boolean;
  exportModel?: {
    enabled?: boolean;
    path?: string;
    only?: boolean;
  };
};

function parseArgs(argv: string[]) {
  // Remove the first 2 entries (bun + script)
  const rawArgs = argv.slice(2);

  let verbose = false;
  const exportModel: CliOptions["exportModel"] = {};

  const filtered: string[] = [];

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg === undefined) continue;

    if (arg === "--verbose" || arg === "-v") {
      verbose = true;
      continue;
    }

    if (arg === "--export-model") {
      exportModel.enabled = true;
      const next = rawArgs[i + 1];
      if (next && !next.startsWith("-")) {
        exportModel.path = next;
        i++; // skip path value
      }
      continue;
    }

    if (arg.startsWith("--export-model=")) {
      exportModel.enabled = true;
      exportModel.path = arg.substring("--export-model=".length);
      continue;
    }

    if (arg === "--export-model-only") {
      exportModel.enabled = true;
      exportModel.only = true;
      const next = rawArgs[i + 1];
      if (next && !next.startsWith("-")) {
        exportModel.path = next;
        i++; // skip path value
      }
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
  };

  return { command, sitePath, options };
}

async function main() {
  const { command, sitePath, options } = parseArgs(Bun.argv);

  if (!command) {
    console.log("Webette v0.0.1");
    console.log("Usage:");
    console.log("  webette build [site-folder]");
    console.log("  webette serve [site-folder]");
    console.log("");
    console.log("If no folder is provided, the current directory is used.");
    console.log("");
    console.log("Options:");
    console.log("  -v, --verbose           Show debug logs");
    console.log("  --export-model [path]   Export the in-memory model to JSON");
    console.log("  --export-model-only     Export the model and skip HTML generation");
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
        console.log("  -v, --verbose     Show debug logs");
        break;
    }
  } catch (error) {
    logger.error("error.unexpected", { error: String(error) });
    process.exitCode = 1;
  }
}

await main();
