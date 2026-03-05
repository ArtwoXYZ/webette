/**
 * Webette TOC Plugin - Table of Contents generator
 * 
 * This plugin generates a table of contents from markdown headings and provides
 * a simple {{toc}} helper for template integration.
 */

/**
 * Load plugin configuration from webette.config.ts
 * @param {string} rootDir - Site root directory
 * @returns {object} - Plugin configuration
 */
async function loadConfig(rootDir) {
  try {
    // Try to load config from webette.config.ts
    const configPath = path.join(rootDir, "webette.config.ts");
    const configContent = await readFile(configPath, "utf8");
    
    // Simple regex to extract toc configuration
    const tocConfigMatch = configContent.match(/pluginConfig:\s*\{[^}]*toc:\s*\{[^}]*\}/s);
    
    if (tocConfigMatch) {
      const tocConfigStr = tocConfigMatch[0].replace("pluginConfig:", "");
      
      // Simple parsing of the config object
      const forAllEntriesMatch = tocConfigStr.match(/forAllEntries:\s*(true|false)/);
      const minLevelMatch = tocConfigStr.match(/minLevel:\s*(\d+)/);
      const maxLevelMatch = tocConfigStr.match(/maxLevel:\s*(\d+)/);
      
      return {
        forAllEntries: forAllEntriesMatch ? forAllEntriesMatch[1] === "true" : false,
        minLevel: minLevelMatch ? parseInt(minLevelMatch[1], 10) : 1,
        maxLevel: maxLevelMatch ? parseInt(maxLevelMatch[1], 10) : 6
      };
    }
  } catch (error) {
    console.warn("⚠️  Could not load TOC config:", error.message);
  }
  
  // Return defaults if config not found
  return {
    forAllEntries: false,
    minLevel: 1,
    maxLevel: 6
  };
}

import * as path from "node:path";
import { readFile, stat } from "node:fs/promises";
import { pathToFileURL } from "node:url";

/**
 * Extract headings from markdown content
 * @param {import("../../src/core/model").Entry} entry - Entry to process
 * @param {import("../../src/plugins/types").PluginContext} ctx - Plugin context
 * @returns {Array<{level: number, text: string, slug: string}>} - Extracted headings
 */
async function extractHeadings(entry, ctx) {
  const headings = [];
  let foundHtmlContent = "";
  

  
  // Find markdown blocks in the entry
  for (const block of entry.blocks) {
    if (block.type === "markdown") {
      // Store HTML content for slug extraction
      const htmlContent = block.content?.html || "";
      
      // Try different possible content locations
      const contentText = block.content?.text || block.content?.raw || block.raw;
      
      if (contentText) {
        // Parse markdown to extract headings
        const lines = contentText.split('\n');
        
        for (const line of lines) {
          const h1Match = line.match(/^#\s+(.+)/);
          const h2Match = line.match(/^##\s+(.+)/);
          const h3Match = line.match(/^###\s+(.+)/);
          const h4Match = line.match(/^####\s+(.+)/);
          const h5Match = line.match(/^#####\s+(.+)/);
          const h6Match = line.match(/^######\s+(.+)/);
          
          if (h1Match) {
            headings.push({ level: 1, text: h1Match[1] });
          } else if (h2Match) {
            headings.push({ level: 2, text: h2Match[1] });
          } else if (h3Match) {
            headings.push({ level: 3, text: h3Match[1] });
          } else if (h4Match) {
            headings.push({ level: 4, text: h4Match[1] });
          } else if (h5Match) {
            headings.push({ level: 5, text: h5Match[1] });
          } else if (h6Match) {
            headings.push({ level: 6, text: h6Match[1] });
          }
        }
      }
      
      // Accumulate HTML content from all blocks
      if (htmlContent) {
        foundHtmlContent += htmlContent;
      }
    }
  }
  
  return { headings, htmlContent: foundHtmlContent };
}

/**
 * Extract slugs from HTML heading elements to use Webette's proper slug generation
 * @param {string} html - HTML content
 * @param {Array<{level: number, text: string}>} headings - Headings without slugs
 * @returns {Object} - Map of heading text to slug
 */
function extractSlugsFromHtml(html, headings) {
  const slugMap = {};
  
  // Create a regex pattern to match heading elements with their text and id
  // Match h1, h2, h3, h4, h5, h6 elements with id attributes and capture content until closing tag
  const headingRegex = /<h([1-6]) id="([^"]+)"[^>]*>([^<]*)<\/h\1>/g;
  
  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1], 10);
    const slug = match[2];
    const text = match[3].trim();
    
    // Find the corresponding heading and map the slug
    const heading = headings.find(h => h.level === level && h.text === text);
    if (heading) {
      slugMap[text] = slug;
    }
  }
  
  return slugMap;
}

/**
 * Generate hierarchical TOC structure
 * @param {Array<{level: number, text: string, slug: string}>} headings - Flat headings list
 * @param {object} config - Plugin configuration
 * @returns {object} - Hierarchical TOC structure
 */
function generateToc(headings, config) {
  const { minLevel = 1, maxLevel = 6 } = config || {};
  
  // Filter headings by level
  const filtered = headings.filter(h => h.level >= minLevel && h.level <= maxLevel);
  
  // Build hierarchical structure
  const root = { items: [], level: 0 };
  const stack = [root];
  
  for (const heading of filtered) {
    // Find the correct parent level
    while (stack.length > 1 && stack[stack.length - 1].level >= heading.level) {
      stack.pop();
    }
    
    const item = {
      level: heading.level,
      text: heading.text,
      slug: heading.slug, // Use the pre-extracted slug
      items: []
    };
    
    // Always push to the last element in stack (should be the parent)
    const parent = stack[stack.length - 1];
    if (parent && parent.items) {
      parent.items.push(item);
    }
    
    // Push to stack if this heading can have children
    if (heading.level < maxLevel) {
      stack.push(item);
    }
  }
  
  return {
    items: root.items
  };
}



/**
 * TOC Plugin
 */
export default {
  pluginId: "toc",
  
  onInit(ctx) {
    ctx.logger.info("toc.pluginInitialized", { 
      pluginId: "toc",
      rootDir: ctx.rootDir
    });
  },
  
  /**
   * Add TOC data to entries
   */
  async transformEntry(entry, ctx) {
    // Load configuration manually since Webette doesn't pass it automatically
    const config = await loadConfig(ctx.rootDir);
    const forAllEntries = config.forAllEntries === true;
    
    // Check for toc.webt marker file (similar to draft.webt, unlisted.webt)
    let hasTocMarker = false;
    try {
      const tocWebtPath = path.join(ctx.rootDir, entry.path, "toc.webt");
      const fileStat = await stat(tocWebtPath);
      hasTocMarker = fileStat.isFile();
    } catch {
      // No TOC marker file - this is normal
    }
    
    if (!forAllEntries && !hasTocMarker) {
      return entry;
    }
    
    // Extract headings from markdown
    const { headings, htmlContent } = await extractHeadings(entry, ctx);
    
    try {
      const slugMap = extractSlugsFromHtml(htmlContent, headings);
      
      // Add slugs to headings
      const headingsWithSlugs = headings.map(heading => ({
        ...heading,
        slug: slugMap[heading.text] // Use extracted slugs from HTML
      }));
      
      const toc = generateToc(headingsWithSlugs, config);
      
      // Add TOC to entry model
      const result = {
        ...entry,
        toc: toc
      };
      return result;
    } catch (error) {
      ctx.logger.error("toc.generationFailed", {
        entry: entry.name,
        error: error.message
      });
      console.log("❌ Error:", error.message);
      return entry; // Return original entry if TOC generation fails
    }
  },
  
  /**
   * Register TOC helper and partials
   */
  async extendTemplates(handlebars, ctx) {
    // Register the complete partial with HTML structure
    let tocPartial = "";
    let cssContent = "";
    let config = ctx.env.pluginConfig?.toc || {};
    
    try {
      // Use import.meta.url to get the current module's URL
      const currentModuleUrl = new URL(import.meta.url);
      const tocPartialPath = new URL("partials/toc.hbs", currentModuleUrl);
      tocPartial = await readFile(tocPartialPath, "utf8");
      
      // Load CSS content for inline styling (controlled by config)
      if (config.loadStyle !== false) { // Default to true
        try {
          const cssPath = new URL("css/toc.css", currentModuleUrl);
          cssContent = await readFile(cssPath, "utf8");
        } catch (error) {
          ctx.logger.warn("toc.cssLoadFailed", {
            path: "css/toc.css",
            error: error.message
          });
        }
      }
    } catch (error) {
      ctx.logger.error("toc.partialLoadFailed", {
        path: "partials/toc.hbs",
        error: error.message
      });
      return;
    }
    
    // Register partial
    handlebars.registerPartial("toc-partial", tocPartial);
    
    // Handle custom partial if configured
    if (config.partialPath) {
      try {
        const customPartial = await readFile(config.partialPath, "utf8");
        handlebars.registerPartial("custom-toc", customPartial);
        
        handlebars.registerHelper("customToc", function() {
          const entry = this;
          if (!entry?.toc) return "";
          const template = handlebars.compile(customPartial);
          return new handlebars.SafeString(template({ toc: entry.toc }));
        });
      } catch (error) {
        ctx.logger.warn("toc.customPartialNotFound", {
          path: config.partialPath,
          error: error.message
        });
      }
    }
    
    // Update the main TOC helper to include CSS when available
    handlebars.registerHelper("toc", function() {
      // Get the entry from the template context
      const entry = this.entry || this;
      if (!entry?.toc) {
        return ""; // Silently return empty string if no TOC data
      }
      
      const template = handlebars.compile(tocPartial);
      const tocHtml = template({ toc: entry.toc });
      
      // Include CSS if available and enabled
      if (cssContent) {
        return new handlebars.SafeString(`<style>${cssContent}</style>${tocHtml}`);
      }
      
      return new handlebars.SafeString(tocHtml);
    });
    if (config.partialPath) {
      try {
        const customPartial = await readFile(config.partialPath, "utf8");
        handlebars.registerPartial("custom-toc", customPartial);
        
        handlebars.registerHelper("customToc", function() {
          const entry = this;
          if (!entry?.toc) return "";
          const template = handlebars.compile(customPartial);
          return new handlebars.SafeString(template({ toc: entry.toc }));
        });
      } catch (error) {
        ctx.logger.warn("toc.customPartialNotFound", {
          path: config.partialPath,
          error: error.message
        });
      }
    }
    
    // Update the main TOC helper to include CSS when available
    handlebars.registerHelper("toc", function() {
      // Get the entry from the template context
      const entry = this.entry || this;
      if (!entry?.toc) {
        return ""; // Silently return empty string if no TOC data
      }
      
      const template = handlebars.compile(tocPartial);
      const tocHtml = template({ toc: entry.toc });
      
      // Include CSS if available and enabled
      if (cssContent) {
        return new handlebars.SafeString(`<style>${cssContent}</style>${tocHtml}`);
      }
      
      return new handlebars.SafeString(tocHtml);
    });
  }
};
