import { describe, expect, test } from "bun:test";
import {
  displayVersion,
  extractReleaseNotes,
  parsePackageVersion,
  tagForVersion,
} from "./release";

describe("version formats", () => {
  test("reads the packed month and increment", () => {
    expect(parsePackageVersion("0.2025.120")).toEqual({
      generation: 0,
      year: 2025,
      month: 12,
      increment: 0,
    });
    expect(parsePackageVersion("1.2026.13")).toEqual({
      generation: 1,
      year: 2026,
      month: 1,
      increment: 3,
    });
  });

  test("shows the version the way people read it", () => {
    expect(displayVersion("0.2025.120")).toBe("v0 2025.12.0");
    expect(displayVersion("1.2026.13")).toBe("v1 2026.01.3");
  });

  test("builds the tag from the package version", () => {
    expect(tagForVersion("0.2026.100")).toBe("v0.2026.100");
  });

  test("rejects versions outside the scheme", () => {
    expect(() => parsePackageVersion("0.1.0")).toThrow();
    expect(() => parsePackageVersion("0.2026.130")).toThrow();
    expect(() => parsePackageVersion("0.2026.5")).toThrow();
  });
});

describe("release notes", () => {
  const released = [
    "# Changelog",
    "",
    "## Unreleased",
    "",
    "## v0 2026.10.0",
    "",
    "### Added",
    "",
    "- **Desktop app**: Build and preview a site without a terminal.",
    "",
    "## v0 2025.12.0",
    "",
    "### Added",
    "",
    "- **First version**: Folders become a website.",
  ].join("\n");

  test("returns the newest section only", () => {
    const notes = extractReleaseNotes(released, "0.2026.100");
    expect(notes).toContain("**Desktop app**");
    expect(notes).not.toContain("**First version**");
  });

  test("refuses pending entries left under Unreleased", () => {
    const pending = released.replace(
      "## Unreleased\n",
      "## Unreleased\n\n- **Forgotten**: Not moved.\n"
    );
    expect(() => extractReleaseNotes(pending, "0.2026.100")).toThrow(
      /Unreleased/
    );
  });

  test("refuses a version that is not the newest section", () => {
    expect(() => extractReleaseNotes(released, "0.2026.101")).toThrow(
      /newest/
    );
  });

  test("refuses an empty section", () => {
    const empty = "# Changelog\n\n## v0 2026.10.0\n\nNothing yet.\n";
    expect(() => extractReleaseNotes(empty, "0.2026.100")).toThrow(
      /no entries/
    );
  });
});
