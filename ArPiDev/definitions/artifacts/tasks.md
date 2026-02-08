# ArPiDev Artifact — TASKS.md

## Purpose

`TASKS.md` is the macro plan and execution map. It lists Tasks and their stories, plus the active story.

## Required structure

* A single `Active story: <id>` line when a story is active.
* If no executable story is active, use `Active story: NONE (waiting on parked stories or user input)`.
* Tasks labeled `T1`, `T2`, ...
* Under each Task, a list of stories labeled `T1-S01`, `T1-S02`, ... with 1-line scope.
* Optional `Parked stories` section for deferred-but-tracked stories.

## Minimum content rule (non-empty)

A `TASKS.md` is considered **non-empty** only if it contains at least **one Task** with a concrete description.

Placeholder markers include (but are not limited to): `TBD`, `TODO`, `<TBD>`, `...`, `?`.

## Story conventions

Follow `ArPiDev/definitions/artifacts/naming.md` for story IDs and filenames.

If a story is parked, keep its checkbox unchecked and append `[PARKED]` in the story line.

## Template

```text
# TASKS

Active story: T1-S01

## T1 — <Task name>
- [ ] T1-S01 <Short story scope>
- [ ] T1-S02 <Short story scope> [PARKED]

## T2 — <Task name>
- [ ] T2-S01 <Short story scope>

## Parked stories
- T1-S02 — Reason: waiting Windows validation — Remaining: run smoke test on Windows + capture result — Owner: User — Reopen when: Windows result is shared
```

## Notes

* Use checkboxes for progress.
* Keep story scopes short (one line).
* Only one story can be active at a time.
* Parked stories stay visible and explicit; they are not considered active.
* Selection of the next active story must ignore lines marked `[PARKED]`.
* This template lives here; create `ArPiDev/TASKS.md` when needed.
