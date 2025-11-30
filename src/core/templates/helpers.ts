import Handlebars from "handlebars";
import type { Collection, Entry } from "../model";

let helpersRegistered = false;

// Register a small set of reusable helpers for templates.
export function registerDefaultHelpers() {
  if (helpersRegistered) return;
  helpersRegistered = true;

  Handlebars.registerHelper("eq", (a: unknown, b: unknown) => a === b);
  Handlebars.registerHelper("neq", (a: unknown, b: unknown) => a !== b);
  Handlebars.registerHelper("in", (value: unknown, list: unknown) =>
    Array.isArray(list) ? list.includes(value as never) : false
  );
  Handlebars.registerHelper("safe", (html: unknown) =>
    new Handlebars.SafeString(html == null ? "" : String(html))
  );
  Handlebars.registerHelper("first", (arr: unknown) =>
    Array.isArray(arr) ? arr[0] : undefined
  );
  Handlebars.registerHelper("firstBlockOfType", (blocks: unknown, type: string) =>
    Array.isArray(blocks) ? blocks.find((b: any) => b?.type === type) : undefined
  );

  // Block helper: find a collection by slug or id and evaluate the block with it.
  Handlebars.registerHelper("withCollection", function (slug: string, options) {
    const root = options.data?.root ?? {};
    const model = (root as any).model ?? root;
    const collections: Collection[] = Array.isArray((model as any).collections)
      ? (model as any).collections
      : [];
    const match = collections.find(
      (col) => col.slug === slug || col.id === slug || col.route === slug
    );
    return match ? options.fn(match, { data: options.data }) : "";
  });

  // Block helper: find an entry by slug/id/route across collections.
  Handlebars.registerHelper("withEntry", function (identifier: string, options) {
    const root = options.data?.root ?? {};
    const model = (root as any).model ?? root;
    const collections: Collection[] = Array.isArray((model as any).collections)
      ? (model as any).collections
      : [];

    let foundEntry: Entry | undefined;
    let foundCollection: Collection | undefined;

    for (const col of collections) {
      const entry = col.entries.find(
        (ent) =>
          ent.slug === identifier ||
          ent.id === identifier ||
          (ent.route && ent.route.replace(/\/+$/, "") === identifier.replace(/\/+$/, ""))
      );
      if (entry) {
        foundEntry = entry;
        foundCollection = col;
        break;
      }
    }

    if (!foundEntry) return "";
    const data = { ...(options.data || {}), collection: foundCollection };
    return options.fn(foundEntry, { data });
  });
}
