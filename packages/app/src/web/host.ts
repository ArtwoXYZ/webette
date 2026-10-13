/**
 * Desktop host: the Electrobun RPC bridge to the bun process.
 *
 * The preview build swaps this module for `host.preview.ts`
 * (see `src/preview/server.ts`).
 */

import { Electroview, createRPC } from "electrobun/view";
import type { Host, HostRequests } from "./host-types";

const rpc = createRPC<
  { requests: Record<never, never>; messages: Record<never, never> },
  { requests: HostRequests; messages: Record<never, never> }
>({
  // Builds and serve startups can be slow on big sites.
  maxRequestTime: 10 * 60_000,
});

new Electroview({ rpc });

export const host: Host = rpc.requestProxy;
