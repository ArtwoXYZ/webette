#!/usr/bin/env bun

import { build } from "./core/build";
import { serve } from "./core/serve";
import { createProjectLogger } from "./logging/logger";

type CliOptions = {
  verbose: boolean;
};

function parseArgs(argv: string[]) {
  // Remove the first 2 entries (bun + script)
  const rawArgs = argv.slice(2);

  // Extract verbose flag
  const verbose = rawArgs.includes("--verbose") || rawArgs.includes("-v");

  // Remove flags from the "useful" args
  const filtered = rawArgs.filter(
    (arg) => arg !== "--verbose" && arg !== "-v"
  );

  const command = filtered[0];      // "build" or "serve"
  const sitePath = filtered[1];     // path to the site folder

  const options: CliOptions = { verbose };

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
