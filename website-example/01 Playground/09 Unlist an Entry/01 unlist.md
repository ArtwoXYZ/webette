## Hide an **entry** without deleting it

That's what "unlisted" means in **webette**.

## What “unlisted” does

An unlisted **entry** (or **collection**) is:

- still in the **model** (`isUnlisted: true`)
- still rendered as a page (it keeps its URL)
- hidden from automatic indexes and default navigation
- excluded from the sitemap

It's not a security feature, but it can be used for standalone pages or to replace the **root index** with an entry.

## The file `unlisted.webt`

To unlist an **entry**, create an empty file named `unlisted.webt` at the root of that **entry**.

The file only needs to exist.

You can also unlist a whole **collection** by creating `unlisted.webt` at the root of the **collection** (it will also mark all its **entries** as unlisted).

## About indexes and `navigation.webt`

This **entry** contains a `navigation.webt` **block**, so you can see a navigation/index at the end of this page.

By default, `navigation.webt` (and the auto-generated index pages) hide unlisted **entries**.

But you can still link to an unlisted **entry** on purpose (custom nav, Markdown links, direct URL), because the page still exists.

## Try it!

We’re going to unlist a different **entry**, so you can watch it disappear from the navigation shown here.

Create this file (empty):

`website-example/02 Example/01 You can Unlist me/unlisted.webt`

If you're using **webette** in `serve` mode, just wait a moment: live reload should refresh this page automatically.

The **entry** *You can Unlist me* should disappear from the navigation here, but if you open its URL directly, it should still work.
