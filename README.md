# Webette

Webette is a tiny experiment aiming to become a simple, folder-driven static-site engine.
Right now, it's basically a skeleton. A promising skeleton, but still a skeleton.

> ⚠️ **Important:** Webette is in a very early prototype stage.
> You should absolutely **not** use it for anything real yet — it barely does anything.
> The current version is mainly here to express a direction, not to deliver features.

---

## 🎯 What Webette _wants_ to become

Webette's goal is simple:

👉 **Make websites by just organizing files and folders on your computer.**

Yes. That’s it.
No complicated build systems. No frameworks. No thousand-line configs.

Just a structure like:

```
posts/
pages/
images/
videos/
```

…and Webette understands what your site should look like.

(One day. Not today.)

---

## 🧪 What Webette can do _right now_

Honestly? Not much.

- There is a CLI (run today with `bun run build <path>` / `bun run serve <path>`; target is global `webette build` / `webette serve`)
  - Options: `-v/--verbose`, `--export-model [path]`, `--export-model-only [path]`
- It can generate a minimal `_public/index.html`
- It watches files and reloads the page on save
- It has a structured logging system with i18n (English/French)
- Logs are stored in `.webette/logs.jsonl`
- There's the beginning of a site config (`webette.config.ts`)
- There's a tiny docs starter: [docs/](https://tangled.org/artwo.xyz/webette/tree/main/docs)
- And… that's about it

There is **no** real content management,
**no** templates,
**no** routing,
**no** plugins,
**no** file scanning,
and absolutely **no** reason to use Webette for an actual site.

Yet.

---

## 🧭 Where the project is heading

Webette wants to grow into a tool that makes websites effortless:

### 🗂 1. **Your folders = your website**

Your folders _are_ your content structure.
Place a Markdown file, an image, or a video somewhere → Webette knows what to do with it.

### 🧩 2. **Tiny plugins for everything**

Future plugins might add:

- content blocks (galleries, code blocks, embeds)
- text enrichments (YouTube, Spotify…)
- useful stuff (comments, likes, reactions)

All optional.
Webette stays small unless you ask it to be big.

### 🧠 3. **Zero configuration brain-cell usage**

You shouldn't need to "learn a system".
You should be able to drop Webette into a folder and have a site instantly.

### ⚡ 4. **Fast iterations**

Because it runs on Bun, build and serve should stay incredibly fast.

---

## 🚧 Current Roadmap (or "Webette’s To-Do List")

### Short-term

- Scan `/posts` and `/pages` automatically
- Generate basic site structure from folders
- Add first content blocks
- Allow custom folder templates (e.g. `videos/`, `gallery/`)

### Mid-term

- Simple template/layout system
- File-based routing
- Developer tooling (preview, error pages)
- Web UI to browse logs and that can run Webette commands (build, serve, etc.) without touching a terminal
  (yes, Webette wants buttons one day)

### Long-term vision

A static-site tool that feels like:

> “I just organized my files and Webette made a website out of it.
> And updating it later is just as easy.”

---

## 🛠 Should you use Webette now?

**No. Really, no.**
It is not ready and not intended for production or personal use yet.

If you clone it today, it serves more as a **proof of intent** than a functioning tool.

But if you’re curious about the philosophy, architecture, or direction — welcome aboard.

---

## ❤️ Why Webette Exists

Because making small websites should be simple.

Because everyone gives up on updating their website the second it asks for more effort than dragging a file into a folder (my last portfolio update was five years ago).

Because file systems are underrated.

Because tools should help you, not drain your soul.

And because it’s fun to build.
