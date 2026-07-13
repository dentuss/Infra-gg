/**
 * Fits reinforcement/rotation markers to the blueprint under a click by
 * sampling its pixels. Wall direction is the longest continuous ink run
 * through the clicked spot (junction ink loses — its runs are shorter),
 * thickness comes from a perpendicular scan that bridges the gray
 * interior of soft walls. Hatches are found by casting rays from the
 * click to the surrounding dashed border. Validated against the real
 * map renders: walls ~26 luminance, soft-wall fill ~204, hatch dashes
 * ~220, floor shading ~161.
 */

export type WallFit = {
  kind: "wall";
  cx: number;
  cy: number;
  angle: number;
  thickness: number;
  /** Ink extent along the wall through the click, for short stubs. */
  alongExtent: number;
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
const BRIDGE = 235;
const ANCHOR_RADIUS = 8;
const RUN_MAX = 60;
const RUN_GAP = 4;
const MIN_RUN = 12;
const CROSS_MAX = 18;
const CROSS_GAP = 12;
const ANGLE_SNAP = 4;
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

const isInk = (data: ImageData, x: number, y: number) =>
  luminance(data, x, y) < BLACK_INK;

/** Nearest ink pixel to the click; walls are grabbed by their outlines. */
function findAnchor(
  data: ImageData,
  px: number,
  py: number,
): [number, number] | null {
  for (let r = 0; r <= ANCHOR_RADIUS; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (
          Math.max(Math.abs(dx), Math.abs(dy)) === r &&
          isInk(data, px + dx, py + dy)
        ) {
          return [px + dx, py + dy];
        }
      }
    }
  }
  return null;
}

/** Ink run through (x0,y0) along ±(ux,uy), tolerating panel joints. */
function runLength(
  data: ImageData,
  x0: number,
  y0: number,
  ux: number,
  uy: number,
): { total: number; extent: number } {
  let total = 1;
  let extent = 0;
  for (const sign of [1, -1]) {
    let gap = 0;
    for (let t = 1; t <= RUN_MAX; t++) {
      const x = Math.round(x0 + ux * t * sign);
      const y = Math.round(y0 + uy * t * sign);
      // Thick probe: tolerate one pixel of aliasing across the line.
      const hit =
        isInk(data, x, y) ||
        isInk(data, Math.round(x - uy), Math.round(y + ux)) ||
        isInk(data, Math.round(x + uy), Math.round(y - ux));
      if (hit) {
        total++;
        extent += 1 + gap;
        gap = 0;
      } else if (++gap > RUN_GAP) {
        break;
      }
    }
  }
  return { total, extent };
}

function fitWall(data: ImageData, anchor: [number, number]): WallFit | null {
  const [ax, ay] = anchor;
  let best = { angle: 0, run: -1 };
  const tryAngle = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    const { total } = runLength(data, ax, ay, Math.cos(rad), Math.sin(rad));
    if (total > best.run) best = { angle: deg, run: total };
  };
  for (let deg = 0; deg < 180; deg += 15) tryAngle(deg);
  const coarse = best.angle;
  for (let deg = coarse - 12; deg <= coarse + 12; deg += 3) tryAngle(deg);
  if (best.run < MIN_RUN) return null;

  let angle = ((best.angle % 180) + 180) % 180;
  for (const standard of [0, 45, 90, 135, 180]) {
    if (Math.abs(angle - standard) <= ANGLE_SNAP) {
      angle = standard % 180;
      break;
    }
  }
  const rad = (angle * Math.PI) / 180;
  const ux = Math.cos(rad);
  const uy = Math.sin(rad);

  // Perpendicular ink extent; gray pixels bridge soft-wall interiors,
  // white floor ends the wall.
  const across = (sign: number) => {
    let last = 0;
    let gap = 0;
    for (let t = 1; t <= CROSS_MAX; t++) {
      const x = Math.round(ax - uy * t * sign);
      const y = Math.round(ay + ux * t * sign);
      if (isInk(data, x, y)) {
        last = t;
        gap = 0;
      } else if (luminance(data, x, y) < BRIDGE && gap <= CROSS_GAP) {
        gap++;
      } else {
        break;
      }
    }
    return last;
  };
  const plus = across(1);
  const minus = across(-1);
  const offset = Math.max(-8, Math.min(8, (plus - minus) / 2));
  return {
    kind: "wall",
    cx: ax - uy * offset,
    cy: ay + ux * offset,
    angle,
    thickness: Math.min(plus + minus + 1, CROSS_MAX),
    alongExtent: runLength(data, ax, ay, ux, uy).extent,
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
        if (luminance(data, x, y) < BRIDGE) {
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
  const anchor = findAnchor(data, px, py);
  return anchor ? fitWall(data, anchor) : fitHatch(data, px, py);
}
