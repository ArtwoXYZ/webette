# ArPiDev Artifact — TASKS.md (V2.1 Core-First)

## Purpose

`TASKS.md` is the visible macro plan and execution map.

It should let the user quickly see what is done, what is next, and where the project is paused.

## Core required structure

* One `Active story: <id>` line when a story is active, or
* `Active story: NONE (waiting on pending stories or user input)` when no executable story is active
* Tasks labeled `T1`, `T2`, ...
* Story lines under tasks (`T1-S01`, `T1-S02`, ...) with one-line scopes

## Optional structure

* `Pending stories` section (recommended when pending work exists)
* status hints on story lines

## V1/V2/V2.1 compatibility

* Older `TASKS.md` formats remain valid if task/story IDs are readable and an active story can be inferred.
* Story lines may include legacy status hints; parse leniently.
* Pilot should backfill only what is needed to continue safely.

## Template (core-first)

```text
# TASKS

Active story: T1-S01

## T1 — <Task name>
- [ ] T1-S01 <Short story scope>
- [ ] T1-S02 <Short story scope> [PENDING]

## T2 — <Task name>
- [ ] T2-S01 <Short story scope>

## Pending stories
- T1-S02 — Reason: waiting external dependency — Remaining: <next steps> — Owner: <User/Pilot/Dev> — Resume condition: <explicit condition>
```

## Notes

* Use checkboxes for progress.
* Only one story can be active at a time.
* Keep story scopes short and outcome-oriented.
* A story is checked only when its story file is `Done, Validated`.
* If the user pauses after a story closes, keep `Active story: NONE (...)` until the user resumes.
