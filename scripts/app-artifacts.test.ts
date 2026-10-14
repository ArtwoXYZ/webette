import { describe, expect, test } from "bun:test";
import { distributableFor } from "./app-artifacts";

describe("distributableFor", () => {
  test("names one file per system after webette and its version", () => {
    expect(distributableFor("2026.10.0", "linux", "x64")).toEqual({
      built: "stable-linux-x64-Webette-Setup.tar.gz",
      published: "webette-v2026.10.0-linux-x64.tar.gz",
    });
    expect(distributableFor("2026.10.0", "win32", "x64")).toEqual({
      built: "stable-win-x64-Webette-Setup.zip",
      published: "webette-v2026.10.0-windows-x64.zip",
    });
    expect(distributableFor("2026.10.0", "darwin", "arm64")).toEqual({
      built: "stable-macos-arm64-Webette.dmg",
      published: "webette-v2026.10.0-macos-arm64.dmg",
    });
  });

  test("refuses a system without a desktop build", () => {
    expect(() => distributableFor("2026.10.0", "freebsd", "x64")).toThrow(/no desktop build/);
  });

  test("refuses a version that is not a webette version", () => {
    expect(() => distributableFor("0.1.0", "linux", "x64")).toThrow(/not a webette version/);
  });
});
