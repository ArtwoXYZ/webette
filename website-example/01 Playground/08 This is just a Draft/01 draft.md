## A **draft** is an **entry** that won't ship

This is useful when you're:

- writing a page that’s not ready yet
- preparing a new section for later
- testing content without publishing it by accident

## The file `draft.webt`

To mark an **entry** as a draft, create an empty file named `draft.webt` at the root of the **entry**.

That’s it. The content doesn’t matter: the file just needs to exist.

This **entry** has one:

```
website-example/01 Playground/08 This is just a Draft/draft.webt
```

## Serve vs Build

- `serve` keeps drafts by default (so you can work on them)
- `build` always strips drafts (so they don’t end up in the output or the exported **model**)

## Try it!

Edit (rename or delete) this file:

```
website-example/01 Playground/08 This is just a Draft/draft.webt
```

Then check two things:

- In your terminal logs, the “drafts kept” count should change
- In a `build`, this **entry** should now appear in the output (because it’s no longer a draft)

<!--
Solution:

- To "publish" this entry: remove draft.webt (or rename it to something else, like _draft.webt)
- To make it a draft again: create draft.webt again (empty file)
-->
