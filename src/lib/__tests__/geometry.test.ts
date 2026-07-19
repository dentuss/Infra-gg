import { describe, expect, it } from "vitest";

import {
  isCornerAnchoredNode,
  parseScene,
  SCENE_VERSION,
  upgradePageToCentreAnchoring,
  type BoardElement,
  type BoardPage,
} from "@/lib/strategy";

const element = (patch: Partial<BoardElement>): BoardElement => ({
  id: "e1",
  type: "rect",
  x: 0,
  y: 0,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  color: "#fff",
  ...patch,
});

const page = (elements: BoardElement[]): BoardPage => ({
  id: "p1",
  floor: "ground_floor",
  elements,
});

describe("anchoring", () => {
  it("offsets the node types Konva anchors at their corner", () => {
    for (const type of [
      "icon",
      "rect",
      "triangle",
      "diamond",
      "star",
    ] as const) {
      expect(isCornerAnchoredNode(type)).toBe(true);
    }
  });

  it("leaves already-centred and non-box nodes alone", () => {
    for (const type of ["ellipse", "hole", "text", "line", "arrow"] as const) {
      expect(isCornerAnchoredNode(type)).toBe(false);
    }
  });
});

describe("v1 → v2 upgrade", () => {
  it("moves a corner-anchored box to its centre", () => {
    const [upgraded] = upgradePageToCentreAnchoring(
      page([element({ type: "rect", x: 100, y: 200, width: 60, height: 40 })]),
    ).elements;
    expect(upgraded).toMatchObject({ x: 130, y: 220 });
  });

  it("does not move an ellipse or hole, which already stored their centre", () => {
    const upgraded = upgradePageToCentreAnchoring(
      page([
        element({
          id: "a",
          type: "ellipse",
          x: 100,
          y: 200,
          width: 60,
          height: 40,
        }),
        element({ id: "b", type: "hole", x: 10, y: 20, width: 30, height: 30 }),
      ]),
    ).elements;
    expect(upgraded[0]).toMatchObject({ x: 100, y: 200 });
    expect(upgraded[1]).toMatchObject({ x: 10, y: 20 });
  });

  it("tolerates a box with no size", () => {
    const [upgraded] = upgradePageToCentreAnchoring(
      page([element({ type: "rect", x: 5, y: 7 })]),
    ).elements;
    expect(upgraded).toMatchObject({ x: 5, y: 7 });
  });

  it("upgrades a versionless scene exactly once", () => {
    const stored = {
      pages: [page([element({ x: 100, y: 200, width: 60, height: 40 })])],
    };
    const once = parseScene(stored as never);
    expect(once.pages[0]!.elements[0]).toMatchObject({ x: 130, y: 220 });
    expect(once.version).toBe(SCENE_VERSION);

    // Re-parsing what we just produced must not shift it again.
    const twice = parseScene({ ...once } as never);
    expect(twice.pages[0]!.elements[0]).toMatchObject({ x: 130, y: 220 });
  });
});
