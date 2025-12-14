# Webette demonstration

Welcome! This page showcases various block types and behaviors in Webette. Each section is numbered so you can spot them in the generated HTML and in the model.

## 1. Markdown basics

- Headings, lists, emphasis **bold** and _italic_.
- Inline code `console.log("Hello")` and a code block:

```js
function greet(name) {
  return `Hello ${name}`;
}
```

## 2. Quotes & links

> Webette turns Markdown into HTML, keeps raw/ast/html in the model.
> Internal link example: [/posts/draft](../draft/) or [Draft](post: draft)

## 3. Media follows: image, audio, video, then a plain text block.
