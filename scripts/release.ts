/**
 * Release helpers: version formats and changelog extraction.
 *
 * webette shows versions as `v<generation> <YYYY>.<MM>.<increment>`
 * (see docs/versioning.md). package.json and Git tags cannot hold that
 * form, so they carry the same three numbers as
 * `<generation>.<YYYY>.<MM><increment>`: `v0 2025.12.0` is `0.2025.120`.
 */

export interface WebetteVersion {
  generation: number;
  year: number;
  month: number;
  increment: number;
}

const PACKAGE_VERSION = /^(0|[1-9]\d*)\.(\d{4})\.([1-9]\d{1,2})$/;

export function parsePackageVersion(version: string): WebetteVersion {
  const match = PACKAGE_VERSION.exec(version);
  if (!match) {
    throw new Error(
      `"${version}" is not a webette package version (<generation>.<YYYY>.<MM><increment>).`
    );
  }
  const packed = Number(match[3]);
  const month = Math.floor(packed / 10);
  if (month < 1 || month > 12) {
    throw new Error(`"${version}" has no valid month (got ${month}).`);
  }
  return {
    generation: Number(match[1]),
    year: Number(match[2]),
    month,
    increment: packed % 10,
  };
}

/** `0.2025.120` → `v0 2025.12.0`, the form people read. */
export function displayVersion(version: string): string {
  const { generation, year, month, increment } = parsePackageVersion(version);
  return `v${generation} ${year}.${String(month).padStart(2, "0")}.${increment}`;
}

/** `0.2025.120` → `v0.2025.120`, the Git tag. */
export function tagForVersion(version: string): string {
  parsePackageVersion(version);
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
  const expected = displayVersion(version);
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
