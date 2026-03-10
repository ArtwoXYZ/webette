# ArPiDev Artifact — Naming Conventions

## Story IDs

Format: `T<task>-S<story>`

* Task number: `T1`, `T2`, ...
* Story number: `S01`, `S02`, ... (two digits)

Example: `T2-S03`

## Story filenames

Format: `<story-id>-<slug>.md`

* `story-id` must match the ID in `TASKS.md`
* `slug` is lowercase, hyphen-separated, short and meaningful

Example: `T2-S03-auth-login.md`

## Matching rule

A story listed in `TASKS.md` is considered present only if a matching file exists in `ArPiDev/stories/` whose name starts with the story ID.

## Agent Roles

* **Architect**: Defines the product frame and scope.
* **Pilot**: Manages the macro plan and story sequencing.
* **Dev**: Implements the active story and logs changes.

## Artifact Roles

* **SPEC.md**: Product frame and constraints.
* **TASKS.md**: Macro plan and execution map.
* **DECISIONS.md**: Cross-cutting decisions.
* **CODEMAP.md**: Optional navigation aid.
* **story.md**: Execution contract and trace.
