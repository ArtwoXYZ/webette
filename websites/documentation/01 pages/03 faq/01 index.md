# FAQ

## What is the difference between `build` and `serve`?
`build` generates your site into `_public` and stops.  
`serve` keeps rebuilding on change and serves the site locally.
More in [Build & deploy basics](collection: learn, entry: build & deploy basics) and the [CLI reference](collection: reference, entry: cli).

## Where does the output go?
By default, webette writes everything to `_public` in your site root.
See [Build pipeline](collection: reference, entry: build pipeline) and [Configuration](collection: reference, entry: configuration).

## Do I need to know code?
Not really. If you can manage folders and files, you can use webette.  
Templates and plugins are there if you want to go further.

## How do I add a new page?
Create a new entry folder inside a collection and add a markdown file.  
webette turns that entry into a page.
Steps and examples live in [Your first site](collection: learn, entry: your first site).

## How do I change the order?
Use numeric prefixes like `01`, `02`, `03` on folders and files.  
webette sorts by number first, then alphabetically.
Details in [Filesystem](collection: reference, entry: filesystem).

## How do I hide a page?
Add `draft.webt` to keep it for local work, or `unlisted.webt` to hide it from indexes.  
Unlisted pages still exist at their URLs.
See [Navigation & indexes](collection: learn, entry: navigation & indexes) for the full behavior.

## Do I need templates?
Yes. webette renders entries with Handlebars templates.  
If your site has no templates, webette falls back to the tool templates.
See [Templates](collection: learn, entry: templates) or the [Templates reference](collection: reference, entry: templates).

## Can I use plugins?
Yes. Plugins are optional ESM modules that can extend webette.  
They can transform the model, blocks, entries, or templates.
See [Plugins](collection: learn, entry: plugins) or the [Plugins reference](collection: reference, entry: plugins).

## Can I build navigation without coding?
Yes. Add a `navigation.webt` file to define a Navigation Plan.  
Templates can render it as a menu or index.
See [Navigation & indexes](collection: learn, entry: navigation & indexes).

## What about images, audio, or video?
Drop files into an entry and webette will copy them to the output.  
Images can generate variants, and audio can include metadata when available.
See [Writing content](collection: learn, entry: writing content) and [Resolvers & block types](collection: reference, entry: resolvers & block types).

## What is `_public/_model`?
It is a JSON export of the site model.  
It helps you inspect what webette sees and renders.
See [Mental model](collection: learn, entry: mental model) or [Model & export](collection: reference, entry: model & export).
