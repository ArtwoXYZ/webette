export default {
  site: {
    title: "Webette Documentation",
    lang: "en",
  },

  collections: {
    pages: {
      path: "01 pages",
      name: "Pages",
      slug: "pages",
    },
    learn: {
      path: "02 learn",
      name: "Learn",
      slug: "learn",
    },
    reference: {
      path: "03 reference",
      name: "Reference",
      slug: "reference",
    },
    cookbook: {
      path: "04 cookbook",
      name: "Cookbook",
      slug: "cookbook",
    },
    internals: {
      path: "05 internals",
      name: "Internals",
      slug: "internals",
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
        "pages/home": "layout/welcome.hbs",
      },
    },
  },

  index: {
    root: { collection: "pages", entry: "home" },
  },

  markdown: {
    headingShift: 0,
  },
};
