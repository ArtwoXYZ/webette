import type { ElectrobunConfig } from "electrobun/bun";

export default {
  app: {
    name: "Webette",
    identifier: "org.webette.desktop",
    version: "0.1.0",
  },
  build: {
    bun: {
      entrypoint: "./src/bun/index.ts",
    },
    views: {
      main: {
        entrypoint: "./src/web/index.ts",
      },
    },
    copy: {
      "./src/web/index.html": "views/main/index.html",
      "./src/web/init.css": "views/main/init.css",
      "./src/web/style.css": "views/main/style.css",
      "./src/web/app.css": "views/main/app.css",
      "./src/web/fonts": "views/main/fonts",
      "./src/web/assets": "views/main/assets",
    },
  },
} satisfies ElectrobunConfig;
