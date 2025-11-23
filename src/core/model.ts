export interface Site {
  rootDir: string;           // path to the site's root folder (portfolio, blog, etc.)
  site: Record<string, unknown>; // full "site" section from webette.config.ts
}
