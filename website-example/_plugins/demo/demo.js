export default {
  pluginId: "demo",

  onResolved(site, ctx) {
    // Add a small callout block to the "enriched by a plugin" entry
    for (const collection of site.collections ?? []) {
      for (const entry of collection.entries) {
        if ((entry.slug || entry.id) === "enriched-by-a-plugin") {
          const noteBlock = {
            id: "plugin-note",
            rawName: "plugin-note.md",
            type: "markdown",
            name: "Plugin note",
            slug: "plugin-note",
            ext: ".md",
            path: `${entry.path}/plugin-note.md`,
            content: {
              raw: "> Added by demo plugin - showing transform hooks and prune whitelist.",
              html: "<blockquote>Added by demo plugin - showing transform hooks and prune whitelist.</blockquote>",
            },
          };
          entry.blocks = [...entry.blocks, noteBlock];
        }
      }
    }

    // Whitelist a plugin assets folder (even if empty) so prune keeps it
    ctx.addExpectedDir("assets/images/plugins/demo");

    ctx.logger.info("plugin.demo.enriched");
  },
};
