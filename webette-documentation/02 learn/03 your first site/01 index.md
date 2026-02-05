# Your first site

This page is a practical walkthrough. We are going to build a tiny blog.

If you prefer to start from a ready-made design, use a starter instead.  
The full starter catalog will live at `hub.webette.org/full-starters` (coming soon).  
Look for **Full Starter: Simple Blog Starter**.

## Goal

By the end, you will have:

- a home page
- an about page
- a posts section with a couple of entries

## 1. Create a new site folder

Make a folder for your site, then add a minimal config file.

```text
my-blog/
  webette.config.ts
```

Your `webette.config.ts` can start simple. You will refine it later.

## 2. Add collections

Collections are top-level folders. For a blog, we will use:

- `pages` for pages like Home and About
- `posts` for blog posts

```text
my-blog/
  webette.config.ts
  pages/
  posts/
```

## 3. Add your first pages (entries)

Each entry is a folder inside a collection. Each entry becomes a page.

```text
my-blog/
  pages/
    01 home/
      01 index.md
    02 about/
      01 index.md
```

The numeric prefixes (`01`, `02`) control ordering. webette sorts by number first, then alphabetically.

Write some content in the markdown files.

## 4. Add blog posts

Create a couple of entries under `posts/`:

```text
my-blog/
  posts/
    01 my first post/
      01 index.md
    02 second post/
      01 index.md
```

Each post entry is a page. You can add more blocks by dropping more files in the entry folder.

## 5. Add blocks inside a page

Blocks are the files inside an entry folder. A few examples:

```text
01 index.md         markdown content
02 photo.jpg        an image block
03 notes.txt        a text or markdown block (depends on your config)
navigation.webt     a Navigation Plan block
```

You do not need to register blocks. You add a file, and webette picks it up.

## 6. Optional files that unlock features

You can add small marker files to change behavior:

- `draft.webt` keeps a page in local preview but removes it from `build` output.
- `unlisted.webt` hides a page or collection from Automatic Index Pages and the sitemap.
- `ignore.webt` lists blocks to skip from automatic rendering (the block still exists in the model).
- `name.webt` sets a display title without changing the slug.
- `description.webt` adds a description available to templates.

## 7. Add a little navigation

If you want an ordered menu or index, add `navigation.webt` inside an entry.  
It defines a Navigation Plan that templates can render.

You will learn the details in [Navigation & indexes](collection: learn, entry: navigation & indexes).

## Next steps

- Understand what webette is building: [Mental model](collection: learn, entry: mental model)
- Learn about navigation and indexes: [Navigation & indexes](collection: learn, entry: navigation & indexes)
