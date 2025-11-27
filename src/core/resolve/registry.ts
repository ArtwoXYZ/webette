// Resolver registry: maps block types to their content resolvers.
import type { Block, ImageVariant, Site } from "../model";
import { resolveMarkdown } from "./resolvers/markdown";
import { resolveText } from "./resolvers/text";
import { resolveData } from "./resolvers/data";
import { resolveImage } from "./resolvers/image";
import { resolveVideo } from "./resolvers/video";
import { resolveAudio } from "./resolvers/audio";
import { resolveFolder } from "./resolvers/folder";
import { resolveTable } from "./resolvers/table";
import { resolveFile } from "./resolvers/file";
import type { Logger } from "../../logging/logger";
import type { ImagePipelineConfig } from "../block-types/image/config";
import type { WebetteEnv } from "../../config/env";

export interface ResolvedContent {
  raw?: string;
  data?: unknown;
  meta?: {
    size?: number;
    mime?: string;
    width?: number;
    height?: number;
    format?: string;
    renderedWith?: string;
  };
  ast?: unknown; // Structured representation (e.g. mdast) when available
  html?: string; // Optional HTML rendering for text/markdown blocks
  variants?: ImageVariant[]; // Generated variants for media (images)
  blockRoute?: string; // Optional override for the block route (e.g., generated asset path)
}

// Context passed to all resolvers
export interface ResolveContext {
  rootDir: string;
  site: Site;
  toolEnv?: WebetteEnv;
  imageConfig?: ImagePipelineConfig;
  routeHint?: string;      // slug-based route hint for the current block (public-ish)
  routeSegments?: string[]; // slug-based segments for the current block
  readContent?: boolean;
  logger?: Logger;
  remarkPlugins?: unknown[];
  beforeBlock?: (block: Block) => void;
  afterBlock?: (block: Block, resolved?: ResolvedContent) => void;
}

export type Resolver = (
  block: Block,
  ctx: ResolveContext
) => Promise<ResolvedContent | undefined>;

// Map block types to dedicated resolvers; adding a new type means adding it here.
const typeResolvers = new Map<string, Resolver>([
  ["markdown", resolveMarkdown],
  ["text", resolveText],
  ["data", resolveData],
  ["table", resolveTable],
  ["image", resolveImage],
  ["video", resolveVideo],
  ["audio", resolveAudio],
  ["folder", resolveFolder],
  ["file", resolveFile],
]);

export function getResolver(block: Block): Resolver | undefined {
  const type = block.type?.toLowerCase();
  if (type && typeResolvers.has(type)) {
    return typeResolvers.get(type);
  }
  return undefined;
}
