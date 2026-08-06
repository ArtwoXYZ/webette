export interface WindowFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ResizeEdge = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

const WINDOW_MIN_WIDTH = 280;
const WINDOW_MIN_HEIGHT = 240;
const WINDOW_MAX_WIDTH = 1100;
const WINDOW_MAX_HEIGHT = 750;
const LANDSCAPE_MAX_RATIO = 1100 / 470;
const PORTRAIT_LAYOUT_RATIO = 85 / 80;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

function frameWithSize(
  start: WindowFrame,
  edge: ResizeEdge,
  width: number,
  height: number
): WindowFrame {
  return {
    x: edge.includes("w") ? start.x + start.width - width : start.x,
    y: edge.includes("n") ? start.y + start.height - height : start.y,
    width,
    height,
  };
}

export function getResizedFrame(
  start: WindowFrame,
  edge: ResizeEdge,
  deltaX: number,
  deltaY: number
): WindowFrame {
  let { width, height } = start;

  if (edge.includes("e")) width += deltaX;
  if (edge.includes("s")) height += deltaY;
  if (edge.includes("w")) width = start.width - deltaX;
  if (edge.includes("n")) height = start.height - deltaY;

  width = clamp(width, WINDOW_MIN_WIDTH, WINDOW_MAX_WIDTH);
  height = clamp(height, WINDOW_MIN_HEIGHT, WINDOW_MAX_HEIGHT);

  const ratio = width / height;
  if (ratio > PORTRAIT_LAYOUT_RATIO) {
    if (ratio > LANDSCAPE_MAX_RATIO) {
      const horizontalOnly = edge === "e" || edge === "w";
      const verticalOnly = edge === "n" || edge === "s";
      const horizontalChange = Math.abs(width - start.width) / start.width;
      const verticalChange = Math.abs(height - start.height) / start.height;

      if (horizontalOnly || (!verticalOnly && horizontalChange >= verticalChange)) {
        width = Math.floor(height * LANDSCAPE_MAX_RATIO);
      } else {
        height = Math.ceil(width / LANDSCAPE_MAX_RATIO);
      }
    }

    return frameWithSize(start, edge, width, height);
  }

  // The interval between the landscape breakpoint and the established portrait
  // ratio remains traversable. Blocking it makes the two orientations feel like
  // disconnected resize zones; min/max and the panoramic limit still apply.
  return frameWithSize(start, edge, width, height);
}
