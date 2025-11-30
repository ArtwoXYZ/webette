import type { Resolver } from "../registry";

// Fallback resolver for unknown/unhandled block types; intentionally no content read.
export const resolveUnclassified: Resolver = async () => undefined;
