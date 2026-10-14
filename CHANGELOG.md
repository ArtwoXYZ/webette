# Changelog

What changes for the people who use webette, release after release.
The format and the release steps are described in
[docs/versioning.md](docs/versioning.md).

## Unreleased

### Improved

- **Previews stay on your computer**: `webette serve` and the app's Test button
  now only answer your own machine. Add `--share` to `webette serve` to let
  other devices on your network open the site; webette then shows the
  addresses to use.
- **Images are optimized when building from the desktop app**: the app now
  produces the same image sizes as the command line.
- **Safer local control**: the control API used by the desktop app no longer
  answers requests coming from web pages, and the output and log folders can
  no longer be set outside the site folder.

### Fixed

- **Stable page dates**: root entries and index folders no longer get a new
  date on every build. `sitemap.xml` and the dates shown on pages now only
  change when the content does.

### Docs

- **What webette exposes on your machine**: `docs/privacy.md` lists the local
  servers, what is written where, and what the app opens outside its window.
