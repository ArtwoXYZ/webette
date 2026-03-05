# Webette TOC Plugin

A Table of Contents plugin for Webette that generates TOC from markdown headings.

## Features

- **Automatic TOC generation** from markdown headings (h1, h2, h3, h4, h5, h6)
- **Uses Webette's native slug generation** for consistent URL anchors
- **Selective activation** via `toc.webt` marker files
- **Global activation** via configuration
- **Clean CSS styling** with configuration control
- **Semantic HTML5** with accessible ARIA labels
- **BEM-style CSS classes** for easy customization

## Installation

1. Copy the `toc` folder to your site's `_plugins` directory
2. Ensure your site has the plugin directory structure:
   ```
   _plugins/
   └── toc/
       ├── css/
       │   └── toc.css      # Plugin styles
       ├── partials/
       │   └── toc.hbs      # Default template
       └── toc.js          # Main plugin
   ```

## Usage

### Basic Usage

Add a `toc.webt` marker file to any entry directory to enable TOC:

```
my-entry/
├── 01 content.md
└── toc.webt      # This enables TOC for this entry
```

In your template (e.g., `_templates/layout/entry.hbs`):

```handlebars
<main>
  <article>
    {{{toc}}}  <!-- TOC will appear here if available -->
    
    {{#each blocks}}
      {{!-- Your existing block rendering --}}
    {{/each}}
  </article>
</main>
```

### Global Activation

Enable TOC for all entries in your `webette.config.ts`:

```javascript
export default {
  plugins: {
    toc: {
      forAllEntries: true  // Enable TOC for all entries
    }
  }
}
```

### Configuration Options

The plugin respects configuration from your `webette.config.ts` file:

```javascript
export default {
  plugins: {
    toc: {
      forAllEntries: false,  // Default: false
      minLevel: 2,           // Minimum heading level to include (default: 2)
      maxLevel: 4,           // Maximum heading level to include (default: 4)
      loadStyle: true,       // Include default CSS (default: true)
      partialPath: "path/to/custom-toc.hbs"  // Optional custom template
    }
  }
}
```

**Configuration Notes:**
- `forAllEntries: true` - Enable TOC for all entries (no need for `toc.webt` files)
- `minLevel` / `maxLevel` - Control which heading levels appear in TOC (e.g., 2-4 for h2-h4)
- `loadStyle: false` - Disable default CSS if you want to provide your own
- `partialPath` - Specify a custom Handlebars template for TOC rendering

**Default Behavior (when no config provided):**
- Only processes entries with `toc.webt` marker files
- Includes heading levels h2-h4 (minLevel: 2, maxLevel: 4)
- Includes default CSS styling
- Uses built-in recursive template

## CSS Styling

### Default Styles

The plugin includes minimal structural CSS that inherits from your site's theme:

### Custom Styling

**Option 1: Disable default CSS**
```javascript
// webette.config.ts
export default {
  plugins: {
    toc: {
      loadStyle: false  // Disable default CSS
    }
  }
}
```

**Option 2: Override styles**
Add your own CSS to override the default styles:
```css
/* Your site's CSS */
.webette-toc {
  border-left: 3px solid #ccc;
  padding-left: 15px;
}

.webette-toc__link:hover {
  color: #0066cc;
  text-decoration: none;
  border-bottom: 1px solid #0066cc;
}
```

## Template Customization

### Custom Partial

Create a custom template and specify its path in config:

```javascript
// webette.config.ts
export default {
  plugins: {
    toc: {
      partialPath: "_templates/partials/my-toc.hbs"
    }
  }
}
```

### Available Template Variables

```handlebars
{
  toc: {
    items: [
      {
        level: 2,
        text: "Section Title",
        slug: "section-title",
        items: []  // Nested items for subsections
      }
    ]
  }
}
```

## Examples

### Basic TOC
```handlebars
{{{toc}}}
```

### Conditional TOC with fallback
```handlebars
{{#if toc}}
  <aside class="sidebar">
    <h3>Contents</h3>
    {{{toc}}}
  </aside>
{{/if}}
```

## Technical Details

### How It Works

1. **Detection**: Plugin checks for `toc.webt` files or `forAllEntries` config
2. **Parsing**: Extracts headings from markdown content
3. **Slug Extraction**: Uses Webette's generated HTML to get proper slugs
4. **Structure**: Builds hierarchical TOC structure
5. **Rendering**: Compiles template with TOC data
6. **Styling**: Includes CSS if enabled

### BEM Classes

- `.webette-toc` - Main container
- `.webette-toc__inner` - Inner wrapper
- `.webette-toc__list` - List element
- `.webette-toc__item` - List item
- `.webette-toc__item--level-{n}` - Level-specific item
- `.webette-toc__link` - Anchor link

## Troubleshooting

### No TOC Appearing

- Ensure `toc.webt` file exists in the entry directory
- Check that your markdown has proper headings (##, ###, ####)
- Verify the `{{{toc}}}` helper is in your template

### CSS Not Loading

- Check `loadStyle` config option (default: true)
- Verify CSS file exists at `_plugins/toc/css/toc.css`
- Check browser console for errors

## License

MIT License - Free to use, modify, and distribute.
