# ArPiDev Artifact — TASKS.md

## Purpose

`TASKS.md` is the macro plan and execution map. It lists Tasks and their stories, plus the active story.

## Required structure

* A single `Active story: <id>` line when a story is active.
* Tasks labeled `T1`, `T2`, ...
* Under each Task, a list of stories labeled `T1-S01`, `T1-S02`, ... with 1-line scope.

## Minimum content rule (non-empty)

A `TASKS.md` is considered **non-empty** only if it contains at least **one Task** with a concrete description.

Placeholder markers include (but are not limited to): `TBD`, `TODO`, `<TBD>`, `...`, `?`.

## Story conventions

Follow `ArPiDev/definitions/artifacts/naming.md` for story IDs and filenames.

## Template

```text
# TASKS

Active story: T1-S01

## T1 — <Task name>
- [ ] T1-S01 <Short story scope>
- [ ] T1-S02 <Short story scope>

## T2 — <Task name>
- [ ] T2-S01 <Short story scope>
```

## Notes

* Use checkboxes for progress.
* Keep story scopes short (one line).
* Only one story can be active at a time.
* This template lives here; create `ArPiDev/TASKS.md` when needed.
