/**
 * Full-blueprint segmentation for the enhanced editing mode: finds every
 * destructible wall panel and hatch so they can be highlighted and
 * clicked. A soft wall reads as a "sandwich" — black outline, non-white
 * fill 2-12px, black outline — which windows and doors fail (white gap)
 * and solid walls fail (no gap). A hatch is a box of dark dashes; every
 * edge must be dashed (short dark runs), which furniture outlines
 * (solid or too light) fail. Tuned against the real Bank renders.
 */

export type WallPanel = {
  cx: number;
  cy: number;
  /** 0 = horizontal, 90 = vertical (blueprint walls are axis-aligned). */
  angle: 0 | 90;
  length: number;
  thickness: number;
};

export type HatchZone = { x: number; y: number; width: number; height: number };

export type BlueprintAnalysis = { panels: WallPanel[]; hatches: HatchZone[] };

const BLACK = 120;
const GAP_MIN_TONE = 150;
const GAP_MAX_TONE = 252;
const GAP_MEAN = 190;
const GAP_MIN = 2;
const GAP_MAX = 12;
const PANEL_MIN_AREA = 60;
const PANEL_MAX_AREA = 3000;
const PANEL_MIN_THICK = 5;
const PANEL_MAX_THICK = 18;
const PANEL_MIN_LEN = 10;
const PANEL_MAX_LEN = 115;
const DASH_DARK = 195;
const HATCH_RAY_MAX = 50;
const HATCH_GRID = 5;

function toLuminance(data: ImageData): Uint8Array {
  const lum = new Uint8Array(data.width * data.height);
  for (let i = 0; i < lum.length; i++) {
    lum[i] =
      0.299 * (data.data[i * 4] ?? 255) +
      0.587 * (data.data[i * 4 + 1] ?? 255) +
      0.114 * (data.data[i * 4 + 2] ?? 255);
  }
  return lum;
}

/** Marks outline-fill-outline sandwiches along both axes. */
function buildPanelMask(lum: Uint8Array, w: number, h: number): Uint8Array {
  const mask = new Uint8Array(lum.length);
  for (const vertical of [false, true]) {
    const outer = vertical ? w : h;
    const inner = vertical ? h : w;
    const at = (o: number, i: number) => (vertical ? i * w + o : o * w + i);
    for (let o = 0; o < outer; o++) {
      let i = 0;
      while (i < inner) {
        if ((lum[at(o, i)] ?? 255) >= BLACK) {
          i++;
          continue;
        }
        let firstEnd = i;
        while (
          firstEnd + 1 < inner &&
          (lum[at(o, firstEnd + 1)] ?? 255) < BLACK
        ) {
          firstEnd++;
        }
        let g = firstEnd + 1;
        let sum = 0;
        let count = 0;
        let ok = true;
        while (g < inner && (lum[at(o, g)] ?? 255) >= BLACK) {
          const value = lum[at(o, g)] ?? 255;
          if (value < GAP_MIN_TONE || value > GAP_MAX_TONE) ok = false;
          sum += value;
          count++;
          if (count > GAP_MAX) {
            ok = false;
            break;
          }
          g++;
        }
        if (ok && count >= GAP_MIN && g < inner && sum / count >= GAP_MEAN) {
          let secondEnd = g;
          while (
            secondEnd + 1 < inner &&
            (lum[at(o, secondEnd + 1)] ?? 255) < BLACK
          ) {
            secondEnd++;
          }
          for (let m = i; m <= secondEnd; m++) mask[at(o, m)] = 1;
          i = g;
          continue;
        }
        i = firstEnd + 1;
      }
    }
  }
  return mask;
}

function maskToPanels(mask: Uint8Array, w: number, h: number): WallPanel[] {
  const seen = new Uint8Array(mask.length);
  // Sized to the whole image: each pixel is pushed at most once (marked
  // seen on push), so this can never overflow and drop a component.
  const stack = new Int32Array(mask.length);
  const panels: WallPanel[] = [];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || seen[start]) continue;
    let top = 0;
    stack[top++] = start;
    seen[start] = 1;
    let count = 0;
    let minX = w;
    let maxX = 0;
    let minY = h;
    let maxY = 0;
    while (top > 0) {
      const idx = stack[--top] ?? 0;
      const x = idx % w;
      const y = (idx / w) | 0;
      count++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const n = ny * w + nx;
        if (mask[n] && !seen[n] && top < stack.length) {
          seen[n] = 1;
          stack[top++] = n;
        }
      }
    }
    if (count < PANEL_MIN_AREA || count > PANEL_MAX_AREA) continue;
    const boxW = maxX - minX + 1;
    const boxH = maxY - minY + 1;
    const length = Math.max(boxW, boxH);
    const thickness = Math.min(boxW, boxH);
    if (thickness < PANEL_MIN_THICK || thickness > PANEL_MAX_THICK) continue;
    if (length < PANEL_MIN_LEN || length > PANEL_MAX_LEN) continue;
    if (count / (boxW * boxH) < 0.55) continue;
    panels.push({
      cx: minX + boxW / 2,
      cy: minY + boxH / 2,
      angle: boxH > boxW ? 90 : 0,
      length,
      thickness,
    });
  }
  return panels;
}

function fitHatchZone(
  lum: Uint8Array,
  w: number,
  h: number,
  px: number,
  py: number,
): HatchZone | null {
  const at = (x: number, y: number) =>
    x < 0 || y < 0 || x >= w || y >= h ? 255 : (lum[y * w + x] ?? 255);
  const distances: number[] = [];
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const) {
    let found = 0;
    for (let t = 2; t <= HATCH_RAY_MAX && !found; t++) {
      for (let band = -4; band <= 4; band++) {
        if (
          at(
            px + dx * t + Math.abs(dy) * band,
            py + dy * t + Math.abs(dx) * band,
          ) < DASH_DARK
        ) {
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
  if (width < 16 || height < 16 || width > 70 || height > 70) return null;
  if (width / height < 0.5 || width / height > 2) return null;
  return { x: px - left, y: py - up, width, height };
}

/** Every edge must be dashed: mid coverage, short dark runs only. */
function isDashed(
  lum: Uint8Array,
  w: number,
  h: number,
  zone: HatchZone,
): boolean {
  const at = (x: number, y: number) =>
    x < 0 || y < 0 || x >= w || y >= h ? 255 : (lum[y * w + x] ?? 255);
  const edgeOk = (
    x0: number,
    y0: number,
    dx: number,
    dy: number,
    nx: number,
    ny: number,
    steps: number,
  ) => {
    const samples: number[] = [];
    for (let s = 0; s < steps; s++) {
      let value = 255;
      // Straddle the fitted edge — rays stop at the dashes' inner side.
      for (let o = -3; o <= 4; o++) {
        value = Math.min(
          value,
          at(
            Math.round(x0 + dx * s + nx * o),
            Math.round(y0 + dy * s + ny * o),
          ),
        );
      }
      samples.push(value < DASH_DARK ? 1 : 0);
    }
    const coverage = samples.reduce((a, b) => a + b, 0) / samples.length;
    if (coverage < 0.2 || coverage > 0.9) return false;
    let runs = 0;
    let run = 0;
    let maxRun = 0;
    for (const sample of samples) {
      if (sample) {
        run++;
        maxRun = Math.max(maxRun, run);
      } else {
        if (run >= 2) runs++;
        run = 0;
      }
    }
    if (run >= 2) runs++;
    return maxRun <= 14 && runs >= 2;
  };
  return (
    edgeOk(zone.x, zone.y, 1, 0, 0, -1, zone.width) &&
    edgeOk(zone.x + zone.width, zone.y, 0, 1, 1, 0, zone.height) &&
    edgeOk(
      zone.x + zone.width,
      zone.y + zone.height,
      -1,
      0,
      0,
      1,
      zone.width,
    ) &&
    edgeOk(zone.x, zone.y + zone.height, 0, -1, -1, 0, zone.height)
  );
}

function scanHatches(lum: Uint8Array, w: number, h: number): HatchZone[] {
  const hatches: HatchZone[] = [];
  const covered = (x: number, y: number) =>
    hatches.some(
      (c) =>
        x >= c.x - 4 &&
        x <= c.x + c.width + 4 &&
        y >= c.y - 4 &&
        y <= c.y + c.height + 4,
    );
  for (let y = 8; y < h - 8; y += HATCH_GRID) {
    for (let x = 8; x < w - 8; x += HATCH_GRID) {
      if ((lum[y * w + x] ?? 0) < 245 || covered(x, y)) continue;
      const fit = fitHatchZone(lum, w, h, x, y);
      if (!fit) continue;
      const cx = Math.round(fit.x + fit.width / 2);
      const cy = Math.round(fit.y + fit.height / 2);
      const refit = fitHatchZone(lum, w, h, cx, cy) ?? fit;
      if (covered(cx, cy)) continue;
      if (!isDashed(lum, w, h, refit)) continue;
      hatches.push(refit);
    }
  }
  return hatches;
}

export function analyzeBlueprint(data: ImageData): BlueprintAnalysis {
  const lum = toLuminance(data);
  return {
    panels: maskToPanels(
      buildPanelMask(lum, data.width, data.height),
      data.width,
      data.height,
    ),
    hatches: scanHatches(lum, data.width, data.height),
  };
}

/** Panel under a board point, with a small grab margin. */
export function panelAt(
  analysis: BlueprintAnalysis,
  x: number,
  y: number,
): WallPanel | null {
  for (const panel of analysis.panels) {
    const along = panel.angle === 0 ? x - panel.cx : y - panel.cy;
    const across = panel.angle === 0 ? y - panel.cy : x - panel.cx;
    if (
      Math.abs(along) <= panel.length / 2 + 4 &&
      Math.abs(across) <= panel.thickness / 2 + 4
    ) {
      return panel;
    }
  }
  return null;
}

/** Hatch zone under a board point, with a small grab margin. */
export function hatchAt(
  analysis: BlueprintAnalysis,
  x: number,
  y: number,
): HatchZone | null {
  for (const zone of analysis.hatches) {
    if (
      x >= zone.x - 4 &&
      x <= zone.x + zone.width + 4 &&
      y >= zone.y - 4 &&
      y <= zone.y + zone.height + 4
    ) {
      return zone;
    }
  }
  return null;
}
