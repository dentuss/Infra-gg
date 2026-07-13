import { BOARD_HEIGHT, BOARD_WIDTH } from "@/lib/strategy";

export type Box = { x: number; y: number; width: number; height: number };

export type SnapResult = {
  dx: number;
  dy: number;
  vGuides: number[];
  hGuides: number[];
};

const SNAP_THRESHOLD = 6;

function stops(edges: number[]): number[] {
  return edges;
}

/**
 * Slides-style snapping: the dragged box's edges and center attract to
 * other boxes' edges/centers and to the board edges/center.
 */
export function computeSnap(
  box: Box,
  others: Box[],
  threshold = SNAP_THRESHOLD,
): SnapResult {
  const vStops = stops([0, BOARD_WIDTH / 2, BOARD_WIDTH]);
  const hStops = stops([0, BOARD_HEIGHT / 2, BOARD_HEIGHT]);
  for (const other of others) {
    vStops.push(other.x, other.x + other.width / 2, other.x + other.width);
    hStops.push(other.y, other.y + other.height / 2, other.y + other.height);
  }

  const vEdges = [box.x, box.x + box.width / 2, box.x + box.width];
  const hEdges = [box.y, box.y + box.height / 2, box.y + box.height];

  let dx = 0;
  let bestV = threshold;
  const vGuides: number[] = [];
  for (const stop of vStops) {
    for (const edge of vEdges) {
      const distance = Math.abs(stop - edge);
      if (distance < bestV) {
        bestV = distance;
        dx = stop - edge;
        vGuides.length = 0;
        vGuides.push(stop);
      } else if (
        distance === bestV &&
        dx === stop - edge &&
        bestV < threshold
      ) {
        vGuides.push(stop);
      }
    }
  }

  let dy = 0;
  let bestH = threshold;
  const hGuides: number[] = [];
  for (const stop of hStops) {
    for (const edge of hEdges) {
      const distance = Math.abs(stop - edge);
      if (distance < bestH) {
        bestH = distance;
        dy = stop - edge;
        hGuides.length = 0;
        hGuides.push(stop);
      } else if (
        distance === bestH &&
        dy === stop - edge &&
        bestH < threshold
      ) {
        hGuides.push(stop);
      }
    }
  }

  return {
    dx: bestV < threshold ? dx : 0,
    dy: bestH < threshold ? dy : 0,
    vGuides: bestV < threshold ? vGuides : [],
    hGuides: bestH < threshold ? hGuides : [],
  };
}
