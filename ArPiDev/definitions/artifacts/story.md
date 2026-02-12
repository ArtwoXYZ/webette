# ArPiDev Artifact — Story File

## Purpose

A story file is the execution contract for the Dev. It must be unambiguous and testable.

## Required fields

* Title (story id + short name)
* Created (date and time)
* Closed (date and time, when fully closed)
* Acceptance (who approves)
* Status
* Context
* Rationale
* Goal
* In scope
* Out of scope
* Documentation impact (optional)
* Ready when (Definition of Ready)
* Done when
* Pending reason (required when `Status: Pending`)
* Remaining work (required when `Status: Pending`)
* Resume condition (required when `Status: Pending`)
* Commit proposal (required when `Status: Done, Waiting for Validation` and `SPEC.md` policy requires it)
* Pilot exchange
* Dev log

## Template

```text
# T1-S01 — <Short name>

Created: 2026-02-03 14h05m00s
Closed: <leave empty until Done, Validated or Pending>
Acceptance: User

Status: To Do, Waiting for Validation

## Context
<Why this story exists>

## Rationale
<Why now / why this approach, in 1-2 lines>

## Goal
<The single outcome this story must achieve>

## In scope
- ...

## Out of scope
- ...

## Documentation impact
- To document: <leave empty if no documentation impact>

## Ready when
- Goal is a single outcome
- In scope / Out of scope are explicit
- Done when is testable
- Acceptance owner is set
- Rationale is present

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
- 2026-02-03 15h30m00s — Pilot -> Dev — Logged in `ArPiDev/DECISIONS.md`: <short decision>

## Dev log
- 2026-02-03 16h20m00s — Change: <what changed>
  Why this way:
  - Observed issue: <concrete symptom or failing behavior>
  - Root cause: <what was actually wrong>
  - Chosen fix: <what was changed>
  - Why this option: <why this was selected over alternatives, with tradeoff>
  - Evidence: <how the change was validated>
  Commands/tests: <commands run + short result>
```

## Notes

* Keep the scope tight.
* The Dev documents only in `Dev log`.
* Dev-to-Pilot coordination goes in `Pilot exchange` (especially decision requests).
* Use `Documentation impact` and/or `Pilot exchange` with a `To document:` prefix when a change should later be covered by ArPiDoc.
* Time format must be `YYYY-MM-DD HHhMMmSSs` (human-readable, local time).
* `Status` must be one of:
  - `To Do, Waiting for Validation`
  - `To Do, Validated`
  - `Active`
  - `Done, Waiting for Validation`
  - `Done, Validated`
  - `Pending`
* `Closed` is set by the Pilot when status becomes `Done, Validated` or `Pending`.
* If user asks for changes while status is `Done, Waiting for Validation`, switch back to `Active`.
* `Pending` means "blocked for now and intentionally deferred". It must include `Pending reason`, `Remaining work`, and `Resume condition`.
* When status is `Done, Waiting for Validation`, fill `Commit proposal` if required by `SPEC.md` git policy.
* Story checkboxes in `TASKS.md` are checked only when status is `Done, Validated`.
* If acceptance is delegated to the Pilot, note it next to `Acceptance`.
* `Rationale` should be short, concrete, and tied to goals or constraints (not a long essay).
* Every dev log entry must include an explicit causal “why”:
  observed issue -> root cause -> chosen fix -> why this option -> evidence.
* Generic lines like "to avoid regression" are insufficient unless tied to a specific risk and verification result.
