# Image Handling

This note summarizes how images are handled today and the intended next steps for optimization.

## Current behavior

- Images are detected by extension and resolved with lightweight metadata only.
- Stored on each image block under `content.meta`:
  - `size` (bytes) and `mime` inferred from the extension.
  - `width` and `height` extracted via `image-size` when available; failure is non-fatal (warn only).
- Resolution is skipped entirely when `readContent` is `false`.
- No resizing, format conversion, or HTML integration is performed yet; images are not emitted/copied during the fallback build.

## Planned optimization (opt-in, sharp)

When we wire image optimization, it should remain opt-in and resilient:

- **Config-driven variants**: a site/tool config section (e.g. `images.variants`) will define target sizes/formats/quality, plus a base path for generated assets (default idea: `_public/assets/images/<block-route>/` with URLs like `/assets/images/<block-route>/<slug>@<variant>.<ext>`).
- **Generator**: prefer `sharp` when installed; if absent and variants are requested, log a warning and skip generation rather than failing the build.
- **Outputs in the model**: expose `content.variants[]` with URLs, dimensions, format, and size; keep the original route unchanged.
- **Safety**: deduplicate by hash+variant spec to avoid needless rebuilds; limit variant count/size via config; errors are non-fatal (warn and continue).

This keeps the default build lightweight while allowing opt-in image optimization for “web-light” assets.
