/**
 * Fits reinforcement/rotation markers to the blueprint under a click by
 * sampling its pixels. Walls are found via their black ink (soft walls
 * have black outlines around a gray fill), hatches by casting rays from
 * the click to the surrounding dashed border. Validated against the
 * real map renders: walls ~26 luminance, hatch dashes ~220, floor
 * shading ~161 — so black ink < 120 isolates structure.
 */

export type WallFit = {
  kind: "wall";
  cx: number;
  cy: number;
  angle: number;
  thickness: number;
};

export type HatchFit = {
  kind: "hatch";
  x: number;
  y: number;
  width: number;
  height: number;
};

export type BlueprintFit = WallFit | HatchFit;

const BLACK_INK = 120;
const HATCH_EDGE = 240;
const NEAR_BLACK_RADIUS = 8;
const WALL_WINDOW = 26;
const MIN_WALL_PIXELS = 25;
const MAX_WALL_SPAN = 30;
const HATCH_RAY_MAX = 50;
const HATCH_RAY_BAND = 4;

function luminance(data: ImageData, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= data.width || y >= data.height) return 255;
  const index = (y * data.width + x) * 4;
  return (
    0.299 * (data.data[index] ?? 255) +
    0.587 * (data.data[index + 1] ?? 255) +
    0.114 * (data.data[index + 2] ?? 255)
  );
}

function nearBlack(data: ImageData, px: number, py: number): boolean {
  for (let dy = -NEAR_BLACK_RADIUS; dy <= NEAR_BLACK_RADIUS; dy++) {
    for (let dx = -NEAR_BLACK_RADIUS; dx <= NEAR_BLACK_RADIUS; dx++) {
      if (luminance(data, px + dx, py + dy) < BLACK_INK) return true;
    }
  }
  return false;
}

function fitWall(data: ImageData, px: number, py: number): WallFit | null {
  const points: [number, number][] = [];
  for (let dy = -WALL_WINDOW; dy <= WALL_WINDOW; dy++) {
    for (let dx = -WALL_WINDOW; dx <= WALL_WINDOW; dx++) {
      if (
        dx * dx + dy * dy <= WALL_WINDOW * WALL_WINDOW &&
        luminance(data, px + dx, py + dy) < BLACK_INK
      ) {
        points.push([px + dx, py + dy]);
      }
    }
  }
  if (points.length < MIN_WALL_PIXELS) return null;

  let meanX = 0;
  let meanY = 0;
  for (const [x, y] of points) {
    meanX += x;
    meanY += y;
  }
  meanX /= points.length;
  meanY /= points.length;

  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const [x, y] of points) {
    const a = x - meanX;
    const b = y - meanY;
    sxx += a * a;
    syy += b * b;
    sxy += a * b;
  }
  const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);

  // Wall thickness = ink spread across the principal axis; a fat blob
  // (floor shading, furniture cluster) is not a wall.
  const normalX = -Math.sin(angle);
  const normalY = Math.cos(angle);
  const spread = points
    .map(([x, y]) => (x - meanX) * normalX + (y - meanY) * normalY)
    .sort((a, b) => a - b);
  const low = spread[Math.floor(spread.length * 0.05)] ?? 0;
  const high = spread[Math.floor(spread.length * 0.95)] ?? 0;
  const span = high - low;
  if (span > MAX_WALL_SPAN) return null;

  // Recenter the click onto the wall's center line.
  const mid = (low + high) / 2;
  const clickOffset = (px - meanX) * normalX + (py - meanY) * normalY;
  return {
    kind: "wall",
    cx: px + (mid - clickOffset) * normalX,
    cy: py + (mid - clickOffset) * normalY,
    angle: (angle * 180) / Math.PI,
    thickness: Math.max(span, 4),
  };
}

function fitHatch(data: ImageData, px: number, py: number): HatchFit | null {
  const distances: number[] = [];
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const) {
    let found = 0;
    for (let t = 2; t <= HATCH_RAY_MAX && !found; t++) {
      for (let band = -HATCH_RAY_BAND; band <= HATCH_RAY_BAND; band++) {
        const x = px + dx * t + Math.abs(dy) * band;
        const y = py + dy * t + Math.abs(dx) * band;
        if (luminance(data, x, y) < HATCH_EDGE) {
          found = t;
          break;
        }
      }
    }
    if (!found) return null;
    distances.push(found);
  }
  const [right = 0, left = 0, down = 0, up = 0] = distances;
  const width = left + right;
  const height = up + down;
  if (width < 16 || height < 16 || width > 96 || height > 96) return null;
  const aspect = width / height;
  if (aspect < 0.4 || aspect > 2.5) return null;
  return { kind: "hatch", x: px - left, y: py - up, width, height };
}

export function detectBlueprintFit(
  data: ImageData | null,
  px: number,
  py: number,
): BlueprintFit | null {
  if (!data) return null;
  return nearBlack(data, px, py)
    ? fitWall(data, px, py)
    : fitHatch(data, px, py);
}
