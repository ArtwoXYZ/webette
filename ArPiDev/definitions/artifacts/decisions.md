# ArPiDev Artifact — DECISIONS.md

## Purpose

`DECISIONS.md` records short, concrete decisions to avoid re-debating.

## Minimum content rule (non-empty)

A `DECISIONS.md` is considered **non-empty** only if it contains at least one concrete decision.

Placeholder markers include (but are not limited to): `TBD`, `TODO`, `<TBD>`, `...`, `?`.

## Required format

Each decision is 1–3 lines and includes:

* Date (human-readable)
* Decision
* Reason (short, explicit “why”)

## Template

```text
# DECISIONS

- 2026-02-03 — Use Postgres for persistence. Reason: existing infra and team familiarity.
- 2026-02-10 — Keep authentication email-only. Reason: reduce complexity for v1.
```

## Notes

* No debates or long rationale.
* If a decision is reversed, add a new entry and place an **OUTDATED** in front of the reversed decision entry.
* This template lives here; create `ArPiDev/DECISIONS.md` when needed.
