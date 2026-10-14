import { describe, expect, test } from "bun:test";
import { diffReference, formatReference } from "./tutorial-reference";

const bytes = (text: string) => new TextEncoder().encode(text);

describe("tutorial reference", () => {
  test("lists files in a stable order, whatever the input order", () => {
    const a = formatReference([
      { path: "index.html", content: bytes("home") },
      { path: "404.html", content: bytes("lost") },
    ]);
    const b = formatReference([
      { path: "404.html", content: bytes("lost") },
      { path: "index.html", content: bytes("home") },
    ]);
    expect(a).toBe(b);
    expect(a.split("\n")[0]).toStartWith("404.html  ");
  });

  test("lists images without comparing their content", () => {
    const a = formatReference([{ path: "assets/a b.webp", content: bytes("one encoder") }]);
    const b = formatReference([{ path: "assets/a b.webp", content: bytes("another encoder") }]);
    expect(a).toBe(b);
  });

  test("reports added, removed and changed files", () => {
    const expected = formatReference([
      { path: "index.html", content: bytes("home") },
      { path: "old/index.html", content: bytes("old") },
      { path: "same.css", content: bytes("same") },
    ]);
    const actual = formatReference([
      { path: "index.html", content: bytes("new home") },
      { path: "new/index.html", content: bytes("new") },
      { path: "same.css", content: bytes("same") },
    ]);
    expect(diffReference(expected, actual)).toEqual({
      added: ["new/index.html"],
      removed: ["old/index.html"],
      changed: ["index.html"],
    });
  });
});
