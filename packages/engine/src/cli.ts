#!/usr/bin/env bun

/**
 * Webette CLI entrypoint (`build` / `serve`).
 */

import { build } from "./core/build";
import { serve } from "./core/serve";
import { startApiServer } from "./core/api";
import { createProjectLogger, Logger } from "./logging/logger";
import { getEnv, resolveLocale } from "./config/env";
import { t, type Locale } from "./logging/i18n";
import { loadVersion } from "./version";
import { WebetteError } from "./core/templates/engine";

const supportsCliColor =
  typeof process !== "undefined" && Boolean(process.stdout?.isTTY);

function clr(ansi: string, text: string): string {
  return supportsCliColor ? `\x1b[${ansi}m${text}\x1b[0m` : text;
}

const MASCOT = `
                                      ▀▀▀▀▀▀
                                ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
                            ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
                          ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
                        ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
              ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
            ▀▀          ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
          ▀▀          ▀▀  ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
  ▀▀▀▀▀▀▀▀▀▀          ▀▀  ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
          ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
        ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
        ▀▀    ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
      ▀▀▀▀▀▀  ▀▀▀▀▀▀▀▀    ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
      ▀▀▀▀    ▀▀▀▀▀▀▀▀▀▀  ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
      ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀    ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
      ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
      ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
        ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
          ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
            ▀▀▀▀  ▀▀▀▀      ▀▀▀▀  ▀▀▀▀  ▀▀▀▀  ▀▀▀▀▀▀
            ▀▀▀▀  ▀▀▀▀      ▀▀▀▀  ▀▀▀▀  ▀▀▀▀  ▀▀▀▀
            ▀▀    ▀▀        ▀▀    ▀▀      ▀▀    ▀▀`;

type CliOptions = {
  verbose: boolean;
  exportModel?: {
    only?: boolean;
  };
  readContent?: boolean;
  includeDrafts?: boolean;
  share?: boolean;
  port?: number;
};

function parseArgs(argv: string[]) {
  const rawArgs = argv.slice(2);

  let verbose = false;
  const exportModel: CliOptions["exportModel"] = {};
  let readContent: boolean | undefined = undefined;
  let includeDrafts: boolean | undefined = undefined;
  let share: boolean | undefined = undefined;
  let port: number | undefined = undefined;

  const filtered: string[] = [];

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg === undefined) continue;

    if (arg === "--verbose" || arg === "-v") {
      verbose = true;
      continue;
    }

    if (arg === "--port") {
      const value = Number.parseInt(rawArgs[i + 1] ?? "", 10);
      if (!Number.isNaN(value)) {
        port = value;
        i++;
      }
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

    if (arg === "--share") {
      share = true;
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
    share,
    port,
  };

  return { command, sitePath, options };
}

function printHelp(locale: Locale, version: string): void {
  const name = clr("1;91", "webette");    // bold + bright red (accent)
  const ver  = clr("90", `v${version}`); // dim gray

  console.log(clr("2;32", MASCOT));
  console.log(`                           ${name}  ${ver}`);
  console.log();
  console.log(`  ${clr("2", t(locale, "cli.tagline"))}`);
  console.log();
  console.log(clr("1", t(locale, "cli.help.usage")));
  console.log(clr("90", t(locale, "cli.help.folderHint")));
  console.log();
  console.log(clr("1", t(locale, "cli.help.commands")));
  console.log(clr("32", t(locale, "cli.help.build")));
  console.log(clr("32", t(locale, "cli.help.serve")));
  console.log(clr("32", t(locale, "cli.help.api")));
  console.log(clr("32", t(locale, "cli.help.help")));
  console.log();
  console.log(clr("1", t(locale, "cli.help.options")));
  console.log(clr("33", t(locale, "cli.help.verbose")));
  console.log(clr("33", t(locale, "cli.help.exportModelOnly")));
  console.log(clr("33", t(locale, "cli.help.skipContent")));
  console.log(clr("33", t(locale, "cli.help.includeDrafts")));
  console.log(clr("33", t(locale, "cli.help.noIncludeDrafts")));
  console.log(clr("33", t(locale, "cli.help.share")));
  console.log();
}

async function main() {
  const { command, sitePath, options } = parseArgs(Bun.argv);

  // Resolve locale before any output so all user-visible strings are in the right language.
  const { env: toolEnv, warnings: envWarnings } = await getEnv();
  const locale = resolveLocale(toolEnv);

  if (!command || command === "help") {
    printHelp(locale, loadVersion());
    return;
  }

  const rootDir = sitePath ?? process.cwd();

  if (command === "api") {
    // Console-only logger: the API has no site of its own; each piloted
    // site gets its own project logger (writing to its .webette/).
    const apiLogger = new Logger({
      scope: "webette.cli.api",
      locale,
      minLevel: options.verbose ? "debug" : toolEnv.logging.level,
      compact: !options.verbose,
    });
    for (const w of envWarnings) {
      apiLogger.warn(w.key, w.params);
    }
    try {
      await startApiServer(
        { port: options.port, verbose: options.verbose },
        apiLogger
      );
      // Bun.serve keeps the process alive; Ctrl+C stops it.
    } catch (error) {
      apiLogger.error("error.unexpected", {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exitCode = 1;
    }
    return;
  }

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
        // Keep the CLI process alive: the serve handle owns the server
        // and watchers; Ctrl+C remains the way to stop.
        await new Promise<void>(() => { });
        break;

      default:
        logger.error("cli.unknownCommand", { command });
        printHelp(locale, loadVersion());
        process.exitCode = 1;
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
