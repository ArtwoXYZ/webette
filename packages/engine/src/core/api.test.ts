/**
 * Local API logs: the polling endpoint and the live stream must tell the
 * same story, with the same cursors.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { appendFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";

import { getEnv } from "../config/env";
import { Logger } from "../logging/logger";
import { startApiServer, type ApiHandle } from "./api";

interface StreamEvent {
  event: string;
  id?: number;
  data: unknown;
}

let api: ApiHandle;
let site: string;
let logPath: string;
let base: string;
const opened: AbortController[] = [];

beforeEach(async () => {
  const { env } = await getEnv();
  site = mkdtempSync(path.join(tmpdir(), "webette-api-"));
  logPath = path.join(site, env.logging.dirName, "logs.jsonl");
  api = await startApiServer(
    { port: 0 },
    new Logger({ scope: "test", locale: "en", minLevel: "error" })
  );
  base = `http://127.0.0.1:${api.port}`;
});

afterEach(async () => {
  for (const controller of opened.splice(0)) controller.abort();
  await api.stop();
  rmSync(site, { recursive: true, force: true });
});

async function buildSite(): Promise<void> {
  const res = await fetch(`${base}/build`, {
    method: "POST",
    body: JSON.stringify({ rootDir: site }),
  });
  expect(res.status).toBe(200);
}

async function pollLogs(since = 0) {
  const res = await fetch(`${base}/logs?since=${since}`);
  const json = (await res.json()) as {
    data: { entries: unknown[]; cursor: number; reset: boolean };
  };
  return json.data;
}

function writeEntry(message: string, complete = true): void {
  appendFileSync(logPath, JSON.stringify({ message }) + (complete ? "\n" : ""));
}

/** Opens the stream and returns a reader that waits for the next events. */
async function openStream(query = "", headers: Record<string, string> = {}) {
  const controller = new AbortController();
  opened.push(controller);
  const res = await fetch(`${base}/logs/stream${query}`, {
    headers,
    signal: controller.signal,
  });
  expect(res.status).toBe(200);
  expect(res.headers.get("content-type")).toBe("text/event-stream");

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const pending: StreamEvent[] = [];

  async function next(count: number): Promise<StreamEvent[]> {
    while (pending.length < count) {
      const { value, done } = await reader.read();
      if (done) throw new Error("stream closed");
      buffer += decoder.decode(value, { stream: true });
      let end: number;
      while ((end = buffer.indexOf("\n\n")) !== -1) {
        const block = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        const field = (name: string) =>
          block.split("\n").find((line) => line.startsWith(`${name}: `))?.slice(name.length + 2);
        const data = field("data");
        if (data === undefined) continue; // comment line
        const id = field("id");
        pending.push({
          event: field("event") ?? "message",
          id: id === undefined ? undefined : Number(id),
          data: JSON.parse(data),
        });
      }
    }
    return pending.splice(0, count);
  }

  return { next };
}

describe("GET /logs", () => {
  test("needs an active site", async () => {
    const res = await fetch(`${base}/logs`);
    expect(res.status).toBe(409);
    expect(((await res.json()) as { code: string }).code).toBe("no_active_site");
  });

  test("returns the entries written since the cursor", async () => {
    await buildSite();
    const first = await pollLogs();
    expect(first.entries.length).toBeGreaterThan(0);

    writeEntry("one");
    writeEntry("half", false);
    const second = await pollLogs(first.cursor);
    expect(second.entries).toEqual([{ message: "one" }]);

    appendFileSync(logPath, "\n");
    const third = await pollLogs(second.cursor);
    expect(third.entries).toEqual([{ message: "half" }]);
  });
});

describe("GET /logs/stream", () => {
  test("rejects a cursor that is not a byte offset", async () => {
    const res = await fetch(`${base}/logs/stream?since=abc`);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe("invalid_cursor");
  });

  test("sends only what is written after the connection", async () => {
    await buildSite();
    const { cursor } = await pollLogs();
    const stream = await openStream();

    writeEntry("one");
    writeEntry("two");
    const events = await stream.next(2);
    expect(events.map((e) => e.event)).toEqual(["log", "log"]);
    expect(events.map((e) => e.data)).toEqual([{ message: "one" }, { message: "two" }]);

    // Ids are polling cursors: resuming from the first one gives the second entry.
    expect(events[0]!.id).toBeGreaterThan(cursor);
    expect((await pollLogs(events[0]!.id)).entries).toEqual([{ message: "two" }]);
    expect(events[1]!.id).toBe((await pollLogs()).cursor);
  });

  test("waits for the end of a line before sending it", async () => {
    await buildSite();
    const stream = await openStream();

    writeEntry("half", false);
    writeEntry("whole");
    const [event] = await stream.next(1);
    expect(event!.data).toEqual({ raw: '{"message":"half"}{"message":"whole"}' });
  });

  test("replays from a cursor, given as a query or by EventSource", async () => {
    await buildSite();
    const all = await pollLogs();
    writeEntry("late");

    const fromStart = await openStream("?since=0");
    const replay = await fromStart.next(all.entries.length + 1);
    expect(replay.map((e) => e.data)).toEqual([...all.entries, { message: "late" }]);

    const resumed = await openStream("", { "Last-Event-ID": String(all.cursor) });
    expect((await resumed.next(1)).map((e) => e.data)).toEqual([{ message: "late" }]);
  });

  test("opened before any site is active, follows the first build", async () => {
    const stream = await openStream();
    await buildSite();

    const { entries } = await pollLogs();
    const events = await stream.next(entries.length);
    expect(events.map((e) => e.data)).toEqual(entries);
  });

  test("tells when another site becomes active", async () => {
    await buildSite();
    const stream = await openStream();

    const other = mkdtempSync(path.join(tmpdir(), "webette-api-"));
    try {
      await fetch(`${base}/build`, { method: "POST", body: JSON.stringify({ rootDir: other }) });
      const [event] = await stream.next(1);
      expect(event).toEqual({ event: "reset", id: undefined, data: { site: other } });
    } finally {
      rmSync(other, { recursive: true, force: true });
    }
  });

  test("ends when the API stops", async () => {
    const stream = await openStream();
    await api.stop();
    expect(stream.next(1)).rejects.toThrow();
  });
});
