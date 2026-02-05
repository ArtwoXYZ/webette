# ArPiDev Artifact — CODEMAP.md

## Purpose

`CODEMAP.md` is a compact, long-lived snapshot of the current codebase.

It exists to avoid re-reviewing the entire repository on every session, especially when ArPiDev is adopted mid-project.

## Who writes it

* Typically created by the **Architect** after a code review.
* Updated only when major structures change.

## Minimum content rule (non-empty)

A `CODEMAP.md` is considered **non-empty** only if it contains at least:

* an entry point section,
* a component/module map,
* a "how to run" section,
* at least one known pitfall.

Placeholder markers include (but are not limited to): `TBD`, `TODO`, `<TBD>`, `...`, `?`.

## Template

```text
# CODEMAP

## Snapshot
- Date: 2026-02-05
- Reviewed by: Architect
- Scope: <what was reviewed>

## How to run
- Install: <command>
- Dev: <command>
- Test: <command>
- Build: <command>

## Entry points
- Backend: <path / main module>
- Frontend: <path / main module>
- Jobs/Workers: <path>

## High-level architecture
- <1-2 paragraphs>

## Module / component map
- <area>: <what it does> (key paths)

## Data model
- DB: <type>
- Key entities: <list>
- Migrations: <where>

## Integrations
- External services: <list>
- Webhooks/queues: <where>

## Configuration
- Env vars: <where documented>
- Config files: <paths>

## Logging / Observability
- Logs: <where>
- Metrics/Tracing: <where>

## Security / Auth
- Authn/authz: <where + approach>

## Known pitfalls
- <gotcha + where>

## Fast answers
- "Where do I change X?" -> <path>
- "Where is Y configured?" -> <path>

## Open questions
- Q: ...
- FIXED: <question>
  - Answer: <answer>
```

## Notes

* Keep it short and navigable.
* Prefer pointers to paths over long explanations.
* This template lives here; create `ArPiDev/CODEMAP.md` when needed.
