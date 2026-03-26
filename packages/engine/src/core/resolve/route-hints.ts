/**
 * Route hint helpers for block resolution (shared between resolve walker and reference resolver).
 */

import type { Block } from "../model";

export function parseRouteSegments(route?: string): string[] {
  if (!route) return [];
  return route.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
}

export function buildBlockRouteHint(block: Block, parentSegments: string[]): {
  routeHint: string;
  routeSegments: string[];
} {
  const routeSegments = [...parentSegments, block.slug];
  const routeBase = routeSegments.join("/");
  const routeHint = block.ext ? `${routeBase}${block.ext}` : `${routeBase}/`;
  return { routeHint, routeSegments };
}
