# Decisions

Decisions that still shape webette, with their reasons. Add an entry when a
choice would otherwise be re-debated; remove one when it stops being true.

## Product

- **Starters live outside the tool.** They are distributed as folders or zips
  through the website and repositories, not bundled in the engine. Reason: keep
  the core lean and let starters evolve on their own.
- **`ignore.webt` takes explicit filenames only**, no glob patterns. Reason:
  keep the behavior obvious for people who are not developers.
- **Standard.site (ATproto lexicon) support is a plugin**, not core. Reason:
  keep the core minimal and isolate an evolving interop concern.
- **One global social image** (`site.social.image`), no per-item override for
  now. The description falls back in a fixed order: the item's
  `description.webt`, then an optional excerpt of its first text block, then
  `site.social.defaultDescription`, then `site.description`. Reason: good
  metadata with almost no configuration.
- **User-facing documentation describes how webette works today.** No wording
  about older internal models or migrations. Reason: nothing has been released
  publicly, so history is noise for readers.
- **No backward compatibility before the beta.** Internal APIs can be removed
  without shims.

## Content model

- **The content tree is recursive.** The root is a special case; an entry is a
  folder that contains blocks; a collection is a folder that contains
  subfolders and no blocks; folders inside an entry are folder blocks. Empty
  folders outside entries are ignored with an informational warning, and
  non-core files at the root are ignored. Reason: match the filesystem-first
  promise with a single coherent model, including nested collections and root
  entries.
- **`site.structure` is the source of truth** for scanning and classification.
  `site.collections` and `site.rootEntries` are derived views for templates and
  exports, never a second computation path.

## Engine internals

- **Asset writes go through a single-flight cache** (`utils/single-flight.ts`),
  cleared on every `resolveBlocks` pass. Reason: block resolution is parallel
  and cross-entry references re-resolve their target, which caused concurrent
  writes of the same file and randomly empty images.
- **`favicon.ico` is built by hand**: a 32×32 PNG wrapped in an ICO container.
  Reason: sharp cannot write the ico format.
- **TypeScript 7 (native).** Each `tsconfig.json` must declare
  `"types": ["bun"]`, and editors must use their bundled TypeScript rather than
  the workspace one (see `.zed/settings.json`). Reason: TypeScript 7 no longer
  ships `lib.*.d.ts` in `node_modules/typescript/lib`.
- **Dependencies are updated one at a time**, one commit per update, validated
  by diffing the tutorial's `_public/` before and after.

## Desktop app

- **The engine API runs inside the app's main process**
  (`startApiServer({ port: 0 })`), not as a spawned `webette api`. Reason: no
  child process to supervise, no orphan, and no port clash with a CLI-launched
  API on 4177.
- **The UI is served over local HTTP**, not through Electrobun's `views://`
  scheme. Reason: on Windows that scheme serves SVG and fonts as `text/html`,
  which breaks the whole design.
- **The webview talks to the engine through the RPC bridge**, which proxies
  HTTP calls to the local API. Reason: the webview origin cannot fetch
  `127.0.0.1` directly.

- **sharp's native binaries are copied next to the app bundle**
  (`Resources/app/node_modules/@img`), by `electrobun.config.ts`. Reason: the
  bundled sharp requires them by name at runtime, and isolated installs keep
  them out of reach of `packages/app`; next to the bundle they are found in dev
  and in a packaged app alike.
- **Local servers are private by default.** `serve`, the control API and the
  app UI server bind to `127.0.0.1`; sharing a preview is an explicit
  `--share`, and the control API refuses requests coming from web pages.
  Reason: webette runs on personal machines, often on shared networks, and the
  API can build any folder. Details in `docs/privacy.md`.
- **The app ships as Electrobun's own installers** (a disk image on macOS, a
  setup program on Windows, a self-extracting installer on Linux), not as
  hand-made portable archives. Reason: they exist, they add the shortcuts
  people expect, and webette has no packaging code to maintain.
- **Only the Linux build comes from CI.** Electrobun builds for the system it
  runs on and Tangled pipelines run on Linux, so the macOS and Windows builds
  are made on their own machines with the same two commands
  (`package:app`, `release:publish`).
- **The builds are not signed.** Reason: signing needs paid certificates on
  macOS and Windows, and tooling Electrobun only has for macOS. macOS and
  Windows therefore warn before the first launch of each downloaded version.
- **In-app update is not wired yet.** Electrobun has an updater, but it reads
  its files from one fixed web address, which Tangled release artifacts do not
  offer: it needs a place to host them. Until then people download each
  version from the release page, and `package:app` keeps only the installer.

## Workflow

- **No AI attribution in the history**: no `Co-Authored-By` trailer or similar
  mention in commits, pull requests or issues.
- **The tutorial site is the reference build** (`packages/app/tutorial`). Its
  `_public/` output is the non-regression target for engine changes.
- **The tutorial output is compared with a recorded reference**
  (`scripts/tutorial-reference.txt`, checked in CI by `bun run check:tutorial`).
  One line per file with a hash of its content; images are listed without a
  hash. Reason: a rendering change must show up in the pull request, and image
  encoders do not give the same bytes on every platform.
