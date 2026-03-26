import { BrowserWindow, defineElectrobunRPC, type ElectrobunRPCSchema } from "electrobun/bun";
import enginePkg from "../../../engine/package.json" with { type: "json" };

const engineVersion: string = enginePkg.version ?? "unknown";

type AppRPC = ElectrobunRPCSchema & {
  bun: {
    requests: {
      getVersion: { params: undefined; response: string };
      ping: { params: undefined; response: string };
    };
    messages: Record<never, never>;
  };
  webview: {
    requests: Record<never, never>;
    messages: Record<never, never>;
  };
};

const rpc = defineElectrobunRPC<AppRPC>("bun", {
  handlers: {
    requests: {
      getVersion: () => engineVersion,
      ping: () => "pong",
    },
  },
});

new BrowserWindow({
  title: "Webette",
  frame: { x: 100, y: 100, width: 800, height: 600 },
  url: "views://main/index.html",
  rpc,
});
