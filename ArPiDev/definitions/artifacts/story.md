# ArPiDev Artifact — Story File (V2.1 Core-First)

## Purpose

A story file is the execution contract for the Dev and the main trace for the user.

It should let the user quickly understand:

* what the AI is trying to do,
* what it changed,
* why it chose that approach,
* what was verified,
* where to resume.

## Core required fields (new V2.1 stories)

* Title (story id + short name)
* Created
* Closed (filled on `Done, Validated` or `Pending`)
* Acceptance
* Status
* Goal
* In scope
* Out of scope
* Done when
* Execution brief
* Checks to run
* Evidence expected
* Pilot exchange
* Dev log

## Conditional required fields

* `Pending reason`, `Remaining work`, `Resume condition` when `Status: Pending`
* `Commit proposal` when `Status: Done, Waiting for Validation` and `SPEC.md` requires it

## Extended fields (optional, use when helpful)

* Context
* Rationale
* Files/areas likely involved
* Constraints and traps
* Documentation impact
* Ready when

## V1/V2/V2.1 compatibility

* Older stories remain valid if they are executable and testable.
* Missing newer fields is not an error by default.
* Pilot may backfill only the fields needed to continue safely.

## Template (core-first)

```text
# T1-S01 — <Short name>

Created: 2026-02-03 14h05m00s
Closed: <leave empty until Done, Validated or Pending>
Acceptance: User

Status: To Do, Waiting for Validation

## Goal
<The single outcome this story must achieve>

## In scope
- ...

## Out of scope
- ...

## Execution brief
- <2-5 bullets the Dev can act on immediately>

## Checks to run
- <command> — <what it validates>

## Evidence expected
- <what the Dev should prove in `Dev log` or visible result>

## Done when
- ...

## Pending reason
- <leave empty unless Status: Pending>

## Remaining work
- <leave empty unless Status: Pending>

## Resume condition
- <leave empty unless Status: Pending>

## Commit proposal
Title: <proposed commit title>
Description:
- <key change 1>
- <key change 2>
Scope(s):
- <scope 1>
- <scope 2>
Why these scopes:
- <why these scopes follow SPEC policy>

## Pilot exchange
- 2026-02-03 15h10m00s — Dev -> Pilot — Decision request: <decision needed + why>

## Dev log
- 2026-02-03 16h20m00s — Change: <what changed>
  Why this way:
  - Observed issue: <symptom/risk>
  - Root cause: <cause or working hypothesis>
  - Chosen fix: <what changed>
  - Tradeoff: <why this option>
  - Evidence: <test/check/result>
  Commands/tests: <commands + short result>
```

## Notes

* Keep scope tight and outcome-oriented.
* `Dev log` is the primary user-facing trace of implementation and reasoning.
* Use `Pilot exchange` for cross-story decisions and `To document:` notes.
* Time format: `YYYY-MM-DD HHhMMmSSs` (local time).
* Valid statuses:
  - `To Do, Waiting for Validation`
  - `To Do, Validated`
  - `Active`
  - `Done, Waiting for Validation`
  - `Done, Validated`
  - `Pending`
* If the user requests changes after `Done, Waiting for Validation`, switch back to `Active`.
* Incremental logs are preferred over one large final summary.
