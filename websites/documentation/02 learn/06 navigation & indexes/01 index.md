# Navigation & Indexes

## Understanding Indexes

Indexes are special pages in Webette that represent your site's homepage or collection listings. They help organize your content and provide custom landing pages.

### What are Indexes?

Think of indexes as "cover pages" for different sections of your site:

- **Root Index**: Your site's homepage (e.g., `index/` folder)
- **Collection Indexes**: Introduction pages for each collection (e.g., `blog/index/` folder)

### Basic Structure

```
my-website/
  index/                ← Your homepage
    01 welcome.md       ← Main content
    02 banner.jpg       ← Hero image
  
  blog/                ← A collection
    index/             ← Blog collection homepage
      01 intro.md       ← Blog introduction
    
    my-first-post/     ← Regular entry
      01 content.md
```

## Creating Your First Index

### Step 1: Create the Index Folder

Create a folder named `index` in your site root:

```bash
mkdir index
```

### Step 2: Add Content

Add markdown files with numbered prefixes:

```bash
# Create welcome content
echo "# Welcome to my site!" > "index/01 welcome.md"
```

### Step 3: Add a Collection Index

Create a collection and its index:

```bash
mkdir -p blog/index
echo "# Blog Introduction" > "blog/index/01 intro.md"
```

## Customizing Index Behavior

### Change the Index Folder Name

Don't like "index"? Change it in your config:

```typescript
// webette.config.ts
export default {
  site: {
    indexFolderName: "home", // Now use "home" instead of "index"
  }
}
```

### Use Custom Templates

Make your homepage stand out:

```typescript
// webette.config.ts
export default {
  templates: {
    custom: {
      index: {
        root: "layout/landing.hbs", // Custom homepage template
        blog: "layout/blog-header.hbs", // Custom template for blog index
      }
    }
  }
}
```

**How collection custom layouts work:**
- Use the collection's slug as the key (e.g., `blog` for a blog collection)
- Create a corresponding template file (e.g., `layout/blog-header.hbs`)
- Webette automatically applies the right template to each collection's index

**Example setup:**
```typescript
// webette.config.ts
export default {
  collections: {
    blog: {
      path: "01 blog",
      name: "Blog",
      slug: "blog", // This matches the custom layout key
    }
  },
  templates: {
    custom: {
      index: {
        root: "layout/landing.hbs",
        blog: "layout/blog-header.hbs", // Custom blog index template
      }
    }
  }
}
```

## How Indexes Work

### Automatic Features

- **Exclusion**: Indexes don't appear in regular listings
- **Routing**: Indexes get clean URLs (e.g., `/blog/` instead of `/blog/index/`)
- **Templates**: Special index templates are used automatically

### Duplicate Handling

If you accidentally create multiple index folders (e.g., `index/`, `Index/`, `01-index/`), Webette will:
1. Pick the first one alphabetically
2. Warn you about the duplicates
3. Ignore the extras

## Common Patterns

### Pattern 1: Simple Blog

```
/
  index/            # Homepage with welcome message
  
  posts/           # Blog collection
    index/         # Blog index with "Latest Posts" heading
    
    post-1/       # Individual entry
    post-2/
```

### Pattern 2: Portfolio Site

```
/
  index/            # Homepage with hero section
  
  work/            # Portfolio collection
    index/         # Work index with filter options
    
    project-1/
    project-2/
  
  about/           # About page (regular entry)
```

### Pattern 3: Documentation Site

```
/
  index/            # Landing page with product info
  
  docs/            # Documentation collection
    index/         # Docs homepage with search
    
    getting-started/
    advanced/
```

## Tips & Best Practices

1. **Start simple**: Begin with basic `index/` folders
2. **Use descriptions**: Add `description.webt` files for better SEO
3. **Customize later**: Add template overrides after getting the basics working
4. **Check warnings**: If you see duplicate index warnings, clean up extra folders
5. **Test routing**: Verify your indexes have clean URLs in the final build
