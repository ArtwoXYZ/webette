// Tool config (TS) loaded by src/config/env.ts
export default {
  logging: {
    level: 'info', // "debug" | "info" | "warn" | "error"
    locale: 'fr', // "fr" | "en"
    dirName: '.webette', // site-local logs folder
  },
  serve: {
    port: 4173, // dev server port
    liveReloadIntervalMs: 1000, // live reload polling interval (ms)
    watcherDebounceMs: 300, // watcher debounce (ms)
  },
  build: {
    outputDirName: '_public', // build output directory
    overwrite: 'replace-files', // "none" | "replace-all" | "replace-files"
    protectAssets: true, // generate forbidden placeholders in asset folders
    writeHtaccess: true, // write a root .htaccess with ErrorDocument 404 and Options -Indexes (Apache only)
    writeNginxSample: true, // write a sample nginx.conf in the build output
    generateIndex: true, // generate root/collection indexes
    readContent: true, // resolve block contents or skip
    exportModel: {
      only: false, // if true, only write the model
    },
  },
}
