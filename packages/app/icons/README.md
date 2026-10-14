# App icons

The icons of the desktop app, read by `electrobun.config.ts` when the app is
packaged (`bun run package:app`).

| File | Used on | What it is |
| --- | --- | --- |
| `icon.png` | Windows, Linux | One square PNG, 1024×1024 |
| `icon.iconset/` | macOS | The same image at Apple's sizes |

`icon.iconset/` holds ten PNG files, named exactly:

```
icon_16x16.png        icon_16x16@2x.png      (16, 32 px)
icon_32x32.png        icon_32x32@2x.png      (32, 64 px)
icon_128x128.png      icon_128x128@2x.png    (128, 256 px)
icon_256x256.png      icon_256x256@2x.png    (256, 512 px)
icon_512x512.png      icon_512x512@2x.png    (512, 1024 px)
```

Until these files exist, the app is packaged with the system's default icon.
