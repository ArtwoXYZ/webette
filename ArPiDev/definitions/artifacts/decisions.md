# ArPiDev Artifact — DECISIONS.md (V2)

## Purpose

`DECISIONS.md` records short, concrete cross-cutting decisions to avoid re-debating.

This is not a general changelog and not a place to dump story-level details.

## Minimum content rule (non-empty)

A `DECISIONS.md` is considered non-empty only if it contains at least one concrete decision.

Placeholder markers include (but are not limited to): `TBD`, `TODO`, `<TBD>`, `...`, `?`.

## Required format

Each decision is 1-3 lines and includes:

* Date (human-readable)
* Decision
* Reason (short, explicit why)

## Template

```text
# DECISIONS

- 2026-02-03 — Use Postgres for persistence. Reason: existing infra and team familiarity.
- 2026-02-10 — Keep authentication email-only. Reason: reduce complexity for v1.
```

## Notes

* No debates or long rationale.
* Prefer recording only repeated/cross-story decisions.
* If a decision is reversed, add a new entry and prefix the old one with `OUTDATED`.
* Older formats are acceptable if meaning is clear.
