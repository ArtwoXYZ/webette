# ArPiDev Artifact — SPEC.md

## Purpose

`SPEC.md` is the product frame: vision, goals, and constraints. It is the source of truth for scope and intent.

## Required sections

* Vision
* Goals
* Non-goals
* Principles
* Priorities
* Constraints
* Git and commit policy
* Success criteria
* Uncertainties (only if relevant)

## Minimum content rule (non-empty)

A `SPEC.md` is considered **non-empty** only if **each required section** contains at least one concrete sentence or bullet that is **not** a placeholder.

Placeholder markers include (but are not limited to): `TBD`, `TODO`, `<TBD>`, `...`, `?`.

## Template

```text
# SPEC

## Vision
- ...

## Goals
- ...

## Non-goals
- ...

## Principles
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

## Code review status (optional)
- Done: <yes/no>
- Scope: <what was reviewed>
- References: `ArPiDev/CODEMAP.md` (if created)

## Uncertainties
- Q: ...
- FIXED: <short question>
  - Answer: <short answer>
```

## Notes

* Keep it short and concrete.
* If assumptions are made, state them explicitly.
* Uncertainties should be written as questions.
* When an uncertainty is resolved, mark it as `FIXED` and indent the answer beneath.
* `Git and commit policy` is mandatory and drives how stories propose commit title/description/scope.
* This template lives here; create `ArPiDev/SPEC.md` when needed.
