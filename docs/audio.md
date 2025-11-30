# Audio Handling

## Defaults (no variants)

- Audio files are detected by extension (`.mp3`, `.wav`, `.ogg`, `.flac`, `.m4a`, `.aac`).
- Resolution is skipped when `readContent` is `false`.
- Base metadata always stored under `content.meta`: `size` (bytes) and `mime` inferred from extension.
- Originals are always copied to the public assets path; the block gets a `blockRoute` pointing to the copied file.

## Optional metadata (music-metadata)

- If the optional dependency `music-metadata` is present, the resolver extracts when available:
  - Technical: `duration`, `bitrate`, `sampleRate`, `channels`, `codec`.
  - Tags: `title`, `artist`, `album`, `year`, `genre` (array).
- Failures or missing dependency are non-fatal: a warning is logged and only base metadata remains.

## Paths and routes

- Output dir comes from config: `<root>/<outputDirName>/<audio.outputDir>` (defaults to `_public/assets/audio` via `webette.tool.ts`; site overrides with `site.audio.outputDir`).
- Public routes mirror the output segment: `assets/audio/<collection>/<entry>/<slug><ext>`.
- Slug/route hints are reused so nested routes match the content structure.

## Configuration

- Tool defaults live in `webette.tool.ts` under `audio`; site overrides under `site.audio` in `webette.config.ts`.
- Fields:
  - `outputDir`: relative path under the build output (default `assets/audio`).

## Example output (content)

```json
{
  "meta": {
    "size": 123456,
    "mime": "audio/mpeg",
    "duration": 201.2,
    "bitrate": 320000,
    "sampleRate": 48000,
    "channels": 2,
    "codec": "MPEG 1 Layer 3",
    "title": "Song",
    "artist": "Artist",
    "album": "Album",
    "year": 2024,
    "genre": ["Rock"]
  },
  "blockRoute": "assets/audio/posts/my-entry/song.mp3"
}
```
