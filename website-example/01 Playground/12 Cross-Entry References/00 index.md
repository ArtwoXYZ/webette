# Cross-Entry References

This page demonstrates the new cross-entry reference system that allows you to reference blocks from other entries without duplicating files.

## How It Works

The system uses special `reference*.webt` files that contain a reference to another block:

```
collection: playground, entry: introduction, block: 00 intro.md
```

When the site is built, the reference is resolved and the target block's content is injected as if it were a normal block.

## Root Entries (entries without collection)

If you need to target a root entry **from inside a collection entry**, use the reserved collection name `root`:

```txt
collection: root, entry: my-root-entry, block: 00 intro.md
```

This also works in Markdown internal links/images using the same target syntax, for example:

```md
[Open root entry](collection: root, entry: my-root-entry)
```

## Reference Examples Below

The following examples show different types of blocks being referenced from other entries.

### Markdown Reference Example

The block below is referenced from the Introduction entry:

### Image Reference Example

The image below is referenced from the "Insert an image inline" entry:

### Video Reference Example

The video below is referenced from the "Ignore a Block" entry:
