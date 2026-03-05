export default {
  site: {
    title: 'webette',
    lang: 'en',
    author: 'Artwo',
    url: 'https://example.webette.local',
    social: {
      injectHead: true,
      image: '_templates/assets/social.png',
      titleTemplate: '{{pageTitle}} | {{siteTitle}}',
      descriptionTemplate: '{{pageDescription}}',
      defaultDescription: 'Webette example site',
      excerptFromFirstTextBlock: true,
      excerptMaxWords: 30,
      excerptSuffix: '…',
    },
    icons: {
      source: '_templates/assets/icon.jpg',
      themeColor: '#ffffff',
      colorScheme: 'light dark',
    },
  },

  collections: {
    posts: {
      path: '01 posts',
      name: 'Posts',
      slug: 'posts',
    },
    lab: {
      path: '02 lab',
      name: 'Lab',
      slug: 'lab',
    },
    'another-one': {
      path: '03 another one',
      name: 'Another one!',
      slug: 'another-one',
    },
  },

  sorting: {
    type: 'name',
    order: 'asc',
  },

  templates: {
    root: '_templates',
    assets: {
      dir: 'assets',
      publicBase: '/assets',
    },
    default: {
      wrapper: 'wrapper/wrapper.hbs',
      layout: 'layout/entry.hbs',
      index: 'layout/index.hbs',
      notFound: 'layout/not-found.hbs',
      accessForbidden: 'layout/access-forbidden.hbs',
    },
    custom: {
      index: {
        root: 'layout/welcome.hbs',
      },
      entry: {
        // Playground: fill this in to enable the custom layout for that one entry.
        'playground/custom-layout-for-an-entry': '',
      },
    },
  },

  plugins: ['_plugins/toc/toc.js'],
  pluginConfig: {
    toc: {
      forAllEntries: false,
      minLevel: 2,
      maxLevel: 4,
    },
  },

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
    format: 'webp',
    quality: 80,
    fit: 'cover',
    outputDir: 'assets/images',
    reencodeDefault: false,
    defaultVariant: 'medium',
  },

  audio: {
    // Currently copy-only; set outputDir to control public path under the build dir.
    outputDir: 'assets/audio',
  },

  video: {
    // Copy-only by default; set outputDir to control public path under the build dir.
    outputDir: 'assets/video',
  },
}
