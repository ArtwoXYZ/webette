/**
 * Release helpers: version format and changelog extraction.
 *
 * A webette version is `<YYYY>.<M>.<increment>` (see docs/versioning.md):
 * the same three numbers in package.json, in the Git tag (`v2026.10.0`)
 * and in front of people.
 */

export interface WebetteVersion {
  year: number;
  month: number;
  increment: number;
}

const VERSION = /^(\d{4})\.([1-9]\d?)\.(0|[1-9]\d*)$/;

export function parseVersion(version: string): WebetteVersion {
  const match = VERSION.exec(version);
  const month = Number(match?.[2]);
  if (!match || month > 12) {
    throw new Error(
      `"${version}" is not a webette version (<YYYY>.<M>.<increment>, like 2026.10.0).`
    );
  }
  return { year: Number(match[1]), month, increment: Number(match[3]) };
}

/** `2026.10.0` → `v2026.10.0`: the Git tag, and the form people read. */
export function tagForVersion(version: string): string {
  parseVersion(version);
  return `v${version}`;
}

interface ChangelogSection {
  title: string;
  body: string;
}

function splitSections(changelog: string): ChangelogSection[] {
  const sections: ChangelogSection[] = [];
  let current: ChangelogSection | null = null;
  for (const line of changelog.split(/\r?\n/)) {
    const heading = /^## (.+?)\s*$/.exec(line);
    if (heading) {
      current = { title: heading[1] ?? "", body: "" };
      sections.push(current);
    } else if (current) {
      current.body += `${line}\n`;
    }
  }
  return sections.map((section) => ({
    title: section.title,
    body: section.body.trim(),
  }));
}

function hasEntries(body: string): boolean {
  return body.split("\n").some((line) => line.startsWith("- "));
}

/**
 * Returns the notes of `version` from the changelog text.
 *
 * Refuses anything that would publish the wrong notes: pending entries
 * left under "Unreleased", a newest section that is not this version,
 * or a section without entries.
 */
export function extractReleaseNotes(changelog: string, version: string): string {
  const expected = tagForVersion(version);
  const sections = splitSections(changelog);

  const unreleased = sections.find((section) => section.title === "Unreleased");
  if (unreleased && hasEntries(unreleased.body)) {
    throw new Error(
      `CHANGELOG.md still has entries under "Unreleased": move them under "## ${expected}".`
    );
  }

  const newest = sections.find((section) => section.title !== "Unreleased");
  if (!newest || newest.title !== expected) {
    throw new Error(
      `The newest CHANGELOG.md section must be "## ${expected}" (found "${newest?.title ?? "none"}").`
    );
  }
  if (!hasEntries(newest.body)) {
    throw new Error(`"## ${expected}" has no entries in CHANGELOG.md.`);
  }
  return newest.body;
}
