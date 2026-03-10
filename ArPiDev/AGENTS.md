# ArPiDev — AGENTS.md (V2.2)

This file is the single mandatory entry point for AI agents using ArPiDev.

Mission:

1. detect the repo workflow state,
2. select exactly one role (Architect / Pilot / Dev),
3. execute the next concrete action immediately.

This file is English-only. Do not rewrite or translate it.

---

## 0) Language policy

* This file stays in English.
* Chat replies must match the user's language.

---

## 1) What ArPiDev is (and is not)

ArPiDev is a lightweight orchestration method for long-running coding work.

It exists to provide:

* clear steps (`SPEC` -> `TASKS` -> one active story),
* visible traces of what was changed and why,
* clean pause/resume points,
* logical commit preparation when requested.

It does **not** replace the coding agent's native skills (repo exploration, debugging, git usage, diagnostics, diff reading, IDE history).

---

## 2) User control guarantees (core promises)

* **User override wins**: the user can redirect scope or priorities at any time.
* **No hostage flow**: after a story is closed, the user may pause immediately.
* **Visible reasoning**: story logs must explain what was done and why.
* **Assisted coding, not blind vibe coding**: work happens against a story with testable `Done when`.
* **Long-project continuity**: `TASKS.md` + one active story keep progress legible.
* **Open-source friendly commits**: commit proposals can be required by `SPEC.md`.

---

## 3) Native agent behavior is preserved

ArPiDev does not replace the coding agent's default capabilities.

* Keep using platform-provided context and signals (IDE/chat history, diagnostics, file diffs, git status, recent commits, tool outputs).
* The ArPi scan below is only for workflow routing.
* Use the smallest additional reads/commands needed to act safely.

---

## 4) Core vs optional artefacts

### Core (default)

* `ArPiDev/SPEC.md`
* `ArPiDev/TASKS.md`
* `ArPiDev/stories/*.md`

### Optional (use only when helpful)

* `ArPiDev/DECISIONS.md` (cross-story or repeated decisions)
* `ArPiDev/CODEMAP.md` (existing repo adoption / large codebase navigation)

---

## 5) V1/V2/V2.1/V2.2 compatibility

* Read older ArPiDev `TASKS.md` and story files leniently.
* Missing newer sections is not an error by default.
* Treat format drift as an inconsistency only when it blocks safe execution or closure.
* Prefer minimal Pilot backfill over full rewrites.

---

## 6) Read-only index (load only what you need)

```text
ArPiDev/
  AGENTS.md
  stories/
  definitions/
    naming.md
    agents/
      architect.md
      pilot.md
      dev.md
    artifacts/
      spec.md
      tasks.md
      story.md
      decisions.md
      codemap.md
```

Authoritative sources:

* role behavior/permissions: `ArPiDev/definitions/agents/*.md`
* artifact formats: `ArPiDev/definitions/artifacts/*.md`
* naming conventions: `ArPiDev/definitions/naming.md`

Do not bulk-read the whole method when a smaller read is enough.

---

## 7) Required response header (operational replies)

Use this header in every operational response:

* Line 1: `Role: <Architect|Pilot|Dev>`
* Line 2: `Next: <one sentence describing the next action>`

---

## 8) Boot: Scan → Route → Act

When the user asks to use ArPiDev / read this file, execute in **one response**:

### Step 1 — Scan

Check for presence and usability of:

* `ArPiDev/SPEC.md`
* `ArPiDev/TASKS.md`
* `ArPiDev/stories/`

Treat "empty" as missing (whitespace-only or placeholders only).

Active story inference (lenient):
1. `TASKS.md` line: `Active story: <id>` or `Active story: NONE (...)`
2. one explicit active marker in `TASKS.md` (`ACTIVE`, `NOW`, `IN PROGRESS`)
3. first unchecked story not marked `[PENDING]` in the earliest unfinished task

If multiple candidates remain → Inconsistent.

### Step 2 — Route

Pick exactly one role using this decision tree:

```
No usable SPEC.md                → Architect
SPEC.md exists, no usable TASKS.md  → Pilot
TASKS.md exists, no active story     → Pilot
One clear active story               → Dev
Ambiguous / Inconsistent             → Pilot  (fix before acting)
```

**Explicit user intent overrides state.** If the user names a role or clearly signals framing / planning / implementation, use that.

### Step 3 — Act

1. Read the selected role file.
2. Read only the artefacts needed for the immediate action.
3. Execute one concrete step now.

**A response that only describes what you will do is not valid. You must produce a concrete output — a file write, a structured proposal, or an explicit decision — in the same response.**

---

## 9) If unsure

Re-read this file, then the selected role file, then the relevant artifact guide. Ask the user only if uncertainty remains after that.
