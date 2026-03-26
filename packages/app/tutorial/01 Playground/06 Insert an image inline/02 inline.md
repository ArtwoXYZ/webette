# Insert an image inline

## An image is a **block**

In **webette**, an image file is just a **block** inside an **entry**.  
Normally, templates decide where **blocks** appear, but Markdown can also render an image **block** inline.

And **webette** is pretty smart about it: once an image **block** is rendered inline, it won’t be rendered twice on the final page.

## The syntax

Use a Markdown image, but point it to a **webette** target:

- Same **entry**: `![Alt](block: my image.jpg)`
- Another **entry**: `![Alt](collection: My Collection, entry: My Entry, block: my image.jpg)`

You can add a few options too:

- `variant:` (pick which file **webette** should output)
- `figure: true` + `caption: "..."` (wraps it in a `<figure>`)
- `class:` / `id:` / `data-*`

## About variants

An image **block** can produce multiple files:

- the original file (the “default” source)
- generated variants (like `small`, `medium`, `large`)

If you don’t set `variant:`, **webette** uses the default variant configured for the site.

If you do set it, you can force a specific one:

- `![Alt](block: my image.jpg, variant: small)`
- `![Alt](block: my image.jpg, variant: large)`

If you want the full variants reference, see:
[Image variants (docs)](https://docs.webette.org/images/variants)

## Try it!

Edit this file:

```
website-example/01 Playground/06 Insert an image inline/02 inline.md
```

Then make the image `01 The Planet Jupiter.jpg` appear right here (it won't be at the top anymore). Write the line right below:

<!--
Solution:

- Inline image: ![Jupiter](block: 01 The Planet Jupiter.jpg)
- Figure + caption: ![Jupiter](block: 01 The Planet Jupiter, figure: true, caption: "Hello, I am inline")
-->
