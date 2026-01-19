## Titles come from your folders (by default)


- **Collection** title → the **collection** folder name
- **Entry** title → the **entry** folder name
- **Block** title → the file name

> Note: ordering numbers like `01` / `02` are ignored when **webette** builds names and titles.

**webette** turns those names into a few useful fields:

- `rawName` : the real folder/file name on disk
- `name` : a cleaned-up name (numbers removed, nicer spacing)
- `slug` : a URL-friendly version
- `id` : derived from the slug (used inside the model)

So yes: if you rename a folder, the URL changes too.

## Display names (without changing the URL)

If you want a nicer title *without* changing the slug/route, use a `name.webt` file.
It adds a `displayName` to the **entry** (or **collection**).

Templates can use the `{{displayName}}` helper to show it.

## Try it

Keep `serve` running.

### 1) Rename this entry folder

Rename this folder:

`website-example/01 Playground/03 Rename an entry/`

For example:
- `03 Rename an entry` → `03 Rename this entry`

In **webette** `serve` mode, just wait for live reload. The URL will change (Don't panic).

### 2) Add a display name

Inside the **entry** folder, create:

`website-example/01 Playground/03 Rename an entry/name.webt`

Put any title you want in it, for example:

`A custom title, without changing the URL`

Now compare:
- the title you see in the page/header
- the URL in the browser
