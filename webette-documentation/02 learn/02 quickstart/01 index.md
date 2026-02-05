# Quickstart

This page gets you from zero to a local preview.

## 1. Get webette

webette is not on npm yet. For now, you run it from the repository:

```bash
git clone https://tangled.org/artwo.xyz/webette.git
cd webette
```

## 2. Install dependencies

```bash
bun install
```

## 3. Start the example site

```bash
bun run serve website-example
```

Then open `http://localhost:4173`.

Explore the example site, open folders, and try the playground exercises.  
You can edit files as you go and watch the site update.

## 4. Build for hosting (optional)

When you are ready to publish, run:

```bash
bun run build website-example
```

This generates `website-example/_public`, a static site you can host almost anywhere.

## Where to go next

- Ready to create your own structure: [Your first site](collection: learn, entry: your first site)
- Want to understand what is happening: [Mental model](collection: learn, entry: mental model)
- Looking for exact options: [Configuration](collection: reference, entry: configuration) and [CLI](collection: reference, entry: cli)

## About the two config files

- `webette.config.ts` lives inside a site folder. It describes that one site.
- `webette.tool.ts` is the tool defaults (output folder name, serve port, and other defaults).
