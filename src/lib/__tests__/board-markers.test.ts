import { describe, expect, it } from "vitest";

import type { HatchZone, WallPanel } from "@/lib/blueprint-analyze";
import {
  buildHatchCircle,
  buildHatchSquare,
  buildPanelReinforcement,
} from "@/lib/board-markers";

const COLOR = "#22c55e";

/**
 * Markers are placed from a wall's centre line, so they must land on the centre
 * whatever their angle — the board rotates them about that same point.
 */
describe("wall markers sit on the wall centre", () => {
  it.each([0, 90] as const)("covers a panel at %s°", (angle) => {
    const panel: WallPanel = {
      cx: 400,
      cy: 300,
      angle,
      length: 120,
      thickness: 8,
    };
    expect(buildPanelReinforcement(panel, COLOR)).toMatchObject({
      x: 400,
      y: 300,
      rotation: angle,
    });
  });

  it("centres a hatch square on its zone", () => {
    const zone: HatchZone = { x: 100, y: 200, width: 40, height: 60 };
    expect(buildHatchSquare(zone, COLOR)).toMatchObject({ x: 120, y: 230 });
  });

  it("centres a hatch circle on the same point as its square", () => {
    const zone: HatchZone = { x: 100, y: 200, width: 40, height: 60 };
    const square = buildHatchSquare(zone, COLOR);
    const circle = buildHatchCircle(zone, COLOR);
    expect({ x: circle.x, y: circle.y }).toEqual({ x: square.x, y: square.y });
  });
});
