# T7-S00 — Refonte CLI

**Status:** Done, Validated
**Opened:** 2026-03-26
**Closed:** 2026-03-26

---

## Goal

Redesign the Webette terminal experience: a clean welcome screen, an explicit `help` command, improved log formatting (cleaner levels, optional timestamps), and polished build/serve feedback — all without changing any public API or logger interface.

## Pas terminé

Améliorer encore. Pistes :
- faire un logo en ASCII ?
- remplacer "webette" par "webt" ?
- plus de couleurs et mieux réparties (inspirées par le theme du site tutorial) ?

---

## In scope

- `webette` (no args): show a branded welcome screen with version + quick usage hints (replaces raw `console.log` dump).
- `webette help`: explicit command that outputs the same formatted help.
- All CLI-facing strings (welcome, help, error messages) must go through the i18n system (`t(locale, key)`) — no hardcoded English strings in `cli.ts`.
- Log format improvement: prefix with a short level symbol (e.g. `·` debug, `ℹ` info, `⚠` warn, `✗` error) instead of the full `[ISO] [scope]` header for `info` level in non-verbose mode. Timestamps kept in verbose mode and in the JSONL file.
- Build start / end summary lines: one clear line at start (`Building…`) and one at completion (`Built in Xs`) — using the existing logger infrastructure.
- `serve` start confirmation: one clear line `Serving at http://localhost:PORT` when the server is ready.

## Out of scope

- Web UI / Electron / ElectroBun (T7-S01+).
- New commands beyond `build`, `serve`, `help`.
- Interactive prompts or menus.
- Changes to the Logger class interface or `createProjectLogger` signature.
- Changes to JSONL persistence format.
- i18n message key changes (use existing keys or add new ones as needed, no key renames).

---

## Done when

1. `bun run src/cli.ts` (no args) prints a welcome screen with version, not a raw "Usage:" dump.
2. `bun run src/cli.ts help` prints the same formatted help.
3. `bun run src/cli.ts build tutorial` outputs one `Building…` line at start and one `Built in Xs` line at end, with `info` logs showing a short symbol prefix instead of the full ISO timestamp in normal mode.
4. `bun run src/cli.ts serve tutorial` outputs `Serving at http://localhost:PORT` when ready.
5. `bun run src/cli.ts build tutorial --verbose` still shows full `[timestamp] [scope]` format (verbose mode unchanged).
6. JSONL log file content is unchanged (timestamps and scope preserved in file).
7. No TypeScript errors (`bun run typecheck` passes).

---

## Execution brief

### Locale resolution order in `main()`

**Problem:** currently `getEnv()` is called after the no-command check, so the welcome screen uses hardcoded `console.log` before the locale is known.

**Fix:** move `getEnv()` (and locale resolution) to the very top of `main()`, before any output. The welcome screen and `help` output must then use `t(locale, key)` — same as the logger. Introduce a small `printHelp(locale, version)` helper that wraps `t()` calls.

### Welcome screen (`src/cli.ts`)

Replace the current `console.log` block in the no-command branch with a call to `printHelp(locale, version)`. Keep it minimal: tool name, version, one-line tagline, then the command/option list with consistent indentation. No ASCII art, no heavy dependencies. All strings are keys in `locales/`.

### `help` command

Add `"help"` to the `switch` in `main()` calling the same `printHelp(locale, version)`. Single source of truth.

### Log format (`src/logging/logger.ts`)

Add a `compact` display mode (default when not verbose) that replaces the `[ISO timestamp] [scope]` prefix with a short symbol. Verbose mode stays untouched. The JSONL persistence path is unchanged.

Proposed compact prefix map:
```
debug → · (dim gray)
info  → ℹ (cyan, same as now)
warn  → ⚠ (yellow, same as now)
error → ✗ (red, same as now)
```

No scope shown in compact mode (too noisy for end users); full `[timestamp] [scope]` preserved in verbose.

### Build/serve feedback

- In `src/core/build/index.ts`: add `logger.info("build.start", {})` at entry and `logger.info("build.done", { duration: "Xs" })` at exit (or use existing keys if available; check `locales/en/logs.json` first).
- In `src/core/serve.ts`: log `logger.info("serve.ready", { url: "http://localhost:PORT" })` once the server is listening (check if already logged; if so, verify formatting is sufficient).

---

## Files / areas likely involved

- `packages/engine/src/cli.ts` — welcome, help, switch, locale resolution order
- `packages/engine/src/logging/logger.ts` — compact mode
- `packages/engine/src/core/build/index.ts` — build start/end logs
- `packages/engine/src/core/serve.ts` — serve ready log
- `packages/engine/locales/en/logs.json` — new CLI keys (welcome, help, build.start, build.done, serve.ready…)
- `packages/engine/locales/fr/logs.json` — matching FR translations for every new key

---

## Constraints and traps

- **i18n first:** every string visible to the user (welcome, help lines, error messages in `cli.ts`) must be a key in `locales/en/logs.json` + `locales/fr/logs.json` and rendered via `t(locale, key)`. No hardcoded English in `cli.ts`.
- **Locale before output:** `getEnv()` + `resolveLocale()` must run before any user-visible output, including the welcome screen. This is a refactor of the current `main()` flow.
- `supportsColor` is already computed in `logger.ts` — use it to guard the symbol prefix (no symbols in non-TTY output).
- Do NOT add a new dependency (e.g. `chalk`, `kleur`) — the ANSI escape codes already in `colorize()` are sufficient.
- The `Logger` class interface (`debug/info/warn/error/child`) must not change — `compact` is an internal rendering detail.
- `bun run typecheck` must pass. Check with `tsc --noEmit` in `packages/engine/`.
- Keep `help` output consistent with the no-arg welcome screen — single source of truth via `printHelp(locale, version)`.

---

## Checks to run

```
cd packages/engine
bun run src/cli.ts                        # welcome screen
bun run src/cli.ts help                   # help command
bun run src/cli.ts build ../app/tutorial  # compact info logs, start/done lines
bun run src/cli.ts serve ../app/tutorial  # serve ready line (then Ctrl+C)
bun run src/cli.ts build ../app/tutorial --verbose  # full [timestamp] [scope] format
bun run typecheck                         # no TS errors
```

## Evidence expected

- Screenshot / paste of the welcome screen output.
- Paste of a typical `build` run showing compact log format and start/done lines.
- Paste of the verbose build showing that old format is preserved.
- Confirmation that the JSONL file still has timestamps.

---

## Dev log

### 2026-03-26

**Locale keys — EN + FR** (`locales/en/logs.json`, `locales/fr/logs.json`)

Added 17 new keys: `cli.tagline`, `cli.help.*` (usage, folderHint, commands, build, serve, help, options, verbose, exportModelOnly, skipContent, includeDrafts, noIncludeDrafts), `cli.unknownCommand`, `build.started`, `build.done`. `cli.unknownCommand` was already referenced in code but missing from both locale files — now fixed.

**Logger compact mode** (`src/logging/logger.ts`)

Added `compact?: boolean` to Logger constructor + propagated in `child()`. In `emit()`, compact mode renders `symbol message` (no timestamp, no scope) vs verbose `[timestamp] [scope] message` (unchanged). JSONL persistence always writes full structured data. `createProjectLogger` passes `compact: !verbose`. Symbol map: `·` debug, `ℹ` info, `⚠` warn, `✗` error — reuses existing `colorize()` + `supportsColor` guard.

Why this way: the `compact` flag is internal to Logger; public interface (`debug/info/warn/error/child`) is unchanged. No new dependencies — ANSI codes from `colorize()` suffice.

**CLI redesign** (`src/cli.ts`)

- Added `resolveLocale` + `t`/`Locale` imports.
- Moved `getEnv()` to top of `main()` (before any output) to resolve locale before the first `console.log`.
- Extracted `printHelp(locale, version)` using `t()` for every user-visible string — no hardcoded English.
- Added `"help"` to no-command check; unknown command now calls `printHelp` + sets `exitCode = 1`.

**Build timing** (`src/core/build/index.ts`)

Added `logger.info("build.started", { rootDir })` at entry and `logger.info("build.done", { duration })` at exit. Both guarded by `!options.quiet` so serve rebuilds (which pass `quiet: true`) don't duplicate the timing lines alongside `serve.rebuildSuccess`.

**Checks run:**
- `bun run src/cli.ts` → French welcome screen (locale auto-detected from system)
- `bun run src/cli.ts help` → identical help output
- `bun run src/cli.ts build ../app/tutorial` → compact `ℹ`/`⚠` prefixes, `Construction de…`, `Construit en 2.0s.`
- `bun run src/cli.ts build ../app/tutorial --verbose` → full `[timestamp] [scope]` format preserved
- `bun run src/cli.ts unknowncmd` → `✗ Commande inconnue : unknowncmd` + help + exit 1
- JSONL tail shows `{"timestamp":"...","level":"info","messageKey":"build.done","params":{"duration":"1.8s"}}` — timestamps preserved in file
- `bun run typecheck` → clean (0 errors)

---

### 2026-03-26 (suite)

**Couleurs welcome screen** (`src/cli.ts`)

Ajout de `supportsCliColor` + helper `clr(ansi, text)` locaux (TTY-guard, pas de nouvelle dépendance). `printHelp` redessinée :
- "webette" en bold + bright-red (`1;91`) — accent du thème tutorial
- Version en dim gray (`90`)
- Règle horizontale dim (`─` × 38)
- Tagline en dim (`2`)
- Headers de sections (`Usage:`, `Commandes:`, `Options:`) en bold
- Noms de commandes en vert (`32`) — inspiré du vert sage du site
- Flags/options en jaune (`33`) — warm tone

**Logo ASCII** (`src/cli.ts`)

Intégration de la bébette (`ascii-bebette.txt`) comme constante `MASCOT` dans `cli.ts`. Affichée en tête de `printHelp()`, avec "webette" (bold+red) et la version (dim) centrés sous le dessin — même position que dans le fichier source.

Fix incident : `@ts-expect-error` devenu obsolète dans `src/utils/load-module.ts` (les types Bun ont été mis à jour, la directive était devenue inutile) — supprimé.

**Typecheck** : clean (0 erreurs).

---

## Pilot exchange

**Scope extension validée :** mascot ASCII + colorisation du welcome screen ajoutés après la première implémentation, à la demande de l'user — hors scope initial mais cohérents avec l'esprit de la story.

**Décisions prises :**
- `webette` reste le nom de la commande CLI (pas de rename en `webt`).
- Mode interactif no-args écarté pour l'instant (trop tôt par rapport aux options disponibles).

**Commit proposal :**

```
feat(cli): mascot ASCII + colorized welcome screen

- Add bébette ASCII mascot (block chars) to printHelp(), colored in muted green (--light-text equivalent: dim+32).
- Colorize welcome screen: tool name bold+red (accent), commands green, options yellow, tagline/hints dim gray.
- Remove stale @ts-expect-error in load-module.ts (Bun types now include `write`).
- Update .claude/launch.json to match monorepo structure and correct serve port (4173).
```
