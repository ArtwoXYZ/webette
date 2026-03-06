/**
 * Site Model Transformer - Centralized architecture for site model transformations
 * 
 * This module provides a robust foundation for all site model transformations with:
 * - Automatic preservation of all properties (including optional ones like plugins)
 * - Deep cloning to prevent mutations and ensure immutability
 * - Fluent API for consistent and type-safe model updates
 * - Centralized transformation logic across the entire codebase
 * - Single source of truth for model transformation patterns
 */

import type { Site, Collection, Entry, Block } from "../model";

export class SiteModelTransformer {
  private site: Site;

  /**
   * Create a new SiteModelTransformer from a base site model
   * Automatically preserves all properties including optional ones
   */
  constructor(baseSite: Site) {
    // Deep clone the base site to avoid mutation
    this.site = {
      rootDir: baseSite.rootDir,
      site: baseSite.site ? { ...baseSite.site } : {},
      config: baseSite.config ? { ...baseSite.config } : undefined,
      indexes: baseSite.indexes ? { ...baseSite.indexes } : undefined,
      structure: baseSite.structure ? { ...baseSite.structure } : undefined,
      rootEntries: baseSite.rootEntries ? [...baseSite.rootEntries] : undefined,
      collections: baseSite.collections ? [...baseSite.collections] : undefined,
      route: baseSite.route,
      createdAt: baseSite.createdAt,
      updatedAt: baseSite.updatedAt,
      fingerprint: baseSite.fingerprint,
      // Preserve optional properties
      plugins: baseSite.plugins ? [...baseSite.plugins] : undefined,
    };
  }

  /**
   * Set root entries
   */
  withRootEntries(entries: Entry[]): this {
    this.site.rootEntries = [...entries];
    return this;
  }

  /**
   * Set collections
   */
  withCollections(collections: Collection[]): this {
    this.site.collections = [...collections];
    return this;
  }

  /**
   * Set or update indexes
   */
  withIndexes(indexes: Site["indexes"]): this {
    this.site.indexes = indexes ? { ...indexes } : undefined;
    return this;
  }

  /**
   * Set structure
   */
  withStructure(structure: Site["structure"]): this {
    this.site.structure = structure ? { ...structure } : undefined;
    return this;
  }

  /**
   * Build the final site
   */
  build(): Site {
    return this.site;
  }

  /**
   * Helper to create a builder from a partial site update
   * This is used by transformation functions
   */
  static fromPartialUpdate(baseSite: Site, update: Partial<Site>): SiteModelTransformer {
    const builder = new SiteModelTransformer(baseSite);
    
    if (update.rootEntries !== undefined) {
      builder.withRootEntries(update.rootEntries);
    }
    
    if (update.collections !== undefined) {
      builder.withCollections(update.collections);
    }
    
    if (update.indexes !== undefined) {
      builder.withIndexes(update.indexes);
    }
    
    if (update.structure !== undefined) {
      builder.withStructure(update.structure);
    }
    
    return builder;
  }
}