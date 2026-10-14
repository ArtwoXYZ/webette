import { describe, expect, test } from "bun:test";
import { extractReleaseNotes, parseVersion, tagForVersion } from "./release";

describe("version format", () => {
  test("reads year, month and increment", () => {
    expect(parseVersion("2026.10.0")).toEqual({
      year: 2026,
      month: 10,
      increment: 0,
    });
    expect(parseVersion("2027.1.14")).toEqual({
      year: 2027,
      month: 1,
      increment: 14,
    });
  });

  test("builds the tag from the version", () => {
    expect(tagForVersion("2026.10.0")).toBe("v2026.10.0");
  });

  test("rejects versions outside the scheme", () => {
    expect(() => parseVersion("0.1.0")).toThrow();
    expect(() => parseVersion("2026.13.0")).toThrow();
    expect(() => parseVersion("2026.01.0")).toThrow();
    expect(() => parseVersion("2026.10")).toThrow();
  });
});

describe("release notes", () => {
  const released = [
    "# Changelog",
    "",
    "## Unreleased",
    "",
    "## v2026.10.1",
    "",
    "### Added",
    "",
    "- **Desktop app**: Build and preview a site without a terminal.",
    "",
    "## v2026.10.0",
    "",
    "### Added",
    "",
    "- **First version**: Folders become a website.",
  ].join("\n");

  test("returns the newest section only", () => {
    const notes = extractReleaseNotes(released, "2026.10.1");
    expect(notes).toContain("**Desktop app**");
    expect(notes).not.toContain("**First version**");
  });

  test("refuses pending entries left under Unreleased", () => {
    const pending = released.replace(
      "## Unreleased\n",
      "## Unreleased\n\n- **Forgotten**: Not moved.\n"
    );
    expect(() => extractReleaseNotes(pending, "2026.10.1")).toThrow(
      /Unreleased/
    );
  });

  test("refuses a version that is not the newest section", () => {
    expect(() => extractReleaseNotes(released, "2026.10.2")).toThrow(/newest/);
  });

  test("refuses an empty section", () => {
    const empty = "# Changelog\n\n## v2026.10.0\n\nNothing yet.\n";
    expect(() => extractReleaseNotes(empty, "2026.10.0")).toThrow(
      /no entries/
    );
  });
});
