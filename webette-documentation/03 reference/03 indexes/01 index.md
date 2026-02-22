# Indexes

Indexes are special entries that represent collections or the entire site. They provide a way to customize the content and layout of collection listings and the site homepage.

## Index Folder Convention

Webette uses a special folder naming convention to identify index entries:

- **Root index**: A folder named `index` (by default) in the site root represents the homepage
- **Collection indexes**: Folders named `index` (by default) within collections represent that collection's index page

### Configuration

You can customize the index folder name using the `site.indexFolderName` configuration option:

```typescript
// webette.config.ts
export default {
  site: {
    indexFolderName: "homepage", // Use "homepage" instead of "index"
  }
}
```

**Rules for index folder names:**
- Default value: `"index"`
- Case-insensitive matching (e.g., `Index`, `INDEX`, `index` all work)
- Supports numeric prefixes (e.g., `01 index`, `02 Index`)
- The normalized name is used for matching (spaces and special characters are removed)

## Index Content vs Layout

### Content

Index entries can contain any blocks (markdown, images, etc.) just like regular entries. The content is rendered using the appropriate template.

**Example root index structure:**
```
/
  index/
    01 welcome.md      # Main content
    02 banner.png       # Image block
    description.webt    # Optional description
    name.webt           # Optional display name
```

### Layout

Index entries use special layout templates:
- **Root index**: Uses `layout/index.hbs` by default, or a custom template if configured
- **Collection indexes**: Use `layout/index.hbs` by default

You can override layouts using the `templates.custom` configuration:

```typescript
// webette.config.ts
export default {
  templates: {
    custom: {
      index: {
        root: "layout/welcome.hbs", // Custom root index layout
        blog: "layout/blog-index.hbs", // Custom layout for blog collection index
        products: "layout/product-grid.hbs" // Custom layout for products collection index
      }
    }
  }
}
```

**How collection index layouts work:**
- The key name (e.g., `blog`, `products`) corresponds to the collection's slug
- Webette will automatically apply the specified template to that collection's index entry
- If no custom layout is specified for a collection, it falls back to the default `layout/index.hbs`

**Example with full configuration:**
```typescript
// webette.config.ts
export default {
  site: {
    indexFolderName: "home", // Use "home" folders for indexes
  },
  collections: {
    blog: {
      path: "01 blog",
      name: "Blog",
      slug: "blog", // This slug is used for custom layout mapping
    },
    products: {
      path: "02 products", 
      name: "Our Products",
      slug: "products", // This slug is used for custom layout mapping
    }
  },
  templates: {
    custom: {
      index: {
        root: "layout/landing.hbs",
        blog: "layout/blog-index.hbs", // Applied to blog collection index
        products: "layout/product-grid.hbs" // Applied to products collection index
      }
    }
  }
}
```

**File structure for this example:**
```
my-site/
  home/                     # Root index (using "home" as indexFolderName)
    01 welcome.md
  
  01 blog/                  # Blog collection
    home/                   # Blog index (using "home" as indexFolderName)
      01 intro.md
    
    first-post/
      01 content.md
  
  02 products/             # Products collection  
    home/                   # Products index (using "home" as indexFolderName)
      01 featured.md
    
    product-1/
      01 details.md
```

## Index Exclusion Rules

Index entries are automatically excluded from:
- Collection entry listings
- Sitemap generation (unless explicitly included)
- Navigation menus (unless explicitly added)

### Duplicate Handling

If multiple folders match the index folder name pattern:
1. All candidates are sorted alphabetically
2. The first candidate is selected as the index
3. A warning is logged if multiple candidates exist

**Example with duplicates:**
```
/
  index/          # Selected as root index
  01 index/       # Ignored (duplicate)
  Index/          # Ignored (duplicate, case-insensitive match)
```

## Examples

### Example 1: Basic Site Structure

```
my-site/
  index/                # Root index (homepage)
    01 welcome.md
    02 about.md
  
  blog/                 # Collection
    index/              # Collection index
      01 intro.md
    
    first-post/         # Regular entry
      01 content.md
    
    second-post/        # Regular entry
      01 content.md
```

### Example 2: Custom Index Folder Name

```typescript
// webette.config.ts
export default {
  site: {
    indexFolderName: "home",
  }
}
```

```
my-site/
  home/                 # Root index (using custom name)
    01 welcome.md
  
  articles/             # Collection
    home/               # Collection index (using custom name)
      01 intro.md
```

### Example 3: Template Override

```typescript
// webette.config.ts
export default {
  templates: {
    custom: {
      index: {
        root: "layout/landing.hbs",  # Custom root template
      }
    }
  }
}
```

## Technical Details

- Index entries have an `isIndex: true` property in the model
- The scanning process identifies index folders during the raw scan phase
- Index entries are processed through the same enrichment pipeline as regular entries
- Routes for index entries follow the same routing rules as other entries