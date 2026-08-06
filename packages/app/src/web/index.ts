import { Electroview, createRPC } from "electrobun/view";
import { WebetteApi, type BuildSummary } from "./api";
import type { ApiErrorCode } from "webette";
import { getLocale, setLocale, t, type Locale } from "./i18n";
import {
  ensureAudioReady,
  isMuted,
  playBoot,
  playClick,
  playError,
  playSuccess,
  setMuted,
  startMusic,
} from "./sounds";

// ── RPC bridge to the bun process ───────────────────────────────

type BunRequests = {
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
};

const rpc = createRPC<
  { requests: Record<never, never>; messages: Record<never, never> },
  { requests: BunRequests; messages: Record<never, never> }
>({
  // Builds and serve startups can be slow on big sites.
  maxRequestTime: 10 * 60_000,
});

new Electroview({ rpc });

const api = new WebetteApi((params) => rpc.requestProxy.apiFetch(params));

// ── DOM handles ─────────────────────────────────────────────────

const $ = <T extends HTMLElement>(selector: string): T => {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Missing element: ${selector}`);
  return el;
};

const els = {
  test: $<HTMLButtonElement>("#dev"),
  testLabel: $<HTMLLabelElement>('label[for="dev"]'),
  build: $<HTMLButtonElement>("#build"),
  host: $<HTMLButtonElement>("#host"),
  mute: $<HTMLButtonElement>("#mute"),
  settings: $<HTMLButtonElement>("#settings"),
  labels: {
    test: $<HTMLLabelElement>('label[for="dev"]'),
    build: $<HTMLLabelElement>('label[for="build"]'),
    host: $<HTMLLabelElement>('label[for="host"]'),
    mute: $<HTMLLabelElement>('label[for="mute"]'),
    settings: $<HTMLLabelElement>('label[for="settings"]'),
  },
  logo: $<HTMLDivElement>("#logo"),
  website: $<HTMLButtonElement>("#open-website"),
  folder: $<HTMLButtonElement>("#open-folder"),
  statusTest: $<HTMLSpanElement>("#screen-infos .test"),
  statusBuild: $<HTMLSpanElement>("#screen-infos .build"),
  statusHost: $<HTMLSpanElement>("#screen-infos .host"),
  ready: $<HTMLSpanElement>("#screen-infos .ready"),
  bebettes: {
    magic: $<HTMLDivElement>("#bebette-magic"),
    work: $<HTMLDivElement>("#bebette-work"),
    read: $<HTMLDivElement>("#bebette-read"),
  },
  loadingCells: Array.from(
    document.querySelectorAll<HTMLSpanElement>("#loading > span.lcd-item")
  ),
  version: $<HTMLSpanElement>("#version span"),
  popup: $<HTMLDivElement>("#screen-popup"),
  popupMessage: $<HTMLParagraphElement>("#screen-popup .popup-message"),
  popupActions: $<HTMLDivElement>("#screen-popup .popup-actions"),
  bebetteImages: {
    magic: $<HTMLImageElement>("#bebette-magic img"),
    work: $<HTMLImageElement>("#bebette-work img"),
    read: $<HTMLImageElement>("#bebette-read img"),
  },
};

// ── UI state machine ────────────────────────────────────────────

type UiState =
  | "booting"
  | "idle" // no site mounted
  | "mounted" // site mounted, nothing running
  | "building"
  | "starting" // serve requested, waiting for the server
  | "serving";

interface AppState {
  ui: UiState;
  siteDir: string | null;
  tutorialDir: string | null;
  recentFolders: string[];
  servePort: number | null;
  idleBebette: keyof typeof els.bebettes;
}

const state: AppState = {
  ui: "booting",
  siteDir: null,
  tutorialDir: null,
  recentFolders: [],
  servePort: null,
  idleBebette: "magic",
};

type BebetteName = keyof typeof els.bebettes;

function setBebette(active: BebetteName | null, blink = true): void {
  for (const [name, el] of Object.entries(els.bebettes)) {
    const on = name === active;
    el.classList.toggle("lcd-active", on);
    el.classList.toggle("fx-blink", on && blink);
    el.classList.toggle("fx-off", !on);
  }
}

function setLcd(el: HTMLElement, on: boolean): void {
  el.classList.toggle("lcd-active", on);
}

function setEnabled(button: HTMLButtonElement, enabled: boolean): void {
  button.classList.toggle("btn-disabled", !enabled);
}

/** Re-renders every stateful element from `state`. */
function render(): void {
  const { ui } = state;
  const mounted = state.siteDir !== null;

  // Physical buttons (subtle disable, clicks still captured).
  setEnabled(els.test, ui === "mounted" || ui === "serving");
  setEnabled(els.build, ui === "mounted");
  setEnabled(els.host, false); // no host provider in this alpha
  setEnabled(els.settings, ui !== "building" && ui !== "starting");
  setEnabled(els.mute, true);

  // On-screen buttons.
  setEnabled(els.website, ui === "serving");
  setEnabled(els.folder, ui === "idle" || ui === "mounted" || ui === "serving");

  // LCD status words.
  setLcd(els.statusTest, ui === "starting" || ui === "serving");
  setLcd(els.statusBuild, ui === "building");
  setLcd(els.statusHost, false);
  setLcd(els.ready, ui === "serving");
  setLcd(els.website, ui === "serving");
  setLcd(els.folder, mounted || ui === "idle");

  // Test button label + glow.
  els.testLabel.textContent = ` ${t(ui === "serving" ? "label.stop" : "label.test")} `;
  els.test.classList.toggle("btn-glow", ui === "serving");

  // Bebette of the moment (starting alternates via its own timer).
  if (ui === "idle" || ui === "mounted") setBebette(state.idleBebette);
  else if (ui === "building") setBebette("work");
  else if (ui === "serving") setBebette("magic");
}

// ── Loading bar ─────────────────────────────────────────────────

let progressTimer: ReturnType<typeof setInterval> | null = null;

function paintProgress(cells: number): void {
  els.loadingCells.forEach((cell, i) => setLcd(cell, i < cells));
}

/** Fake-progressive fill: creeps up and holds one cell before full. */
function startProgress(): void {
  stopProgress();
  let filled = 0;
  paintProgress(0);
  progressTimer = setInterval(() => {
    if (filled < els.loadingCells.length - 1) paintProgress(++filled);
  }, 220);
}

function stopProgress(): void {
  if (progressTimer) clearInterval(progressTimer);
  progressTimer = null;
}

/** Bar snaps full, then empties at once. */
async function completeProgress(): Promise<void> {
  stopProgress();
  paintProgress(els.loadingCells.length);
  await delay(450);
  paintProgress(0);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Diegetic LCD popup ──────────────────────────────────────────

interface PopupAction {
  label: string;
  onClick?: () => void | Promise<void>;
}

function showPopup(message: string, actions?: PopupAction[]): void {
  els.popupMessage.textContent = message;
  els.popupActions.replaceChildren(
    ...(actions ?? [{ label: t("common.ok") }]).map((action) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = action.label;
      button.addEventListener("click", () => {
        playClick();
        hidePopup();
        void action.onClick?.();
      });
      return button;
    })
  );
  els.popup.hidden = false;
}

function hidePopup(): void {
  els.popup.hidden = true;
}

// ── Actions ─────────────────────────────────────────────────────

function rejectAction(message: string): void {
  playError();
  showPopup(message);
}

async function mountSite(dir: string, remember = false): Promise<void> {
  if (remember) {
    state.recentFolders = await rpc.requestProxy.rememberRecentFolder({
      path: dir,
    });
  }
  state.siteDir = dir;
  state.ui = "mounted";
  playSuccess();
  render();
}

function folderName(folder: string): string {
  const trimmed = folder.replace(/[\\/]+$/, "");
  return trimmed.split(/[\\/]/).pop() || folder;
}

function applyTranslations(): void {
  document.documentElement.lang = getLocale();
  els.statusTest.textContent = t("label.test");
  els.statusBuild.textContent = t("label.build");
  els.statusHost.textContent = t("label.host");
  els.ready.textContent = t("label.ready");
  els.website.textContent = t("label.website");
  els.folder.textContent = t("label.folder");
  els.labels.build.textContent = ` ${t("label.build")} `;
  els.labels.host.textContent = ` ${t("label.host")} `;
  els.labels.mute.textContent = ` ${t("label.mute")} `;
  els.labels.settings.textContent = ` ${t("label.settings")} `;
  els.logo.ariaLabel = t("a11y.logo");
  els.bebetteImages.magic.alt = t("a11y.bebette.magic");
  els.bebetteImages.work.alt = t("a11y.bebette.work");
  els.bebetteImages.read.alt = t("a11y.bebette.read");
  render();
}

function apiError(code: ApiErrorCode): string {
  return t(`api.${code}`);
}

function prependRecentFoldersMenu(): void {
  if (state.recentFolders.length === 0) return;

  const select = document.createElement("select");
  select.className = "recent-folders";
  select.ariaLabel = t("folder.recent");

  const placeholder = document.createElement("option");
  placeholder.textContent = t("folder.recentPlaceholder");
  placeholder.value = "";
  placeholder.disabled = true;
  placeholder.selected = true;
  select.append(placeholder);

  for (const folder of state.recentFolders) {
    const option = document.createElement("option");
    option.textContent = folderName(folder);
    option.value = folder;
    option.title = folder;
    select.append(option);
  }

  select.addEventListener("change", () => {
    if (!select.value) return;
    playClick();
    hidePopup();
    void mountSite(select.value, true);
  });
  els.popupActions.prepend(select);
}

function openFolderPopup(): void {
  const actions: PopupAction[] = [];
  if (state.tutorialDir) {
    const tutorialDir = state.tutorialDir;
    actions.push({
      label: t("folder.tutorial"),
      onClick: () => mountSite(tutorialDir),
    });
  }
  actions.push(
    {
      label: t("folder.choose"),
      onClick: async () => {
        const picked = await rpc.requestProxy.pickFolder();
        if (picked) await mountSite(picked, true);
      },
    },
    { label: t("common.cancel") }
  );
  showPopup(
    state.siteDir
      ? t("folder.replacePrompt")
      : t("folder.mountPrompt"),
    actions
  );
  prependRecentFoldersMenu();
}

function openFolder(path: string | null): void {
  if (path) {
    void rpc.requestProxy.openPath({ path });
  }
}

async function runBuild(): Promise<void> {
  if (!state.siteDir) return;
  playClick();
  state.ui = "building";
  render();
  startProgress();

  const result = await api.build(state.siteDir);
  await completeProgress();
  state.ui = "mounted";
  render();

  if (!result.ok) {
    rejectAction(t("build.requestFailed", { reason: apiError(result.code) }));
    return;
  }
  const summary: BuildSummary = result.data;
  if (summary.ok) {
    playSuccess();
    showPopup(
      t("build.completed", {
        duration: (summary.durationMs / 1000).toFixed(1),
      }),
      [
        {
          label: t("folder.open"),
          onClick: () => openFolder(summary.outputDir),
        },
        { label: t("common.ok") },
      ]
    );
  } else {
    playError();
    showPopup(t("build.failed", { count: summary.errors.length }));
  }
}

let alternateTimer: ReturnType<typeof setInterval> | null = null;

function startAlternation(): void {
  let flip = false;
  setBebette("work");
  alternateTimer = setInterval(() => {
    flip = !flip;
    setBebette(flip ? "read" : "work");
  }, 420);
}

function stopAlternation(): void {
  if (alternateTimer) clearInterval(alternateTimer);
  alternateTimer = null;
}

async function startServe(): Promise<void> {
  if (!state.siteDir) return;
  playClick();
  state.ui = "starting";
  render();
  startProgress();
  startAlternation();

  const result = await api.serve(state.siteDir);
  stopAlternation();

  if (!result.ok) {
    stopProgress();
    paintProgress(0);
    state.ui = "mounted";
    render();
    rejectAction(t("serve.startFailed", { reason: apiError(result.code) }));
    return;
  }

  state.servePort = result.data.port;
  await completeProgress();
  state.ui = "serving";
  playSuccess();
  render();
}

async function stopServe(): Promise<void> {
  playClick();
  const result = await api.stop();
  state.servePort = null;
  state.ui = "mounted";
  render();
  if (!result.ok && result.code !== "no_serve_running") {
    rejectAction(t("serve.stopFailed", { reason: apiError(result.code) }));
  }
}

// ── Button wiring ───────────────────────────────────────────────

els.test.addEventListener("click", () => {
  if (state.ui === "serving") return void stopServe();
  if (state.ui === "mounted") return void startServe();
  if (state.ui === "building") return rejectAction(t("action.buildRunning"));
  if (state.ui === "starting") return;
  rejectAction(t("action.chooseFolder"));
});

els.build.addEventListener("click", () => {
  if (state.ui === "mounted") return void runBuild();
  if (state.ui === "building")
    return rejectAction(t("action.buildAlreadyRunning"));
  if (state.ui === "serving")
    return rejectAction(t("action.stopBeforeBuild"));
  rejectAction(t("action.chooseFolder"));
});

els.host.addEventListener("click", () => {
  rejectAction(t("action.configureHost"));
});

els.settings.addEventListener("click", () => {
  if (state.ui === "building" || state.ui === "starting") {
    return rejectAction(t("action.operationRunning"));
  }
  playClick();
  showPopup(t("settings.language"), [
    {
      label: t("settings.french"),
      onClick: () => changeLocale("fr"),
    },
    {
      label: t("settings.english"),
      onClick: () => changeLocale("en"),
    },
    { label: t("common.cancel") },
  ]);
});

async function changeLocale(locale: Locale): Promise<void> {
  const persisted = await rpc.requestProxy.setLocale({ locale });
  setLocale(persisted);
  applyTranslations();
  showPopup(t("settings.languageChanged"));
}

els.mute.addEventListener("click", () => {
  setMuted(!isMuted());
  els.mute.classList.toggle("btn-glow", isMuted());
  playClick();
});

els.website.addEventListener("click", () => {
  if (state.ui === "serving" && state.servePort !== null) {
    playClick();
    void rpc.requestProxy.openExternal({
      url: `http://localhost:${state.servePort}`,
    });
    return;
  }
  rejectAction(t("action.noWebsite"));
});

els.folder.addEventListener("click", () => {
  if (state.ui === "building" || state.ui === "starting") {
    return rejectAction(t("action.operationRunning"));
  }
  if (state.ui === "serving") {
    playClick();
    if (state.siteDir) void rpc.requestProxy.openPath({ path: state.siteDir });
    return;
  }
  playClick();
  openFolderPopup();
});

// ── Status polling (keeps UI honest if things change under us) ──

setInterval(async () => {
  if (state.ui !== "serving" && state.ui !== "mounted") return;
  const result = await api.status();
  if (!result.ok) return;
  const serve = result.data.serve;
  if (state.ui === "serving" && !serve) {
    state.servePort = null;
    state.ui = "mounted";
    render();
  } else if (state.ui === "mounted" && serve) {
    state.servePort = serve.port;
    state.ui = "serving";
    render();
  }
}, 2000);

// ── Boot sequence (~1s: everything off → sound → power on) ─────

async function boot(): Promise<void> {
  const [bootstrap, status] = await Promise.all([
    rpc.requestProxy.getBootstrap(),
    api.status(),
    document.fonts.ready, // sprites/labels at final metrics before power-on
    ensureAudioReady(), // audio warm-up during the "off" phase
    delay(900), // minimum "off" time so the power-on reads as a sequence
  ]);

  state.tutorialDir = bootstrap.tutorialDir;
  state.recentFolders = bootstrap.recentFolders;
  setLocale(bootstrap.locale);
  applyTranslations();
  if (status.ok) {
    els.version.textContent = `v${status.data.version}`;
  }

  const names: BebetteName[] = ["magic", "work", "read"];
  state.idleBebette = names[Math.floor(Math.random() * names.length)]!;

  playBoot();
  // Background music fades in once the boot jingle is done. If
  // autoplay blocked the audio, it will catch up on the first click.
  startMusic(1.2);
  document.body.classList.remove("booting");
  paintProgress(0);
  state.ui = "idle";
  render();
}

void boot();
