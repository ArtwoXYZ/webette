import { afterAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { Logger } from "../../logging/logger";
import type { Entry, Site } from "../model";
import { applyHistory, loadPreviousState } from "./history";
import { writeModelExport } from "./write-model";

const exportDir = await mkdtemp(path.join(tmpdir(), "webette-history-"));
afterAll(() => rm(exportDir, { recursive: true, force: true }));

const logger = new Logger({ scope: "test", locale: "en", minLevel: "error" });

function entry(slug: string, text: string): Entry {
  return {
    id: slug,
    rawName: slug,
    path: slug,
    name: slug,
    slug,
    route: `/${slug}/`,
    blocks: [
      {
        id: "text",
        rawName: "text.md",
        path: `${slug}/text.md`,
        name: "text",
        type: "text",
        ext: ".md",
        content: { raw: text },
      },
    ],
  } as unknown as Entry;
}

function site(texts: { page: string; rootIndex: string; collectionIndex: string; post: string }): Site {
  return {
    rootDir: "site",
    site: { title: "Test" },
    rootEntries: [entry("page", texts.page)],
    collections: [
      {
        id: "blog",
        rawName: "blog",
        path: "blog",
        name: "blog",
        slug: "blog",
        route: "/blog/",
        entries: [entry("post", texts.post)],
      },
    ],
    indexes: {
      root: entry("index", texts.rootIndex),
      collections: { blog: entry("index", texts.collectionIndex) },
    },
  } as unknown as Site;
}

// One build: read the previous export, date the model, write the export back.
async function buildAt(model: Site, now: string): Promise<Site> {
  const previous = await loadPreviousState(exportDir);
  const dated = await applyHistory(model, {
    previous,
    rootDir: "site",
    readContent: true,
    now: new Date(now),
  });
  await writeModelExport({ exportDir, site: dated, logger });
  return dated;
}

const first = "2026-01-01T00:00:00.000Z";
const second = "2026-02-01T00:00:00.000Z";
const third = "2026-03-01T00:00:00.000Z";
const texts = { page: "page", rootIndex: "welcome", collectionIndex: "posts", post: "post" };

describe("timestamps between builds", () => {
  test("nothing moves when the content has not changed", async () => {
    await buildAt(site(texts), first);
    const rebuilt = await buildAt(site(texts), second);

    expect(rebuilt.updatedAt).toBe(first);
    expect(rebuilt.rootEntries?.[0]?.updatedAt).toBe(first);
    expect(rebuilt.rootEntries?.[0]?.blocks[0]?.updatedAt).toBe(first);
    expect(rebuilt.indexes?.root?.updatedAt).toBe(first);
    expect(rebuilt.indexes?.collections?.blog?.updatedAt).toBe(first);
    expect(rebuilt.collections?.[0]?.entries[0]?.updatedAt).toBe(first);
  });

  test("a content change updates the pages it affects, and only those", async () => {
    const changed = await buildAt(site({ ...texts, page: "page, edited", rootIndex: "hello" }), third);

    expect(changed.rootEntries?.[0]?.createdAt).toBe(first);
    expect(changed.rootEntries?.[0]?.updatedAt).toBe(third);
    expect(changed.indexes?.root?.updatedAt).toBe(third);
    expect(changed.updatedAt).toBe(third);
    expect(changed.indexes?.collections?.blog?.updatedAt).toBe(first);
    expect(changed.collections?.[0]?.updatedAt).toBe(first);
    expect(changed.collections?.[0]?.entries[0]?.updatedAt).toBe(first);
  });
});
