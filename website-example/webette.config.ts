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
  },

  audio: {
    // Currently copy-only; set outputDir to control public path under the build dir.
    outputDir: "assets/audio",
    requiresAudioEngine: false,
  },
};
