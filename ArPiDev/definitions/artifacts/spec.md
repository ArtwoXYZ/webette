# ArPiDev Artifact — SPEC.md (V2.1 Core-First)

## Purpose

`SPEC.md` is the product frame: what is being built, what is not, and how work is prioritized and validated.

It is a decision aid, not a repo dump.

## Core required sections

* Vision
* Goals
* Non-goals
* Priorities
* Constraints
* Git and commit policy
* Success criteria

## Extended sections (optional, use when helpful)

* Principles
* Code review status
* Uncertainties

## Minimum content rule (non-empty)

A `SPEC.md` is considered non-empty only if each core required section contains at least one concrete sentence or bullet that is not a placeholder.

Placeholder markers include: `TBD`, `TODO`, `<TBD>`, `...`, `?`.

## Template (core-first)

```text
# SPEC

## Vision
- ...

## Goals
- ...

## Non-goals
- ...

## Priorities
- ...

## Constraints
- ...

## Git and commit policy
- Propose commit message on each validated story: <yes/no>
- Commit proposal owner: <Dev/Pilot>
- Commit title format: <example: type(scope): short title>
- Commit description format: <bullets / paragraph / optional>
- Commit language: <English/French>
- Scope strategy: <how scopes are chosen>
- Scope examples: <2-4 representative scopes>

## Success criteria
- ...

## Principles (optional)
- ...

## Code review status (optional)
- Done: <yes/no>
- Scope: <what was reviewed>
- References: `ArPiDev/CODEMAP.md` (if created)

## Uncertainties (optional)
- Q: ...
- FIXED: <short question>
  - Answer: <short answer>
```

## Notes

* Keep it short and concrete.
* Prefer constraints and priorities that are not obvious from the codebase.
* `Git and commit policy` drives story commit proposals.
