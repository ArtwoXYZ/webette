# **webette Versioning Guide**

webette versions are dates. A version says when it came out, nothing more:

```
<YYYY>.<M>.<increment>
```

Example:

```
2026.10.0
```

---

## **1. Components of the Version Number**

### **Year and month (`YYYY.M`)**

When the release happened.

- `YYYY` → year
- `M` → month, without a leading zero (`1` to `12`)

### **Increment (`.0`, `.1`, `.2`, …)**

A counter for the releases of the same month.
It starts at `0` and has no upper limit.

---

## **2. Examples**

```
2026.10.0   → First release of October 2026
2026.10.1   → Follow-up release: fixes or additions
2026.10.14  → As many as the month needs
2027.1.0    → New month, counter resets
```

Versions sort naturally and are read at a glance.

---

## **3. Why This Model?**

- **Readable:** anyone knows _when_ a version came out, developer or not.
- **Flexible:** no need to classify a change as major, minor or patch.
- **Honest:** webette grows step by step; a date does not promise more
  compatibility than the project can guarantee.
- **Plain:** the version is written the same way everywhere, and every tool
  accepts it as is.

A version number does not announce a new chapter of the project. When webette
reaches one (the beta, a new foundation), the release notes say it in words.

---

## **4. Where the Version Lives**

The same three numbers everywhere:

| Place | Form |
| --- | --- |
| `package.json` | `2026.10.0` |
| Git tag, changelog, app and CLI | `v2026.10.0` |

`packages/engine/package.json` is the reference. `packages/app/package.json`
always carries the same version: the engine and the app are released together.

The version in `package.json` is the one of the latest release, or of the
release being prepared.

---

## **5. Preparing a Release**

`CHANGELOG.md` is the single source for release notes. During development,
each pull request adds its user-facing entries under `## Unreleased`,
following the conventions in [CONTRIBUTING.md](../CONTRIBUTING.md).

1. Choose the version: the current month, with the next free increment.
2. Set it in `packages/engine/package.json` and `packages/app/package.json`.
3. In `CHANGELOG.md`, rename `## Unreleased` to the version
   (`## v2026.10.0`) and add a new empty `## Unreleased` above it. Review the
   entries against the previous release: drop fixes for problems that never
   shipped, merge duplicates.
4. Run `bun run typecheck`, `bun test` and `bun run check:tutorial`.
5. Merge these changes into `dev`, then merge `dev` into `main`.
6. From `main`, create an annotated tag whose message is the release notes,
   and push it:

   ```
   bun run release:notes v2026.10.0 > /tmp/notes.md
   git tag -a v2026.10.0 -F /tmp/notes.md
   git push origin v2026.10.0
   ```

   `release:notes` refuses a tag that does not match `package.json`, entries
   left under `Unreleased`, or an empty section.
7. The tag starts the release pipeline (`.tangled/workflows/release.yml`),
   which runs the checks again on the tagged commit.

Never move a tag or reuse a version that was published.
