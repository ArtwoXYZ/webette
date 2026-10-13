/**
 * What the UI asks of the process hosting it: the engine API tunnel
 * and everything a web page cannot do alone (folder picker, opening
 * the file explorer, moving the window, remembering app state).
 *
 * Two hosts answer these requests: the Electrobun main process in the
 * desktop app (`host.ts`) and the preview server in a plain browser
 * (`host.preview.ts`).
 */

import type { Locale } from "./i18n";
import type { WindowFrame } from "./window-resize";

export type HostRequests = {
  apiFetch: {
    params: { path: string; method?: string; body?: string };
    response: { status: number; body: string };
  };
  getBootstrap: {
    params: undefined;
    response: {
      tutorialDir: string | null;
      recentFolders: string[];
      locale: Locale;
    };
  };
  pickFolder: { params: undefined; response: string | null };
  rememberRecentFolder: { params: { path: string }; response: string[] };
  setLocale: { params: { locale: Locale }; response: Locale };
  openExternal: { params: { url: string }; response: boolean };
  openPath: { params: { path: string }; response: boolean };
  closeWindow: { params: undefined; response: boolean };
  getWindowFrame: { params: undefined; response: WindowFrame };
  setWindowFrame: { params: WindowFrame; response: boolean };
};

export type Host = {
  [Name in keyof HostRequests]: HostRequests[Name]["params"] extends undefined
    ? () => Promise<HostRequests[Name]["response"]>
    : (
        params: HostRequests[Name]["params"]
      ) => Promise<HostRequests[Name]["response"]>;
};
