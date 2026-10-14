import { describe, expect, test } from "bun:test";
import { artifactPrefix, distributableFor, tagHashBytes } from "./app-artifacts";

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

  test("published names start with the version prefix", () => {
    const { published } = distributableFor("2027.1.3", "linux", "arm64");
    expect(published.startsWith(artifactPrefix("2027.1.3"))).toBe(true);
  });

  test("refuses a system without a desktop build", () => {
    expect(() => distributableFor("2026.10.0", "freebsd", "x64")).toThrow(/no desktop build/);
  });

  test("refuses a version that is not a webette version", () => {
    expect(() => distributableFor("0.1.0", "linux", "x64")).toThrow(/not a webette version/);
  });
});

describe("tagHashBytes", () => {
  test("encodes the 20 bytes of the hash as unpadded base64", () => {
    const encoded = tagHashBytes("0123456789abcdef0123456789abcdef01234567");
    expect(encoded).toBe("ASNFZ4mrze8BI0VniavN7wEjRWc");
    expect(Buffer.from(encoded, "base64")).toHaveLength(20);
  });

  test("refuses anything that is not a full hash", () => {
    expect(() => tagHashBytes("v2026.10.0")).toThrow(/not a Git object hash/);
  });
});
