import { Electroview, createRPC } from "electrobun/view";

// Schema for outgoing calls to the bun process
type BunRequests = {
  getVersion: { params: undefined; response: string };
  ping: { params: undefined; response: string };
};

// Local schema: webview handles no incoming requests from bun
// Remote schema: bun handles getVersion and ping
const rpc = createRPC<
  { requests: Record<never, never>; messages: Record<never, never> },
  { requests: BunRequests; messages: Record<never, never> }
>({});

new Electroview({ rpc });

const version = await rpc.requestProxy.getVersion();
document.getElementById("version")!.textContent = version;

document.getElementById("btn")!.addEventListener("click", async () => {
  const result = await rpc.requestProxy.ping();
  document.getElementById("result")!.textContent = result;
});
