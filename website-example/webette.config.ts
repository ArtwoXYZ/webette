export default {
  site: {
    title: "Website example",
    lang: "en",
    author: "Artwo"
  },

  collections: {
    custom: {
      path: "custom",
      name: "My custom name",
      slug: "custom_slug"
    },
  },

  templates: {
    // root: "_templates",
  },

  plugins: [
    // Optional plugin references
    // root: "_plugins",
  ],

  images: {
    requiresImageEngine: false,
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
  },
};
