import { describe, expect, test } from "bun:test";
import { getResizedFrame, type WindowFrame } from "./window-resize";

const frame = (width: number, height: number): WindowFrame => ({
  x: 100,
  y: 80,
  width,
  height,
});

describe("frameless window resize constraints", () => {
  test("keeps the maximum landscape frame", () => {
    expect(getResizedFrame(frame(900, 600), "se", 500, 500)).toEqual({
      x: 100,
      y: 80,
      width: 1100,
      height: 750,
    });
  });

  test("prevents a landscape frame from becoming flatter than 1100:470", () => {
    expect(getResizedFrame(frame(1100, 750), "n", 0, 500)).toEqual({
      x: 100,
      y: 360,
      width: 1100,
      height: 470,
    });
  });

  test("keeps the opposite edge anchored at minimum width", () => {
    expect(getResizedFrame(frame(500, 700), "w", 400, 0)).toEqual({
      x: 320,
      y: 80,
      width: 280,
      height: 700,
    });
  });

  test("accepts the minimum portrait ratio", () => {
    expect(getResizedFrame(frame(280, 500), "n", 0, 140)).toEqual({
      x: 100,
      y: 220,
      width: 280,
      height: 360,
    });
  });

  test("keeps the transition between portrait and landscape traversable", () => {
    expect(getResizedFrame(frame(280, 500), "n", 0, 141)).toEqual({
      x: 100,
      y: 221,
      width: 280,
      height: 359,
    });
  });

  test("allows the global minimum landscape frame", () => {
    expect(getResizedFrame(frame(500, 400), "nw", 500, 500)).toEqual({
      x: 320,
      y: 240,
      width: 280,
      height: 240,
    });
  });
});
