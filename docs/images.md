# Image Handling

## Defaults (engine off)

- Images are detected by extension and resolved with lightweight metadata only.
- Stored on each image block under `content.meta`:
  - `size` (bytes) and `mime` inferred from the extension.
  - `width` and `height` extracted via `image-size` when available; failure is non-fatal (warn only).
- Resolution is skipped entirely when `readContent` is `false`.
- Files are copied to the public assets path even when the engine is off; no variants are generated.

## Opt-in generation (sharp)

- Controlled by the `images` section in config (tool defaults in `webette.tool.ts`, site overrides in `webette.config.ts` under `images`).
- Sizes are limited to `small`, `medium`, `large` (+ `default` = original):
  - Defaults: `small=480`, `medium=960`, `large=1440` (px, width max), `format=webp`, `quality=80`, `fit=cover`.
- Paths: `outputDir` (default `assets/images` under the build dir) is also the public route prefix for generated files. Route format: `assets/images/<collection-slug>/<entry-slug>/<block-slug>@<variant>.<ext>`.
  - `reencodeDefault` (default `false`): when `true` and sharp is present, the `default` variant is re-encoded without resizing; otherwise the original is copied.
- Set `requiresImageEngine: true` to generate variants; otherwise only the original is copied.
- Config priority: tool defaults → site overrides (site `images.*` wins over tool settings).

## Outputs

- When enabled, files are written under `<root>/<outputDirName>/<images.outputDir>/<collection>/<entry>/`.
- Filenames: `<block-slug>@<variant>.<ext>` where `<variant>` is `default|small|medium|large` and `<ext>` follows the target format (`jpeg` → `jpg`).
- `content.variants[]` is attached to the image block with:
  - `name`, `route`, `width`, `height`, `format`, `size`
  - Optional `aliasOf` + `reason` when a variant reuses `default`.
- Anti-upscale rule: if the target size exceeds the source (or dimensions are unknown), the variant is aliased to `default` with `reason: "source-too-small"` or `"dimensions-unknown"`.
- Missing sharp: warn once, copy only the `default` variant, alias `small/medium/large` to `default` with `reason: "sharp-missing"`.
- Variant errors are non-fatal: warn and fall back to `aliasOf: "default"`.
- Routes: block routes are only set by resolvers when needed; for images, the block route mirrors the default asset route (or the copied original when the engine is off), and variants always carry their own `route`. The scanned `path` remains the source reference.

## Example config (site override)

```ts
// webette.config.ts
export default {
  images: {
    requiresImageEngine: true,
    sizes: { small: 480, medium: 960, large: 1440 },
    format: "webp",
    quality: 80,
    fit: "cover",
    outputDir: "assets/images",
    reencodeDefault: false,
  },
};
```

## Example output (content)

```json
{
  "meta": { "size": 123456, "mime": "image/jpeg", "width": 1200, "height": 800 },
  "variants": [
    {
      "name": "default",
      "route": "assets/images/posts/my-entry/photo@default.jpg",
      "width": 1200,
      "height": 800,
      "format": "jpg",
      "size": 123456
    },
    {
      "name": "small",
      "route": "assets/images/posts/my-entry/photo@small.webp",
      "width": 480,
      "height": 320,
      "format": "webp",
      "size": 23456
    },
    {
      "name": "large",
      "route": "assets/images/posts/my-entry/photo@default.jpg",
      "aliasOf": "default",
      "reason": "source-too-small"
    }
  ]
}
```
