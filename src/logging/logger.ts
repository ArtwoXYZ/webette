/**
 * Structured logger (console + JSONL file), with i18n support.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { getEnv, resolveLocale, type WebetteEnv } from "../config/env";
import { t, normalizeLocale, type Locale } from "./i18n";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface PersistedLogRecord {
  timestamp: string;
  level: LogLevel;
  scope: string;
  messageKey: string;
  params?: Record<string, unknown>;
}

export interface LogRecord extends PersistedLogRecord {
  renderedMessage: string;
  locale: Locale;
}

const levelOrder: LogLevel[] = ["debug", "info", "warn", "error"];

function shouldLog(level: LogLevel, minLevel: LogLevel): boolean {
  return levelOrder.indexOf(level) >= levelOrder.indexOf(minLevel);
}

const supportsColor =
  typeof process !== "undefined" &&
  Boolean(process.stdout && process.stdout.isTTY);

function colorize(level: LogLevel, text: string): string {
  if (!supportsColor) return text;
  const reset = "\x1b[0m";
  const colors: Record<LogLevel, string> = {
    debug: "\x1b[90m", // gray
    info: "\x1b[36m",  // cyan
    warn: "\x1b[33m",  // yellow
    error: "\x1b[31m", // red
  };
  const color = colors[level] ?? "";
  return color ? `${color}${text}${reset}` : text;
}

function ensureDirExists(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export class Logger {
  private scope: string;
  private locale: Locale;
  private logFilePath?: string;
  private minLevel: LogLevel;

  constructor(options: {
    scope: string;
    locale: Locale;
    logFilePath?: string;
    minLevel?: LogLevel;
  }) {
    this.scope = options.scope;
    this.locale = options.locale;
    this.logFilePath = options.logFilePath;
    this.minLevel = options.minLevel ?? "info";
  }

  child(scope: string): Logger {
    return new Logger({
      scope: `${this.scope}.${scope}`,
      locale: this.locale,
      logFilePath: this.logFilePath,
      minLevel: this.minLevel,
    });
  }

  private emit(level: LogLevel, messageKey: string, params?: Record<string, unknown>) {
    if (!shouldLog(level, this.minLevel)) return;

    const timestamp = new Date().toISOString();
    const renderedMessage = t(this.locale, messageKey, params ?? {});

    const persisted: PersistedLogRecord = {
      timestamp,
      level,
      scope: this.scope,
      messageKey,
      params,
    };

    // Full log record with locale-specific rendered message.
    // Currently only used for console output, but kept as a structured object
    // so it can be forwarded elsewhere later (web UI, remote logging, etc.).
    const record: LogRecord = {
      ...persisted,
      renderedMessage,
      locale: this.locale,
    };

    // 1) Console output (in the selected language)
    const prefix = `[${timestamp}] [${this.scope}]`;
    const formatted = `${prefix} ${renderedMessage}`;
    const colored = colorize(level, formatted);
    switch (level) {
      case "debug":
        console.debug(colored);
        break;
      case "info":
        console.info(colored);
        break;
      case "warn":
        console.warn(colored);
        break;
      case "error":
        console.error(colored);
        break;
    }

    // 2) Persistence in .webette/logs.jsonl (neutral format)
    if (this.logFilePath) {
      const line = JSON.stringify(persisted) + "\n";
      fs.appendFileSync(this.logFilePath, line, "utf8");
    }
  }

  debug(key: string, params?: Record<string, unknown>) {
    this.emit("debug", key, params);
  }

  info(key: string, params?: Record<string, unknown>) {
    this.emit("info", key, params);
  }

  warn(key: string, params?: Record<string, unknown>) {
    this.emit("warn", key, params);
  }

  error(key: string, params?: Record<string, unknown>) {
    this.emit("error", key, params);
  }
}

/**
 * Factory used by the CLI.
 * - scope = "webette.cli.build" / "webette.cli.serve" etc.
 * - precomputedEnv?: pass a pre-loaded env to avoid a redundant getEnv() call
 */
export async function createProjectLogger(
  rootDir: string,
  scope: string,
  verbose: boolean,
  precomputedEnv?: WebetteEnv
): Promise<Logger> {
  const resolvedEnv = precomputedEnv ?? (await getEnv()).env;
  const locale = resolveLocale(resolvedEnv);
  const logsDir = path.join(rootDir, resolvedEnv.logging.dirName);
  ensureDirExists(logsDir);
  const logFilePath = path.join(logsDir, "logs.jsonl");

  return new Logger({
    scope,
    locale,
    logFilePath,
    minLevel: verbose ? "debug" : resolvedEnv.logging.level,
  });
}
