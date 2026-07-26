import type { Bounds, Point } from "../contracts/index.js";

export function isUsableBounds(
  bounds: Bounds | null,
  windowSize?: readonly [number, number] | null
): bounds is Bounds {
  if (bounds === null) {
    return false;
  }

  const [left, top, right, bottom] = bounds;
  if (right <= left || bottom <= top) {
    return false;
  }

  const [x, y] = centerFromBounds(bounds);
  if (x < 0 || y < 0) {
    return false;
  }

  if (windowSize !== undefined && windowSize !== null) {
    const [width, height] = windowSize;
    return x < width && y < height;
  }

  return true;
}

export function centerFromBounds(bounds: Bounds): Point {
  const [left, top, right, bottom] = bounds;
  return [Math.floor((left + right) / 2), Math.floor((top + bottom) / 2)];
}
