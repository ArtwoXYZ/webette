# ArPiDev Artifact — Story File

## Purpose

A story file is the execution contract for the Dev. It must be unambiguous and testable.

## Required fields

* Title (story id + short name)
* Created (date and time)
* Closed (date and time, when done or parked)
* Acceptance (who approves)
* Status
* Context
* Rationale
* Goal
* In scope
* Out of scope
* Ready when (Definition of Ready)
* Done when
* Blocker (required when parked)
* Remaining work (required when parked)
* Reopen when (required when parked)
* Dev log

## Template

```text
# T1-S01 — <Short name>

Created: 2026-02-03 14h05m00s
Closed: <leave empty until done or parked>
Acceptance: User

Status: Active

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

## Ready when
- Goal is a single outcome
- In scope / Out of scope are explicit
- Done when is testable
- Acceptance owner is set
- Rationale is present

## Done when
- ...

## Blocker
- <leave empty unless blocked>

## Remaining work
- <leave empty unless parked>

## Reopen when
- <leave empty unless parked>

## Dev log
- 2026-02-03 16h20m00s — <what changed> — <why this way> — <commands/tests>
```

## Notes

* Keep the scope tight.
* The Dev documents only in `Dev log`.
* Time format must be `YYYY-MM-DD HHhMMmSSs` (human-readable, local time).
* `Status` must be one of: `Active`, `Done`, `Parked`.
* `Closed` is set by the Pilot when the story is accepted as `Done` or parked as `Parked`.
* The story is considered done only after acceptance by the `Acceptance` owner.
* `Parked` means "closed for now, not finished". It must include `Blocker`, `Remaining work`, and `Reopen when`.
* If acceptance is delegated to the Pilot, note it next to `Acceptance`.
* `Rationale` should be short, concrete, and tied to goals or constraints (not a long essay).
* Every dev log entry must include an explicit “why” (why it was done this way, not just what was done).
