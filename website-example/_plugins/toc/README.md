# Webette TOC Plugin

**Name**: TOC Plugin
**Author**: Webette Team
**License**: MIT
**Version**: 1.0.0

## Description

This plugin generates a table of contents from markdown headings and provides a simple `{{toc}}` helper for template integration.

## Features

- Automatic TOC generation from markdown headings
- Configurable heading levels (minLevel/maxLevel)
- Optional per-entry activation via `toc.webt` marker file
- Customizable via `pluginConfig.toc` in webette.config.ts
- Includes default styling (can be disabled)

## Configuration

```typescript
plugins: {
  dir: '_plugins'
},
pluginConfig: {
  toc: {
    forAllEntries: false,  // Set to true to enable for all entries
    minLevel: 2,           // Minimum heading level to include
    maxLevel: 4,           // Maximum heading level to include
    loadStyle: true        // Include default CSS styling
  }
}
```

## Usage

1. Add `{{toc}}` helper to your entry template where you want the TOC to appear
2. Either:
   - Set `forAllEntries: true` in config, or
   - Create an empty `toc.webt` file in specific entry folders

## Template Helpers

- `{{toc}}` - Renders the complete TOC with default styling
- `{{customToc}}` - Renders TOC using custom partial (if configured)

## Files

- `toc.js` - Main plugin implementation
- `partials/toc.hbs` - Default TOC template partial
- `css/toc.css` - Default styling (optional)