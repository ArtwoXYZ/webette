/**
 * Preview host: the same requests as the desktop host, answered by the
 * preview server over HTTP so the UI runs in a plain browser.
 *
 * What only a native window can do is stubbed here, in the open:
 * the folder picker becomes a prompt for a path on the machine running
 * the preview, the file explorer cannot be opened, and the window frame
 * is the browser viewport.
 */

import type { Host, HostRequests } from "./host-types";

async function ask<Name extends keyof HostRequests>(
  name: Name,
  params?: HostRequests[Name]["params"]
): Promise<HostRequests[Name]["response"]> {
  const response = await fetch(`/__host/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params ?? null),
  });
  if (!response.ok) {
    throw new Error(`Preview host refused ${name} (${response.status})`);
  }
  return (await response.json()) as HostRequests[Name]["response"];
}

export const host: Host = {
  apiFetch: (params) => ask("apiFetch", params),
  getBootstrap: () => ask("getBootstrap"),
  rememberRecentFolder: (params) => ask("rememberRecentFolder", params),
  setLocale: (params) => ask("setLocale", params),

  pickFolder: async () => {
    const typed = window.prompt(
      "Preview mode: path of the site folder on the machine running webette"
    );
    return typed?.trim() || null;
  },

  // The engine reports `localhost`, which is the preview machine, not
  // necessarily the one showing this page: keep the port, follow the page.
  openExternal: async ({ url }) => {
    const target = new URL(url);
    if (target.hostname === "localhost" || target.hostname === "127.0.0.1") {
      target.hostname = window.location.hostname;
    }
    window.open(target, "_blank", "noopener");
    return true;
  },

  openPath: async ({ path }) => {
    console.info(`[preview] the desktop app would open ${path}`);
    return false;
  },

  closeWindow: async () => {
    console.info("[preview] the desktop app would close its window");
    return true;
  },

  getWindowFrame: async () => ({
    x: 0,
    y: 0,
    width: window.innerWidth,
    height: window.innerHeight,
  }),

  setWindowFrame: async () => false,
};
