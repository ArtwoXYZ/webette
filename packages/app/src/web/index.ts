import { host } from "./host";
import { WebetteApi, type BuildSummary } from "./api";
import type { ApiErrorCode } from "webette";
import { getLocale, setLocale, t, type Locale } from "./i18n";
import {
  getResizedFrame,
  type ResizeEdge,
  type WindowFrame,
} from "./window-resize";
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

document
  .querySelectorAll<HTMLElement>("button, label, select, input, a")
  .forEach((element) =>
    element.classList.add("electrobun-webkit-app-region-no-drag")
  );

const api = new WebetteApi((params) => host.apiFetch(params));

// ── DOM handles ─────────────────────────────────────────────────

const $ = <T extends HTMLElement>(selector: string): T => {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Missing element: ${selector}`);
  return el;
};

const els = {
  power: $<HTMLButtonElement>("#power"),
  test: $<HTMLButtonElement>("#dev"),
  testLabel: $<HTMLLabelElement>('label[for="dev"]'),
  build: $<HTMLButtonElement>("#build"),
  host: $<HTMLButtonElement>("#host"),
  mute: $<HTMLButtonElement>("#mute"),
  muteCompact: $<HTMLButtonElement>("#mute-compact"),
  settings: $<HTMLButtonElement>("#settings"),
  labels: {
    test: $<HTMLLabelElement>('label[for="dev"]'),
    build: $<HTMLLabelElement>('label[for="build"]'),
    host: $<HTMLLabelElement>('label[for="host"]'),
    mute: $<HTMLLabelElement>('label[for="mute"]'),
    muteCompact: $<HTMLLabelElement>('label[for="mute-compact"]'),
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
  setEnabled(els.muteCompact, true);

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

  // These two leave the app (browser, file explorer): say so on hover.
  els.website.title = ui === "serving" ? t("hint.openWebsite") : "";
  els.folder.title = ui === "serving" ? t("hint.openFolder") : "";

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
    state.recentFolders = await host.rememberRecentFolder({
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
  els.labels.muteCompact.textContent = ` ${t("label.mute")} `;
  els.labels.settings.textContent = ` ${t("label.settings")} `;
  els.power.ariaLabel = t(
    document.body.classList.contains("powered-off")
      ? "a11y.powerOn"
      : "a11y.powerOff"
  );
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
        const picked = await host.pickFolder();
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
    void host.openPath({ path });
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
  const persisted = await host.setLocale({ locale });
  setLocale(persisted);
  applyTranslations();
  showPopup(t("settings.languageChanged"));
}

function toggleMute(): void {
  setMuted(!isMuted());
  for (const button of [els.mute, els.muteCompact]) {
    button.classList.toggle("btn-glow", isMuted());
  }
  playClick();
}

els.mute.addEventListener("click", toggleMute);
els.muteCompact.addEventListener("click", toggleMute);

els.website.addEventListener("click", () => {
  if (state.ui === "serving" && state.servePort !== null) {
    playClick();
    void host.openExternal({
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
    if (state.siteDir) void host.openPath({ path: state.siteDir });
    return;
  }
  playClick();
  openFolderPopup();
});

// ── Physical power control ─────────────────────────────────────

type PowerState = "off" | "starting" | "on" | "stopping";

const isFrameless =
  new URLSearchParams(window.location.search).get("frameless") === "1";
let powerState: PowerState = "off";

async function prepareApp(): Promise<void> {
  const [bootstrap, status] = await Promise.all([
    host.getBootstrap(),
    api.status(),
    document.fonts.ready,
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
}

const appReady = prepareApp();

async function powerOn(): Promise<void> {
  if (powerState !== "off") return;
  powerState = "starting";
  document.body.classList.add("powering-on");

  // Called before the first await so WebView2 sees the user's click
  // as the gesture that unlocks Web Audio.
  const audioReady = ensureAudioReady();
  // Without a user gesture a browser can keep Web Audio suspended
  // forever: the console must light up anyway, silent if need be.
  const bootDelay = delay(900);
  await Promise.all([
    appReady,
    Promise.race([audioReady, bootDelay]),
    isFrameless ? Promise.resolve() : bootDelay,
  ]);

  playBoot();
  startMusic(1.2);
  document.body.classList.remove("powered-off", "booting", "powering-on");
  paintProgress(0);
  state.ui = "idle";
  powerState = "on";
  applyTranslations();
}

async function powerOff(): Promise<void> {
  if (powerState !== "on") return;
  powerState = "stopping";
  playClick();
  hidePopup();
  stopProgress();
  stopAlternation();
  document.body.classList.add("booting", "powered-off", "shutting-down");
  els.power.ariaLabel = t("a11y.powerOn");
  await delay(450);
  await host.closeWindow();
}

els.power.addEventListener("click", () => {
  if (powerState === "off") return void powerOn();
  if (powerState === "on") return void powerOff();
});

// ── Frameless resize regions ───────────────────────────────────

let queuedWindowFrame: WindowFrame | null = null;
let updatingWindowFrame = false;

async function flushWindowFrame(): Promise<void> {
  if (updatingWindowFrame) return;
  updatingWindowFrame = true;

  try {
    while (queuedWindowFrame) {
      const frame = queuedWindowFrame;
      queuedWindowFrame = null;
      await host.setWindowFrame(frame);
    }
  } finally {
    updatingWindowFrame = false;
  }
}

function queueWindowFrame(frame: WindowFrame): void {
  queuedWindowFrame = frame;
  void flushWindowFrame();
}

for (const handle of document.querySelectorAll<HTMLElement>(
  ".window-resize-handle"
)) {
  handle.addEventListener("pointerdown", async (event) => {
    if (!isFrameless || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    const edge = handle.dataset.edge as ResizeEdge;
    const pointerId = event.pointerId;
    const startX = event.screenX;
    const startY = event.screenY;
    const startFrame = await host.getWindowFrame();
    handle.setPointerCapture(pointerId);
    document.body.classList.add("resizing-window");

    const move = (moveEvent: PointerEvent): void => {
      if (moveEvent.pointerId !== pointerId) return;
      const frame = getResizedFrame(
        startFrame,
        edge,
        moveEvent.screenX - startX,
        moveEvent.screenY - startY
      );
      queueWindowFrame(frame);
    };

    let stopped = false;
    const cleanup = (): void => {
      if (stopped) return;
      stopped = true;
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", stop);
      handle.removeEventListener("pointercancel", stop);
      handle.removeEventListener("lostpointercapture", lostCapture);
      document.body.classList.remove("resizing-window");
      if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
    };

    const stop = (stopEvent: PointerEvent): void => {
      if (stopEvent.pointerId === pointerId) cleanup();
    };

    const lostCapture = (captureEvent: PointerEvent): void => {
      if (captureEvent.pointerId === pointerId) cleanup();
    };

    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", stop);
    handle.addEventListener("pointercancel", stop);
    handle.addEventListener("lostpointercapture", lostCapture);
  });
}

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

// Keep the established automatic boot on platforms that still use
// native chrome. The frameless window (Windows, macOS) waits for its
// power button.
if (!isFrameless) void powerOn();
