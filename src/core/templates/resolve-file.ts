/**
 * Template file resolution (site-first, tool fallback).
 *
 * Resolves a relative template path and returns its concrete file path + source.
 */

import { stat } from "node:fs/promises";
import * as path from "node:path";
import type { Logger } from "../../logging/logger";
import type { TemplatesRoots } from "../template";

export type ResolvedTemplateFile = {
  templatePath: string;
  templatesRoot: string;
  source: "site" | "tool";
};

export type TemplateFileResolver = {
  resolve: (relPath: string) => Promise<ResolvedTemplateFile | null>;
  triedPaths: (relPath: string) => string[];
  logResolved: (options: {
    kind: string;
    relPath: string;
    extra?: Record<string, unknown>;
  }) => Promise<ResolvedTemplateFile | null>;
};

async function isFile(filePath: string): Promise<boolean> {
  try {
    const s = await stat(filePath);
    return s.isFile();
  } catch {
    return false;
  }
}

export function createTemplateFileResolver(options: {
  rootDir: string;
  templatesRoots: TemplatesRoots;
  logger: Logger;
}): TemplateFileResolver {
  const { rootDir, templatesRoots, logger } = options;
  const cache = new Map<string, ResolvedTemplateFile | null>();

  const triedPaths = (relPath: string) => [
    path.normalize(path.join(templatesRoots.siteTemplatesRoot, relPath)),
    path.normalize(path.join(templatesRoots.toolTemplatesRoot, relPath)),
  ];

  const resolve = async (relPath: string): Promise<ResolvedTemplateFile | null> => {
    const normalizedRel = String(relPath ?? "").trim();
    if (!normalizedRel) return null;
    if (cache.has(normalizedRel)) return cache.get(normalizedRel) ?? null;

    const siteCandidate = path.join(templatesRoots.siteTemplatesRoot, normalizedRel);
    if (await isFile(siteCandidate)) {
      const resolved: ResolvedTemplateFile = {
        templatePath: siteCandidate,
        templatesRoot: templatesRoots.siteTemplatesRoot,
        source: "site",
      };
      cache.set(normalizedRel, resolved);
      return resolved;
    }

    const toolCandidate = path.join(templatesRoots.toolTemplatesRoot, normalizedRel);
    if (await isFile(toolCandidate)) {
      const resolved: ResolvedTemplateFile = {
        templatePath: toolCandidate,
        templatesRoot: templatesRoots.toolTemplatesRoot,
        source: "tool",
      };
      cache.set(normalizedRel, resolved);
      return resolved;
    }

    cache.set(normalizedRel, null);
    return null;
  };

  const logResolved = async (args: {
    kind: string;
    relPath: string;
    extra?: Record<string, unknown>;
  }): Promise<ResolvedTemplateFile | null> => {
    const resolved = await resolve(args.relPath);
    if (!resolved) return null;

    const logBase = resolved.source === "site" ? rootDir : templatesRoots.toolRoot;
    const templatePathForLog =
      path.relative(logBase, resolved.templatePath) || resolved.templatePath;
    const templatesRootForLog =
      path.relative(logBase, resolved.templatesRoot) || resolved.templatesRoot;

    logger.debug("template.resolved", {
      kind: args.kind,
      templatePath: templatePathForLog,
      templatesRoot: templatesRootForLog,
      source: resolved.source,
      ...(args.extra ?? {}),
    });

    return resolved;
  };

  return { resolve, triedPaths, logResolved };
}
