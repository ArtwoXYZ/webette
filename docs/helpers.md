# Template Helpers

Webette registers a set of Handlebars helpers available in all templates and layouts.

## Comparison / flow
Helpers to branch logic or pick items inside templates.

- `eq a b` / `neq a b`: strict equality/inequality.
- `in value list`: true if `value` is in an array.
- `first array`: first element of an array.
- `firstBlockOfType blocks type`: first block whose `type` matches.
- `renderLayout name`: render another layout partial (defaults to `templates.defaultLayout` when no name is provided).

Example:
```hbs
{{#if (eq entry.status "draft")}}Draft{{else}}Published{{/if}}   {{!-- Published --}}
{{#if (in "posts" site.collections)}}...{{/if}}                  {{!-- enters block if "posts" exists --}}
{{first entry.blocks}}                                           {{!-- first block object --}}
{{firstBlockOfType entry.blocks "image"}}                        {{!-- first image block or "" --}}
{{renderLayout "layout/post.html"}}                              {{!-- renders the post layout with current context --}}
```

## Strings / text
- `upper value`: uppercase.
- `lower value`: lowercase.
- `capitalize value`: first letter uppercase.
- `title value`: capitalize each word.
- `truncate value len [suffix]`: shorten to `len` chars; suffix defaults to `…`.
- `safe value`: mark string as SafeString (no escaping).

Examples:
```hbs
{{upper site.title}}                       {{!-- MY WEBSITE --}}
{{lower collection.name}}                  {{!-- posts --}}
{{capitalize entry.name}}                  {{!-- My first post --}}
{{title "hello world"}}                    {{!-- Hello World --}}
{{truncate entry.name 12 "..."}}           {{!-- My first po... --}}
{{truncate "hello world" 8}}               {{!-- hello wo… --}}
{{{safe content.html}}}                    {{!-- inserts HTML as-is --}}
```

## Dates / time
- `formatDate value [hash options]`: uses `Intl.DateTimeFormat`; defaults to `site.lang` (if present) and can be overridden with `locale`; hash supports `dateStyle`, `timeStyle`, `locale` (e.g. `{{formatDate entry.date dateStyle="long"}}`); falls back to ISO on error.
- `fromNow value [locale?]`: uses `Intl.RelativeTimeFormat`; defaults to `site.lang` and accepts a `locale` override; returns human “X seconds/minutes/hours/days/months/years ago/from now”.

Examples:
```hbs
{{formatDate buildTime dateStyle="long"}}                         {{!-- April 5, 2025 --}}
{{formatDate entry.date dateStyle="medium" timeStyle="short"}}    {{!-- Apr 5, 2025, 14:32 --}}
{{fromNow entry.date}}                                            {{!-- 2 days ago --}}
{{fromNow entry.date locale="fr"}}                                {{!-- il y a 2 jours --}}
```

## Numbers / math
- `add a b` / `subtract a b` / `multiply a b`: basic arithmetic (returns `""` if inputs are not numeric).
- `divide a b`: division (returns `""` on non-numeric or division by zero).
- `percent part total [decimals]`: percentage, rounded (or fixed decimals if provided).

Examples:
```hbs
{{add 2 3}}         {{!-- 5 --}}
{{subtract 10 4}}   {{!-- 6 --}}
{{multiply 3 7}}    {{!-- 21 --}}
{{divide 10 2}}     {{!-- 5 --}}
{{percent 2 5}}     {{!-- 40 --}}
{{percent 1 3 2}}   {{!-- 33.33 --}}
```

## Collections lookup
- `withCollection <slugOrId>`: find a collection by slug/id/route and set it as context.
- `withEntry <slugOrIdOrRoute>`: find an entry across collections and set it as context (also exposes `collection` in block data).

Examples:
```hbs
{{#withCollection "posts"}}
  <h2>{{name}}</h2>               {{!-- renders collection name --}}
{{/withCollection}}

{{#withEntry "/posts/my-first-post"}}
  <h2>{{name}}</h2>               {{!-- entry name --}}
  <p>Collection: {{collection.name}}</p>
{{/withEntry}}
```

## Images
- `imageSrc block [variant="small|medium|large|default"]`: returns the best URL for the requested variant if it exists on the block, otherwise falls back to the configured `images.defaultVariant`, then the original route.
- `image block [...]`: renders an `<img>` (or `<figure>` when `figure=true`) using the same variant selection. Supports common HTML attributes via hash:
  - `variant`, `class`, `id`, `alt` (fallback: block name/rawName), `title`, `loading` (defaults to `lazy`), `decoding`, `sizes`, `data-*` passthrough.
  - `figure=true` wraps in `<figure>` and `caption` (defaults to `alt/name`); `figureClass` applies to the `<figure>`.
  - Width/height and `srcset` are filled from available variants when present.

Examples:
```hbs
{{imageSrc myImage variant="small"}}                      {{!-- URL only --}}
{{image myImage variant="medium" class="hero" figure=true caption="Cover photo"}}
```

## Context hints
- `buildTime` is available in the render context (use with `formatDate`/`fromNow`).

Notes:
- Variables are escaped by default; use `safe` or triple mustaches for trusted HTML.
- Helpers return `""` when inputs are invalid (e.g., math with non-numeric or division by zero).
