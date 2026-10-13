# Contributing to Webette

Thank you for your interest in Webette.

## 1) Contribution licensing

By submitting a contribution (pull request, patch, commit, issue containing code, etc.), you agree that:

- contributions to the **code** (including tests, scripts, templates) are licensed under the **Apache License 2.0**;
- contributions to the **documentation** are licensed under **CC BY 4.0**.
- contributions to **artwork** (illustrations, mascot edits, icons, SVG/PNG assets, etc.) are licensed under **CC BY 4.0**.

You also represent that you have the necessary rights to submit your contribution, and that it does not infringe third-party rights.

## 2) Credit

Unless you request otherwise, your contribution may be credited through the Git history.

## 3) Where work happens

webette is hosted on Tangled: <https://tangled.org/artwo.xyz/webette>.

- Work items are Tangled issues.
- `dev` is the working branch; `main` only moves at release time.
- Pull requests target `dev`.

## 4) Issues

Title: a short, concrete sentence in English, without a prefix. For example
"Keep synthetic page timestamps stable between builds".

Describe the need or the problem, the expected result, and the criteria that
make the work done. For a bug, add the steps to reproduce, what happens, what
should happen, and the version. Avoid vague titles such as "Misc improvements".

## 5) Commits and pull requests

Commit titles follow `<type>(<scope>): <short description>`, in English, with
one primary scope from [docs/commit-scopes.md](docs/commit-scopes.md). The
description is one to five bullet lines: what changed, why, and how it was
checked.

```
feat(sorting): date sorting, sorting centralized in build

- Add sorting.type support for created/updated with deterministic fallbacks.
- Centralize config-driven sorting in build/sorting after history.
- Validate with several sorting configurations on the tutorial site.
```

A pull request uses the same title format. Explain the problem, the resulting
behavior, the checks you ran and what remains. Reference the issues it covers.
Add a proposed changelog line for each change a user would notice, or say that
the work is internal.

Commits, pull requests and issues carry no AI attribution (no `Co-Authored-By`
trailer, no "generated with" line).

Before opening a pull request, run from the repository root:

```
bun run typecheck
bun test
bun run build:tutorial
```

## 6) Changelog

`CHANGELOG.md` is the single source for release notes. Pending changes go
under `## Unreleased`; a release renames that section. The format and the
release steps are described in [docs/versioning.md](docs/versioning.md).

| Section | Use it for | Commit types |
| --- | --- | --- |
| Added | A capability that did not exist | `feat` |
| Improved | A better existing capability or flow | `feat`, `perf`, `refactor` with visible effect |
| Fixed | A defect present in a released version | `fix` |
| Docs | Guides and reference | `docs` |
| Maintenance | Dependencies, tests, CI, tooling that asks something of users | `chore`, `ci`, `build`, `test` |

- One entry per distinct change: `- **Short title**: one or two sentences on
  what changes and why it matters.`
- Write for the people who use webette, in plain words. Internal work with no
  visible effect stays in the pull request.
- Compare with the previous release, not with the steps of the work: a problem
  that appeared and was fixed between two releases has no entry.
- Call out any change that asks users to do something, with the steps.
- Never rewrite the notes of a published version.
