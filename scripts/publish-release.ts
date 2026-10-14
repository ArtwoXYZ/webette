/**
 * Attaches the desktop app builds to a version tag on Tangled.
 *
 *   bun run package:app
 *   bun run release:publish v2026.10.0
 *
 * A Tangled release artifact is a record (`sh.tangled.repo.artifact`) in
 * the account that owns the repository: the file is uploaded as a blob,
 * and the record ties it to the tag. Writing it needs that account:
 *
 *   ATP_IDENTIFIER    the handle (artwo.xyz)
 *   ATP_APP_PASSWORD  an app password of that account
 *
 * The release pipeline runs this for the Linux build; the macOS and
 * Windows builds are published the same way from their own machines.
 * Builds already attached to the tag are left alone, so it can be run
 * again safely.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { ARTIFACT_FOLDER, MAX_ARTIFACT_BYTES, artifactPrefix, tagHashBytes } from "./app-artifacts";
import { tagForVersion } from "./release";

const REPO_NAME = "webette";
// Where the account logs in. Bluesky-hosted accounts all enter here; the
// session then says which server actually holds the account's data.
const ENTRYWAY = process.env.ATP_PDS ?? "https://bsky.social";

const root = path.resolve(import.meta.dir, "..");
const artifactDir = path.join(root, ARTIFACT_FOLDER);

interface Session {
  accessJwt: string;
  did: string;
  didDoc?: { service?: { id: string; serviceEndpoint: string }[] };
}

interface ListedRecord {
  uri: string;
  value: Record<string, unknown>;
}

async function xrpc<T>(host: string, method: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${host}/xrpc/${method}`, init);
  if (!response.ok) {
    throw new Error(`${method} failed (${response.status}): ${await response.text()}`);
  }
  return (await response.json()) as T;
}

async function listRecords(host: string, did: string, collection: string): Promise<ListedRecord[]> {
  const records: ListedRecord[] = [];
  let cursor: string | undefined;
  do {
    const query = new URLSearchParams({ repo: did, collection, limit: "100" });
    if (cursor) query.set("cursor", cursor);
    const page = await xrpc<{ records: ListedRecord[]; cursor?: string }>(
      host,
      `com.atproto.repo.listRecords?${query}`,
      {}
    );
    records.push(...page.records);
    cursor = page.records.length > 0 ? page.cursor : undefined;
  } while (cursor);
  return records;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set: see the header of scripts/publish-release.ts.`);
  return value;
}

try {
  const { version } = (await Bun.file(
    path.join(root, "packages", "engine", "package.json")
  ).json()) as { version: string };
  const tag = process.argv[2];
  if (tag !== tagForVersion(version)) {
    throw new Error(
      `Give the tag to publish to: expected ${tagForVersion(version)} (from package.json), got ${tag ?? "nothing"}.`
    );
  }

  const prefix = artifactPrefix(version);
  const files = fs.existsSync(artifactDir)
    ? fs.readdirSync(artifactDir).filter((name) => name.startsWith(prefix))
    : [];
  if (files.length === 0) {
    throw new Error(`No ${prefix}* build in ${ARTIFACT_FOLDER}: run "bun run package:app" first.`);
  }
  for (const name of files) {
    if (fs.statSync(path.join(artifactDir, name)).size > MAX_ARTIFACT_BYTES) {
      throw new Error(`${name} is larger than what a Tangled release accepts.`);
    }
  }

  // Artifacts hang on the tag object itself, which only annotated tags have.
  const revParse = Bun.spawnSync(["git", "rev-parse", "--verify", "--quiet", `${tag}^{tag}`], {
    cwd: root,
  });
  if (revParse.exitCode !== 0) {
    throw new Error(
      `${tag} is not an annotated tag in this checkout (see "Preparing a Release" in docs/versioning.md).`
    );
  }
  const tagBytes = tagHashBytes(revParse.stdout.toString().trim());

  const session = await xrpc<Session>(ENTRYWAY, "com.atproto.server.createSession", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: requireEnv("ATP_IDENTIFIER"),
      password: requireEnv("ATP_APP_PASSWORD"),
    }),
  });
  const pds =
    session.didDoc?.service?.find((service) => service.id === "#atproto_pds")?.serviceEndpoint ??
    ENTRYWAY;
  const auth = { Authorization: `Bearer ${session.accessJwt}` };

  const repo = (await listRecords(pds, session.did, "sh.tangled.repo")).find(
    (record) => record.value.name === REPO_NAME
  );
  if (!repo) {
    throw new Error(`This account does not own a Tangled repository named "${REPO_NAME}".`);
  }

  const attached = new Set(
    (await listRecords(pds, session.did, "sh.tangled.repo.artifact"))
      .filter((record) => (record.value.tag as { $bytes?: string })?.$bytes === tagBytes)
      .map((record) => record.value.name)
  );

  for (const name of files) {
    if (attached.has(name)) {
      console.log(`${name} is already attached to ${tag}.`);
      continue;
    }
    const { blob } = await xrpc<{ blob: unknown }>(pds, "com.atproto.repo.uploadBlob", {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/octet-stream" },
      body: Bun.file(path.join(artifactDir, name)),
    });
    await xrpc(pds, "com.atproto.repo.createRecord", {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        repo: session.did,
        collection: "sh.tangled.repo.artifact",
        // The server does not know Tangled's record types.
        validate: false,
        record: {
          $type: "sh.tangled.repo.artifact",
          name,
          repo: repo.uri,
          ...(typeof repo.value.repoDid === "string" ? { repoDid: repo.value.repoDid } : {}),
          tag: { $bytes: tagBytes },
          artifact: blob,
          createdAt: new Date().toISOString(),
        },
      }),
    });
    console.log(`${name} attached to ${tag}.`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
