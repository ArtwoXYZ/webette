/**
 * Immutable builder for Site model updates. Deep-clones the base site so callers never mutate shared state.
 */

import type { Site, Collection, Entry, Block } from "./model";

export class SiteModelTransformer {
  private site: Site;

  constructor(baseSite: Site) {
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
      plugins: baseSite.plugins ? [...baseSite.plugins] : undefined,
    };
  }

  withRootEntries(entries: Entry[]): this {
    this.site.rootEntries = [...entries];
    return this;
  }

  withCollections(collections: Collection[]): this {
    this.site.collections = [...collections];
    return this;
  }

  withIndexes(indexes: Site["indexes"]): this {
    this.site.indexes = indexes ? { ...indexes } : undefined;
    return this;
  }

  withStructure(structure: Site["structure"]): this {
    this.site.structure = structure ? { ...structure } : undefined;
    return this;
  }

  build(): Site {
    return this.site;
  }

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