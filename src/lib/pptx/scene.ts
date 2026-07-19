import { listOperatorIcons } from "@/lib/operator-icons";
import {
  emptyLineup,
  LINEUP_SIZE,
  newId,
  type BoardElement,
  type BoardPage,
  type LineupSlot,
} from "@/lib/strategy";

import type { ParsedSlide, PptxElement } from "./types";

// Imported icons/text carry no board colour of their own; these are only used
// where the board model requires a colour (e.g. an icon's optional border).
const ICON_COLOR = "#fafafa";
// A run with no explicit colour inherits the deck theme's text colour, which on
// these light slides is black — the board's own white default would render the
// text invisible against an imported map.
const TEXT_COLOR = "#000000";
const SHAPE_FALLBACK = "#ef4444";
const LINE_FALLBACK = "#111111";

/** Resolves an image's zip path to the URL it was uploaded to. */
export type SrcResolver = (mediaPath: string) => string;

export function elementToBoard(
  element: PptxElement,
  srcFor: SrcResolver,
): BoardElement {
  const base = { id: newId(), scaleX: 1, scaleY: 1, rotation: 0 };

  switch (element.kind) {
    case "image":
      return {
        ...base,
        type: "icon",
        src: srcFor(element.mediaPath),
        name: element.name ?? undefined,
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        rotation: element.rotation,
        color: element.stroke?.color ?? ICON_COLOR,
        borderEnabled: !!element.stroke,
        borderColor: element.stroke?.color,
        strokeWidth: element.stroke?.width,
      };
    case "text":
      return {
        ...base,
        type: "text",
        text: element.text,
        x: element.x,
        y: element.y,
        fontSize: element.fontSize,
        color: element.color ?? TEXT_COLOR,
      };
    case "rect":
      return {
        ...base,
        type: "rect",
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        rotation: element.rotation,
        color: element.color ?? SHAPE_FALLBACK,
        filled: true,
        borderEnabled: !!element.stroke,
        borderColor: element.stroke?.color,
        strokeWidth: element.stroke?.width,
      };
    case "ellipse":
      return {
        ...base,
        type: "ellipse",
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        rotation: element.rotation,
        color: element.color ?? SHAPE_FALLBACK,
        filled: true,
        borderEnabled: !!element.stroke,
        borderColor: element.stroke?.color,
        strokeWidth: element.stroke?.width,
      };
    case "line":
    case "arrow":
      return {
        ...base,
        type: element.kind,
        x: element.x,
        y: element.y,
        points: [...element.points],
        color: element.color ?? LINE_FALLBACK,
        strokeWidth: element.strokeWidth,
      };
  }
}

/** Turn chosen slides into board pages — one page per slide, order preserved. */
export function slidesToPages(
  slides: ParsedSlide[],
  floor: string,
  srcFor: SrcResolver,
): BoardPage[] {
  return slides.map((slide) => ({
    id: newId(),
    floor,
    background: slide.background ? srcFor(slide.background) : undefined,
    elements: slide.elements.map((element) => elementToBoard(element, srcFor)),
  }));
}

/**
 * Best-effort lineup: the most-used operators of the strat's side, matched from
 * image titles (e.g. `goyo.png`) to the bundled operator icons, into the five
 * slots. Wrong guesses are easy to fix on the board.
 */
export function lineupFromSlides(
  slides: ParsedSlide[],
  side: "attack" | "defense",
): LineupSlot[] {
  const byId = new Map(listOperatorIcons().map((op) => [op.id, op]));
  const wantSide = side === "defense" ? "Defender" : "Attacker";
  const counts = new Map<string, number>();
  for (const slide of slides) {
    for (const element of slide.elements) {
      if (element.kind !== "image" || !element.name) continue;
      const id = element.name.replace(/\.[a-z0-9]+$/i, "").toLowerCase();
      const op = byId.get(id);
      if (op && op.side === wantSide) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
  }
  const lineup = emptyLineup();
  [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, LINEUP_SIZE)
    .forEach(([id], index) => {
      const op = byId.get(id);
      if (op) lineup[index] = { operator: { src: op.src, name: op.name } };
    });
  return lineup;
}
