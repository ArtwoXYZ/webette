# webette

[![Bluesky followers](https://img.shields.io/bluesky/followers/artwo.xyz?style=plastic&logo=bluesky&label=bluesky&labelColor=000&color=0e73ff)](https://bsky.app/profile/artwo.xyz)

![Banner](./.tangled/assets/Webette_GitBanner.png)

**Static sites from your folders. A tiny framework with big dreams.**

webette is a filesystem-first static site generator.
Place your content in folders, give it a few templates, and let it weave your site for you.

webette is especially friendly for personal sites, Neocities-style projects, Nekoweb pages, artists’ portfolios, and all sorts of small, playful experiments. But because it’s hackable, it can also scale into much more ambitious creations.

It is still **not ready for real deployment**, but it is already a living, evolving project with a clear direction. This README explains what webette is today, what it wants to become, and why it exists.

---

## 🔮 The spirit of webette

webette is built on a simple idea:

> **Your folders already know what your website wants to be.**
> Let a tool respect that, not fight it.

Instead of inventing a new mental model, webette leans on the one you already use every day: the filesystem.

* Collections are folders.
* Entries are subfolders.
* Blocks are just files.
* Structure is something you see, not something you configure.

webette’s job is to observe, understand, and weave that structure into a coherent website. It's a quiet, invisible helper doing sensible things.

---

## ✨ What webette aims to become

webette is early in its journey, but its goals are clear:

### **A static site generator shaped by your folders**

Not an abstract CMS, not an opaque pipeline: visible, intuitive structure.

### **A modular tool you can grow with**

webette will eventually support:

* **plugins** (new block types, processors, enrichers),
* **transform pipelines** you can enable or disable,
* **custom behaviors** on any folder or file type.

### **Starters you can trust**

Starters will come in two families:

* **Skelette starters**: minimal, no CSS, just enough to get you going.
* **Full starters**: polished templates, layouts, structure, components.

The goal is to make starting a new site feel effortless, whether you want simplicity or something production-ready later.

### **Themes without ceremony**

A handful of handlebars templates can define a site’s entire look.
webette wants to make theme creation feel like sketching: light, creative, playful.

### **A tool that stays out of the way**

webette doesn’t want to be “clever.”
It wants to be *predictable*, inspectable, and simple to debug.

It should always feel like you’re in control, because you are.

---

## ⚠️ Current state

webette is under active development.
It can scan folders, generate routes, resolve content types, and render templates…
…but **it is not ready for publishing real websites yet**.

Think of it as a working foundation with a lot still to build on top of it.

---

## ⚙️ What exists today

* Folder → collection / entry / block detection
* Slug generation, ordering via numeric prefixes
* Markdown rendering (with unified / remark / rehype)
* Optional plain text mode for `.txt`
* Image support with metadata + variants (sharp if available)
* Audio support with optional metadata
* Video copying
* Template rendering via Handlebars
* A `serve` mode that watches changes and rebuilds the site
* A browsable internal model automatically exported on build

It’s a foundation, but an intentionally simple and flexible one.

---

## 📦 Installation (current workflow)

webette is not on npm yet.
To experiment:

```bash
git clone https://tangled.org/artwo.xyz/webette.git
cd webette
bun install
bun webette build
```

When webette becomes official, the goal is to ship a precompiled bun binary so you can just download it and run `webette`.

---

## 🗂️ Project layout (how webette sees your folders)

webette expects a structure like this:

```
my-site/
  posts/               ← a collection
    my-first-post/    ← an entry
      index.md
      photo.jpg
    another-post/
      index.md
  pages/               ← another collection
    about/
      index.md
  _templates/           ← your templates
```

Then:

```bash
bun webette build
bun webette serve
```

The output appears in `_public/`.

---

## 📚 About the documentation

The [docs](https://tangled.org/artwo.xyz/webette/tree/main/docs) intentionally mix:

* what works today,
* what is being built,
* and things webette intends to support.

For now, the documentation acts both as reference and roadmap.
It will be clarified as the tool approaches a first public release.

---

## 🤝 Contributing

webette is not officially open to contributions yet, the foundations are still shifting.
If you want to follow along, share ideas, or discuss features, feel free to contact me on Bluesky.
Pull requests will open once the API stabilizes.

---

## 🕷️ bebette

bebette is the official spider mascot of webette.
Designed by me, **@artwo.xyz**, she wears a cap, has eight legs, and a strong opinion on folder hierarchies.

---

## 📜 License

webette is free and open source.
For now the LICENSE is intentionally simple:
use it, explore it, be respectful.
A more formal statement will come later (?).

---

## 🌱 Final note

webette is still young, but it already has a personality.
It grows quietly, one thread at a time, toward a tool that feels light, intuitive, and joyful to use.

Thank you for being early. The web is better with curious people in it.