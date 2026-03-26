There are a few ways to add a link in **webette**, depending on what you want to point to.

## External links (Markdown)

Just use regular Markdown:

- In Markdown: `[Open example.com](https://example.com)`,
- it's rendered as: [Open example.com](https://example.com)

By default, external links open in a new tab.

## Internal links (**collections** / **entries** / **blocks**)

**webette** can resolve internal targets written in the link URL:

- **Entry**: `[Open my entry](entry: my entry)`
- **Collection**: `[The Playground](collection: Playground)`
- **Block** (file): `[Open this image](block: My Image.jpg)`

For example:

- In Markdown: `[Open "Reorder with numbers"](entry: Reorder with numbers)`,
- it's rendered as: [Open "Reorder with numbers"](entry: Reorder with numbers)

You can also add common HTML attributes as options: 
```
[Open my entry](entry: my entry, class: button, id: cta, title: "Go", aria-label: "Go to the next page")
```

### How does resolution work?

When you write `collection:` / `entry:` / `block:`, **webette** tries to match what you wrote against:

- the **name** (folder/file name, without ordering numbers)
- the **slug**
- the **id**

If you only write `entry: the entry name`, the **collection** is assumed:  
it will look inside the current **collection** (the one your Markdown **block** belongs to).

It means:

- For an **entry** from another **collection**, add `collection:`: 
```
[Open this image](collection: My Collection, entry: My Entry)
```

- For a **block** inside another **entry**, add `entry:` (and optionally `collection:`): 
```
[Open this image](collection: My Collection, entry: My Entry, block: My Image.jpg)
```


## External links with options

If you want the same options syntax for an external link, use `url: example.com`:

```
[Open](url: https://example.com, class: button, title: "External link")
```

## The special block `navigation.webt`

`navigation.webt` is a special **block** that defines a **Navigation Plan**: an ordered list of **collections** and **entries**.
It is meant to be used by templates to build a **Site Menu**, sidebars, custom TOC, etc.

If you want to see a real one, open:

```
website-example/01 Playground/09 Unlist an Entry/02 navigation.webt
```

If you want the full `navigation.webt` reference, see: [navigation.webt (docs)](https://docs.webette.org/blocks/navigation)

## Try it!

Here is a list of links you can try to create.  
In `website-example/01 Playground/05 Add a Link/01 link.md`, there are comments at the end of the list to help you, but try without looking first.

### Links to try

- External (normal Markdown):
- External (custom `url:`):
- Internal **entry** (same **collection**):
- Internal **entry** (other **collection**):
- Internal **block** (other **entry**):

<!--
Solution :

- External (normal Markdown): [Artwo's website](https://artwo.xyz)
- External (custom `url:`): [Example button](url: https://artwo.xyz, class: button, title: "A button link")
- Internal **entry** (same **collection**): [Go to Rename an entry](entry: Rename an entry)
- Internal **entry** (other **collection**): [Go to the Credits page](collection: credits, entry: credits)
- Internal **block** (other **entry**): [Open the nebula image](entry: Reorder with numbers, block: The GREAT NEBULA in ORION.jpg)
-->
