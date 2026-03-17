# test-generate-pages

Example plugin demonstrating the `onGeneratePages` hook introduced in T5-S04-c.

## What it does

1. **Reserves** the `demo-plugin` top-level route segment via `ctx.addReservedRoute("demo-plugin")` in `onInit`.
   Any entry or collection with that slug is automatically renamed with a warning in the build logs.

2. **Generates two static pages** in `onGeneratePages`:
   - `/demo-plugin/` — index page
   - `/demo-plugin/sub-page/` — sub-page

Both pages use the `entry` layout and are protected from prune automatically.

## How to test slug collision

Create an entry or collection named `demo-plugin` in `website-example` and run a build.
You will see a `build.tags.slugRenamed` warning in the logs.

## Regression check

After a build, the following files must exist:

```
_public/demo-plugin/index.html
_public/demo-plugin/sub-page/index.html
```
