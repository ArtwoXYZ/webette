# Working on webette

This file is the entry point for coding agents. Humans are welcome too.

## Read first

- `docs/project-vision.md`: what webette is and what must stay true. Its
  "Development Philosophy" section is the rule book, not a suggestion.
- `docs/glossary.md`: the project vocabulary. Use these words in code,
  comments, logs and docs; do not invent synonyms.
- `docs/codemap.md`: where things live and the known pitfalls.
- `docs/decisions.md`: decisions already taken, with their reasons.
- `CONTRIBUTING.md`: issue, pull request, commit and changelog conventions.

## Keep the spirit of the project

webette is filesystem-first, explicit and small. That applies to its own code
as much as to the sites it builds.

- Prefer the plain solution. No abstraction until two real callers need it.
- No hidden behavior: what the tool does must be visible in the folder, the
  config or the logs.
- The engine stays lean. New capabilities go to plugins or templates first.
- Comments explain why, in the tone already used in the code: short, direct,
  written for the next person reading the file. Module headers say what the
  file is for. Do not narrate what the code obviously does.
- User-facing words (logs, CLI, app) stay friendly and non-technical. webette
  is made for people who manage folders, not toolchains.
- webette is pre-beta: there is no public API to preserve. Remove old paths
  instead of keeping compatibility shims.

## How work is tracked

The repository lives on Tangled (`tangled.org/artwo.xyz/webette`), not GitHub.
Use the `tg` CLI where you would use `gh`.

- Work items are Tangled issues: `tg issue list`, `tg issue view <key>`.
- Branch from `dev`. `main` only moves at release time.
- Open pull requests against `dev`: `tg pr create --base dev`.
- Update the issue when its criteria are met; do not leave it stale.

## Commits

- Format: `<type>(<scope>): <short description>`, in English, followed by one
  to five bullet lines describing the change. Pick one primary scope from
  `docs/commit-scopes.md`.
- Never add AI attribution: no `Co-Authored-By` trailer, no "generated with"
  line, in commits, pull requests or issues.

## Checks before proposing a change

From the repository root:

```
bun run typecheck
bun test
bun run check:tutorial
```

`check:tutorial` rebuilds the reference site (`packages/app/tutorial`) from
scratch and compares its `_public/` output with the recorded reference
(`scripts/tutorial-reference.txt`). `_public/` is the non-regression target:
when the check reports a change you did not intend, diff `_public/` before and
after (`bun run build:tutorial` builds it without the comparison). When the
change is intended, record it with `bun run check:tutorial --accept` and commit
the reference with your change.

## Running things

- Engine dev server on the tutorial: `bun run serve:tutorial`.
- Desktop app, native window (needs a desktop session): `bun run dev:app`.
- Desktop app UI in a browser, for headless machines and remote previews:
  `bun run preview:app`. Native-only features (folder picker, frameless
  window) are stubbed there and must be checked in the native app.

## Releases

Read `docs/versioning.md` before preparing a release. `CHANGELOG.md` is the
single source for release notes.
