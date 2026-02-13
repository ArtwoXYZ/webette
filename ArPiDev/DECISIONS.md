# DECISIONS

- 2026-02-05 — Starters are distributed externally as folders/zips via website/repos, not bundled in the tool. Reason: keep the core tool lean and update starters independently.
- 2026-02-05 — `ignore.webt` supports only explicit filenames (no glob patterns). Reason: keep behavior simple for beta users.
- 2026-02-05 — Roadmap follows the user‑defined priority order from `ToDo.md`, refined into ArPiDev tasks/stories. Reason: scope will be driven progressively by the current todo.
- 2026-02-06 — Éviter que l’assistant lance `serve` sans demande explicite; proposer à l’utilisateur de le lancer lui-même. Reason: éviter des verrous/renommages gênants pendant les tests locaux.
- 2026-02-12 — Backfilled ArPiDev artefacts after method update: added `Git and commit policy` in `SPEC.md`, normalized `TASKS.md` active pointer, and restored required fields/status values in existing story files. Reason: restore compliance with current method schema while preserving current execution state.
- 2026-02-12 — Commit policy now requires title + bullet description on each validated story proposal, with primary scope chosen from `docs/commit-scopes.md`. Reason: standardize commit quality and scope selection across stories.
- 2026-02-12 — ArPiDoc follow-up for T2-S04 is intentionally deferred by user for later. Reason: keep delivery flow focused on next story implementation.
- 2026-02-12 — T2-S05 keeps a single global social image (`site.social.image`) with no per-item override in this iteration; metadata uses template variables + deterministic fallbacks + optional head injection toggle. Reason: minimize user config while avoiding plugin-level complexity in this story.
- 2026-02-12 — T2-S05 description fallback order is fixed as: item `description.webt` -> optional first text/markdown block excerpt (word-based, configurable) -> `site.social.defaultDescription` -> `site.description`. Reason: minimize required user config while preserving deterministic metadata quality.
- 2026-02-12 — Backfilled required `Documentation impact` sections across story files. Reason: align existing stories with the current ArPiDev schema after method updates.
- 2026-02-13 — Standard.site integration should be a plugin, not core. Reason: keep core minimal and isolate evolving interop concerns.
- 2026-02-13 — ArPiDoc follow-up for T3-S01 deferred by user for a later batch. Reason: user prefers to handle documentation updates all at once.
