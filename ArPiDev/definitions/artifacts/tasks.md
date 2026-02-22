# ArPiDev Artifact — TASKS.md

## Purpose

`TASKS.md` is the macro plan and execution map. It lists Tasks and their stories, plus the active story.

## Required structure

* A single `Active story: <id>` line when a story is active.
* If no executable story is active, use `Active story: NONE (waiting on pending stories or user input)`.
* Tasks labeled `T1`, `T2`, ...
* Under each Task, a list of stories labeled `T1-S01`, `T1-S02`, ... with 1-line scope.
* Optional `Pending stories` section for deferred-but-tracked stories.

## Minimum content rule (non-empty)

A `TASKS.md` is considered **non-empty** only if it contains at least **one Task** with a concrete description.

Placeholder markers include (but are not limited to): `TBD`, `TODO`, `<TBD>`, `...`, `?`.

## Story conventions

Follow `ArPiDev/definitions/artifacts/naming.md` for story IDs and filenames.

If a story is pending, keep its checkbox unchecked and append `[PENDING]` in the story line.

## Template

```text
# TASKS

Active story: T1-S01

## T1 — <Task name>
- [ ] T1-S01 <Short story scope>
- [ ] T1-S02 <Short story scope> [PENDING]

## T2 — <Task name>
- [ ] T2-S01 <Short story scope>

## Pending stories
- T1-S02 — Reason: waiting Windows validation — Remaining: run smoke test on Windows + capture result — Owner: User — Resume condition: Windows result is shared
```

## Notes

* Use checkboxes for progress.
* Keep story scopes short (one line).
* Only one story can be active at a time.
* Story lines can optionally include a status hint (`To Do, Validated`, `Done, Waiting for Validation`, `Pending`).
* Pending stories stay visible and explicit; they are not considered active.
* Selection of the next active story must ignore lines marked `[PENDING]`.
* A story is checked only when the story file status is `Done, Validated`.
* If the user explicitly pauses execution (for example "stop for today"), set `Active story: NONE (waiting on pending stories or user input)` until the user resumes, even if executable stories remain.
* This template lives here; create `ArPiDev/TASKS.md` when needed.
