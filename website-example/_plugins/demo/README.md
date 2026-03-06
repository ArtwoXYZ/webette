# Webette Demo Plugin

**Name**: Demo Plugin
**Author**: Webette Team
**License**: MIT
**Version**: 1.0.0

## Description

This is a demonstration plugin that shows how to use Webette's plugin hooks to modify site content and add assets.

## Features

- Adds a demo note block to the "Enriched by a plugin" entry
- Demonstrates the `onResolved` hook
- Shows how to whitelist plugin assets folders

## Configuration

No configuration required. The plugin automatically adds content to the entry with slug "enriched-by-a-plugin".

## Usage

The plugin works automatically when loaded. It will:
1. Find the entry with slug "enriched-by-a-plugin"
2. Add a markdown block with a demo note
3. Whitelist the `assets/images/plugins/demo` folder to prevent pruning

## Files

- `demo.js` - Main plugin implementation

## Example Output

The plugin adds this content to the target entry:

```markdown
> Added by demo plugin - showing transform hooks and prune whitelist.
```