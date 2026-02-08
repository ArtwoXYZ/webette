export default {
  site: {
    title: "webette",
    lang: "en",
    author: "Artwo",
    url: "https://example.webette.local",
  },

  collections: {
    posts: {
      path: "01 posts",
      name: "Posts",
      slug: "posts",
    },
    lab: {
      path: "02 lab",
      name: "Lab",
      slug: "lab",
    },
    "another-one": {
      path: "03 another one",
      name: "Another one!",
      slug: "another-one",
    },
  },

  templates: {
    root: "_templates",
    assets: {
      dir: "assets",
      publicBase: "/assets",
    },
    default: {
      wrapper: "wrapper/wrapper.hbs",
      layout: "layout/entry.hbs",
      index: "layout/index.hbs",
      notFound: "layout/not-found.hbs",
      accessForbidden: "layout/access-forbidden.hbs",
    },
    custom: {
      entry: {
        "pages/welcome": "layout/welcome.hbs",
        // Playground: fill this in to enable the custom layout for that one entry.
        "playground/custom-layout-for-an-entry": "",
      },
    },
  },

  index: {
    root: { collection: "pages", entry: "welcome" },
  },

  plugins: [
    "_plugins/demo.js",
  ],

  markdown: {
    treatTxtAsMarkdown: false, // keep .txt blocks as plain text in this showcase
    headingShift: 0, // shift Markdown headings (e.g., 1 => h1->h2)
  },

  images: {
    requiresImageEngine: true,
    sizes: {
      small: 480,
      medium: 960,
      large: 1440,
    },
    format: "webp",
    quality: 80,
    fit: "cover",
    outputDir: "assets/images",
    reencodeDefault: false,
    defaultVariant: "medium",
  },

  audio: {
    // Currently copy-only; set outputDir to control public path under the build dir.
    outputDir: "assets/audio",
  },

  video: {
    // Copy-only by default; set outputDir to control public path under the build dir.
    outputDir: "assets/video",
  },
};
