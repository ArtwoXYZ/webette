import type { Resolver } from "../registry";

// Default resolver for generic files: keep it lightweight (no read).
export const resolveFile: Resolver = async () => undefined;
