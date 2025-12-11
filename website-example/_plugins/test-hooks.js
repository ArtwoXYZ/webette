export default {
  // Log when the site is resolved
  onResolved(site, ctx) {
    ctx.logger.info("plugin.testHooks.onResolved", { pluginId: ctx.pluginId });
  },

  // Tag markdown blocks in the plugins-tests collection
  transformBlock(block, ctx) {
    if ((ctx.collection.slug || ctx.collection.id) !== "plugins-tests") return;
    if (block.type !== "markdown") return;
    const meta = {
      ...(block.content?.meta || {}),
      pluginTag: "test-hooks",
    };
    return {
      ...block,
      content: {
        ...block.content,
        meta,
      },
    };
  },

  // Add a note to entries in the plugins-tests collection
  transformEntry(entry, ctx) {
    if ((ctx.collection.slug || ctx.collection.id) !== "plugins-tests") return;
    return {
      ...entry,
      pluginNote: "Processed by test-hooks",
    };
  },

  // Helper for templates
  extendTemplates(hb) {
    hb.registerHelper("pluginNote", (entry) => entry?.pluginNote || "");
  },
};
