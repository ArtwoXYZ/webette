## Ordering is consistent everywhere

Rules (same everywhere):

- First: numeric order (ascending) when a name starts with a number
- Then: alphabetical order (when numbers are equal, or when there is no number)

This works the same for:

- **collections** (folder names at the site root)
- **entries** (folders inside a **collection**)
- **blocks** (files inside an **entry**)

The numbers are *only* for ordering.
They are not part of the title.

## About zeros

The prefix is read as a number, so leading zeros don't matter:

- `1`, `01`, `001` all mean “1”
- `2` comes after `01` and before `003`

Both styles are fine:

- `01`, `02`, `03`…
- `001`, `002`, `003`…

Just try to keep it consistent inside the same folder.

Items without a numeric prefix come after the numbered ones (and are sorted alphabetically).

## Try it

In this **entry**, you have a file called:

`website-example/01 Playground/04 Reorder with numbers/03 The GREAT NEBULA in ORION.jpg`

Rename it to start earlier, for example:

`03 The GREAT NEBULA in ORION.jpg` → `01 The GREAT NEBULA in ORION.jpg`

Then, in **webette** `serve` mode, just wait for live reload and check the order of the **blocks**.
