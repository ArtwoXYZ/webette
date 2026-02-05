# SPEC

## Vision
- Build a filesystem-first static site generator that turns folders into a coherent, browsable website with minimal configuration, and ships a usable beta for non‑power users.

## Goals
- Make site structure visible and intuitive by mapping folders → collections/entries/blocks.
- Provide a lightweight, hackable toolchain for personal and creative sites.
- Offer dependable build and serve workflows for local development.
- Deliver a beta with an executable and a simple, friendly Web UI.
- Ship at least one “blog” starter for the beta.
- Support a minimal plugin capability (at least a TOC plugin) for the beta.

## Non-goals
- Compete head‑to‑head with full‑scale SSGs or CMS platforms.
- Hide the filesystem behind proprietary abstractions or complex GUIs.
- Guarantee production‑grade stability in the current phase.

## Principles
- Prefer transparent, inspectable outputs over “magic.”
- Keep configuration minimal; favor sensible defaults.
- Treat templates as simple, flexible building blocks.

## Priorities
- Core content modeling from folders and files.
- Reliable rendering pipeline (Markdown, media, templates).
- Developer experience: fast rebuilds, clear outputs, easy debugging.
- Beta readiness for non‑power users (executable + Web UI + starter).

## Constraints
- Built around Bun runtime; not published to npm yet.
- Must remain approachable for non‑developers and creative users.
- Early‑stage project; APIs and features can change.
- Starters are distributed externally (site/repos/zips), not bundled in the tool.

## Success criteria
- A user can build and serve a small site from folders with minimal setup.
- The generated `_public/` output is predictable and easy to inspect.
- Templates can shape site layout without custom code changes.
- A non‑power user can run the beta via an executable + Web UI to build a basic blog starter site.

## Code review status (optional)
- Done: yes (2026-02-05)
- Scope: `src/**`, `templates/**`, `package.json`, `tsconfig.json`, `webette.tool.ts`, `README.md`
- References: `ArPiDev/CODEMAP.md`

## Uncertainties
- FIXED: What is the target milestone for a first “production‑ready” release (post‑beta)?
  - Answer: Not defined yet; focus stays on the beta scope first, then revisit.
- FIXED: Which plugin/extension system is preferred (plugins vs. pipelines vs. both)?
  - Answer: Beta scope includes a minimal plugin capability, starting with a TOC plugin.
- FIXED: What minimum starter templates are required for the first public release?
  - Answer: At least one “blog” starter is required for the beta launch.
