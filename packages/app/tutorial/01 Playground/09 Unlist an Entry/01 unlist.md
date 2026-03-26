## Hide an **entry** without deleting it

That's what "unlisted" means in **webette**.

## What “unlisted” does

An unlisted **entry** (or **collection**) is:

- still in the **model** ( `isUnlisted: true` )
- still rendered as a page (it keeps its URL)
- hidden from **Automatic Index Pages** and default **Site Menu**
- excluded from the sitemap

It's not a security feature, but it can be used for standalone pages or to replace the **Root Automatic Index Page** with an entry (Index Override).

## The file `unlisted.webt`

To unlist an **entry**, create an empty file named `unlisted.webt` at the root of that **entry**.

The file only needs to exist.

You can also unlist a whole **collection** by creating `unlisted.webt` at the root of the **collection** (it will also mark all its **entries** as unlisted).

## About Automatic Index Pages and `navigation.webt`

This **entry** contains a `navigation.webt` **block**, so you can see a **Navigation Plan** rendered as a **Site Menu** at the end of this page.

By default, `navigation.webt` (and the **Automatic Index Pages**) hide unlisted **entries**.

But you can still link to an unlisted **entry** on purpose (custom nav, Markdown links, direct URL), because the page still exists.

## Try it!

We’re going to unlist a different **entry**, so you can watch it disappear from the **Site Menu** shown here.

Create this file (empty):

```
website-example/02 Example/01 You can Unlist me/unlisted.webt
```

If you're using **webette** in `serve` mode, just wait a moment: live reload should refresh this page automatically.

The **entry** *You can Unlist me* should disappear from the **Site Menu** here, but if you open its URL directly, it should still work.
