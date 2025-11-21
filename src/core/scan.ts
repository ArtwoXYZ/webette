import type { Site } from "./model";

// This is the right place to:
// - scan /posts, /pages, etc.
// - build navigation, sections, and entries metadata

// later, we will populate Site.sections, entries, etc.
// for now, we do nothing and simply return the site as-is.
export async function scanSite(site: Site): Promise<Site> {
  return site;
}
