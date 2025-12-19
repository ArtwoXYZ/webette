export default {
  site: {
    title: "Webette showcase",
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
    // root: "_templates",
  },

  plugins: [
    "_plugins/demo.js",
  ],

  markdown: {
    treatTxtAsMarkdown: false, // keep .txt blocks as plain text in this showcase
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
