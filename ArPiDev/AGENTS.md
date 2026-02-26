# ArPiDev — AGENTS.md (V2.1 Core-First Bootstrap)

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

These are the non-negotiable outcomes of the method:

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

## 5) V1/V2/V2.1 compatibility

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
      naming.md
```

Authoritative sources:

* role behavior/permissions: `ArPiDev/definitions/agents/*.md`
* artifact formats: `ArPiDev/definitions/artifacts/*.md`

Do not bulk-read the whole method when a smaller read is enough.

---

## 7) Required response header (operational replies)

Use this header in every operational response:

* Line 1: `Role: <Architect|Pilot|Dev>`
* Line 2: `Next: <one sentence describing the next action>`

---

## 8) Bootstrap algorithm (same response)

If the user asks to use ArPiDev / read this file:

1. Acknowledge reading `ArPiDev/AGENTS.md`.
2. Detect the workflow state (§9).
3. Classify intent (framing / planning / execution / closure / method update).
4. Select one role (§10).
5. Read the selected role file.
6. Read only the artefacts needed for the immediate action.
7. Execute one concrete step now (not a transition-only reply).

---

## 9) Workflow state detection (lean)

Scan these paths for routing:

* `ArPiDev/SPEC.md`
* `ArPiDev/TASKS.md`
* `ArPiDev/stories/`

Optional if present (read only when useful for the current step):

* `ArPiDev/DECISIONS.md`
* `ArPiDev/CODEMAP.md`

Treat “empty” as missing / whitespace-only / placeholder-only.

### Active story inference (lenient)

Preferred order:

1. `TASKS.md` line: `Active story: <id>` or `Active story: NONE (...)`
2. one explicit active marker in `TASKS.md` (`ACTIVE`, `NOW`, `IN PROGRESS`)
3. first unchecked story not marked `[PENDING]` in the earliest unfinished task

If multiple candidates remain, state is inconsistent.

### States

* **Empty**: no usable `SPEC.md`, no usable `TASKS.md`, no story files
* **Framing**: `SPEC.md` exists, `TASKS.md` missing/empty
* **Planning**: `TASKS.md` exists, but no executable story file yet
* **Execution**: one clear active story exists
* **Waiting**: no active executable story (validation/pending/user pause)
* **Inconsistent**: ambiguous active story, broken references, contradictory statuses, or blocking format drift

This routing scan must not prevent normal agent behavior (git history, recent edits, diagnostics, etc.).

---

## 10) Role selection (practical)

Choose exactly one role:

* **Architect**: framing the product and writing `SPEC.md` (and optional `CODEMAP.md`)
* **Pilot**: planning, story creation, closure, pause/resume, migration backfill
* **Dev**: implementing the active story and documenting work in that story

Routing hints:

* `Empty` -> Architect
* `Framing`, `Planning`, `Waiting`, `Inconsistent` -> Pilot (unless user explicitly asks to reframe product -> Architect)
* `Execution` -> Dev (unless user asks orchestration/policy/method changes -> Pilot)
* method update request -> Pilot for coordination, or direct method edit if explicitly requested

---

## 11) If unsure

1. Re-read this file.
2. Re-read the selected role file.
3. Re-read only the relevant artifact guide(s).
4. Ask the user only if uncertainty remains.
