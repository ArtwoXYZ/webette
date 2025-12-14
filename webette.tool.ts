// Tool config (TS) loaded by src/config/env.ts
export default {
  logging: {
    level: "info", // "debug" | "info" | "warn" | "error"
    locale: "fr", // "fr" | "en"
    dirName: ".webette", // site-local logs folder
  },
  serve: {
    port: 4173, // dev server port
    liveReloadIntervalMs: 1000, // live reload polling interval (ms)
    watcherDebounceMs: 150, // watcher debounce (ms)
  },
  build: {
    outputDirName: "_public", // build output directory
    overwrite: "replace-all", // "none" | "replace-all" | "replace-files"
    protectAssets: true, // generate forbidden placeholders in asset folders
    writeHtaccess: true, // write a root .htaccess with ErrorDocument 404 and Options -Indexes (Apache only)
    writeNginxSample: true, // write a sample nginx.conf in the build output
    generateIndex: true, // generate root/collection indexes
    readContent: true, // resolve block contents or skip
    exportModel: {
      only: false, // if true, only write the model
    },
  },
  templates: {
    root: "templates", // default templates folder
    defaultWrapper: "wrapper/wrapper.html", // default wrapper
    defaultLayout: "layout/post.html", // default layout
    defaultIndexLayout: "layout/index.html", // default index layout
    notFoundLayout: "layout/not-found.html", // default 404 layout
    accessForbiddenLayout: "layout/access-forbidden.html", // default forbidden layout
  },
  images: {
    requiresImageEngine: true, // enable variant generation via sharp
    sizes: {
      small: 480, // max width for small
      medium: 960, // max width for medium
      large: 1440, // max width for large
    },
    format: "webp", // target format for variants
    quality: 80, // quality (1-100)
    fit: "cover", // resize strategy: cover/contain/fill/inside/outside
    outputDir: "assets/images", // relative path under output dir
    reencodeDefault: false, // re-encode the default variant without resize
  },
  video: {
    outputDir: "assets/video", // relative path under output dir
  },
  markdown: {
    remarkPlugins: [], // shared plugins applied to markdown parsing/rendering
    treatTxtAsMarkdown: true, // when true, .txt files use the markdown pipeline
  },
  audio: {
    outputDir: "assets/audio", // relative path under output dir
  },
};
