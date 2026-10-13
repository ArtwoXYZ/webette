# **webette Versioning Guide**

webette uses a **hybrid versioning model** designed to be simple, predictable, and expressive.
It combines a high-level _generation number_ with a _calendar-based release cycle_.

This format is:

```
v<generation> <YYYY.MM>.<increment>
```

Example:

```
v1 2025.12.1
```

---

## **1. Components of the Version Number**

### **Generation (`v1`, `v2`, …)**

A broad milestone.
This number only changes when webette reaches a significant stage in its evolution —
major architectural improvements, new foundations, or a major shift in how the tool works.

This is **not** tied to breaking changes.
It’s simply a way to mark eras of the project.

### **Calendar Release (`YYYY.MM`)**

A datestamp that indicates the release cycle.

- `YYYY` → year
- `MM` → month

This makes versions easy to interpret at a glance and avoids ambiguity around compatibility rules.

### **Increment (`.0`, `.1`, `.2`, …)**

A sequential counter for releases within the same month.
It resets at the beginning of each new month.

Examples:

- First release of the month → `.0`
- Small follow-up or fix → `.1`
- Additional feature or patch → `.2`

---

## **2. Examples**

```
v1 2025.12.0   → First December 2025 release
v1 2025.12.1   → Follow-up release: fixes or additions
v1 2026.01.0   → New month, counter resets
v2 2026.05.0   → New project era / major milestone
```

This scheme sorts naturally and remains easily readable.

---

## **3. How to Decide the Generation Number**

Increase the generation only when:

- a foundational refactor lands,
- the internal architecture evolves significantly,
- the philosophy or target audience of webette shifts,
- or when you feel the project enters a new “chapter.”

Do _not_ increment the generation for:

- normal feature additions,
- breaking changes,
- bug fixes,
- plugin API updates.

Generations represent **eras**, not compatibility.

---

## **4. Why This Model?**

webette’s versioning system is designed to avoid the confusion of traditional SemVer while remaining meaningful:

- **Readable:** users immediately know _when_ a version came out.
- **Flexible:** no need to classify changes as major/minor/patch.
- **Structured:** generations give long-term coherence.
- **Release-friendly:** perfect for a tool that evolves incrementally and experimentally.

It reflects the way webette grows: organically, creatively, and with clarity.

---

## **5. Where the Version Lives**

People read `v0 2025.12.0`. `package.json` and Git tags cannot hold that form,
so they carry the same numbers packed into three fields:

```
<generation>.<YYYY>.<MM><increment>
```

| Shown to people | `package.json` | Git tag |
| --- | --- | --- |
| `v0 2025.12.0` | `0.2025.120` | `v0.2025.120` |
| `v0 2026.10.1` | `0.2026.101` | `v0.2026.101` |
| `v1 2026.01.3` | `1.2026.13` | `v1.2026.13` |

The last digit is the increment, so a month holds at most ten releases
(`.0` to `.9`).

`packages/engine/package.json` is the reference. `packages/app/package.json`
always carries the same version: the engine and the app are released together.

---

## **6. Preparing a Release**

`CHANGELOG.md` is the single source for release notes. During development,
each pull request adds its user-facing entries under `## Unreleased`,
following the conventions in [CONTRIBUTING.md](../CONTRIBUTING.md).

1. Choose the version: the current month, with the next free increment.
2. Set it in `packages/engine/package.json` and `packages/app/package.json`.
3. In `CHANGELOG.md`, rename `## Unreleased` to the displayed version
   (`## v0 2026.10.0`) and add a new empty `## Unreleased` above it. Review the
   entries against the previous release: drop fixes for problems that never
   shipped, merge duplicates.
4. Run `bun run typecheck`, `bun test` and `bun run build:tutorial`.
5. Merge these changes into `dev`, then merge `dev` into `main`.
6. From `main`, create an annotated tag whose message is the release notes,
   and push it:

   ```
   bun run release:notes v0.2026.100 > /tmp/notes.md
   git tag -a v0.2026.100 -F /tmp/notes.md
   git push origin v0.2026.100
   ```

   `release:notes` refuses a tag that does not match `package.json`, entries
   left under `Unreleased`, or an empty section.
7. The tag starts the release pipeline (`.tangled/workflows/release.yml`),
   which runs the checks again on the tagged commit.

Never move a tag or reuse a version that was published.

---

## **7. Summary**

The official version format is:

```
v<generation> <YYYY.MM>.<increment>
```

- **Generation** → big milestones
- **Date** → when the release happened
- **Increment** → multiple releases in the same month

This model is simple, descriptive, future-proof, and works beautifully with webette’s philosophy.
