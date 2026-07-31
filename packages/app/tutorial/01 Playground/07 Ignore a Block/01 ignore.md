## Sometimes you want a **block** to exist (but not render)

Maybe it's an old image you're not sure you want to delete yet.  
Maybe it's a video you want to keep for later.  
Maybe it's a "bonus" **block** you'll only use in a different layout.

## The file `ignore.webt`

To ignore **blocks** in a specific **entry**, create an `ignore.webt` file at the root of that **entry**.

`ignore.webt` is just a list of **block** names, one per line.

## What “ignored” actually means

In **webette**, an ignored **block** is still detected and kept in the **model**.  
It’s just marked as `skipRender`, so it won’t be included in the default `{{#each blocks}}` loop when the page is rendered.

This is why ignoring is great for “keep it around, but don’t show it”.

## A **block** is ignored right now

This **entry** already has an `ignore.webt`, and it currently ignores:

- `02 Herschel.webp`

So if you don’t see that image on the page, that’s normal.

## Try it!

Edit this file:

```
01 Playground/07 Ignore a Block/ignore.webt
```

And do this:

- Ignore the second **block** too: `03 automatic-data-processing-mach.mp4`
- In **webette** `serve` mode, just wait for live reload: both ignored **blocks** should be gone
- Then make the first one appear again (the image), while keeping the second one ignored
