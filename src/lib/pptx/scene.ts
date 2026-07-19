import { listOperatorIcons } from "@/lib/operator-icons";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  emptyLineup,
  LINEUP_SIZE,
  newId,
  type BoardElement,
  type BoardPage,
  type LineupSlot,
} from "@/lib/strategy";

import type { ParsedSlide, PptxElement } from "./types";

/** The region a fitted background occupies inside the board (letterboxed). */
type Fit = { x: number; y: number; width: number; height: number };

export type ImageDims = { width: number; height: number };

function computeFit(imgW: number, imgH: number): Fit {
  const scale = Math.min(BOARD_WIDTH / imgW, BOARD_HEIGHT / imgH);
  const width = imgW * scale;
  const height = imgH * scale;
  return {
    x: (BOARD_WIDTH - width) / 2,
    y: (BOARD_HEIGHT - height) / 2,
    width,
    height,
  };
}

/** Remap an element from full-board space into the fitted (letterboxed) region. */
function applyFit(element: BoardElement, fit: Fit): BoardElement {
  const sx = fit.width / BOARD_WIDTH;
  const sy = fit.height / BOARD_HEIGHT;
  return {
    ...element,
    x: fit.x + element.x * sx,
    y: fit.y + element.y * sy,
    width: element.width == null ? element.width : element.width * sx,
    height: element.height == null ? element.height : element.height * sy,
    fontSize:
      element.fontSize == null ? element.fontSize : element.fontSize * sy,
    strokeWidth:
      element.strokeWidth == null
        ? element.strokeWidth
        : element.strokeWidth * Math.min(sx, sy),
    points: element.points
      ? element.points.map((p, i) => (i % 2 === 0 ? p * sx : p * sy))
      : element.points,
  };
}

// Imported icons/text carry no board colour of their own; these are only used
// where the board model requires a colour (e.g. an icon's optional border).
const ICON_COLOR = "#fafafa";
const TEXT_COLOR = "#fafafa";
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
      // The board anchors an ellipse at its centre; the parser gives top-left.
      return {
        ...base,
        type: "ellipse",
        x: element.x + element.width / 2,
        y: element.y + element.height / 2,
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
  dimsFor: (mediaPath: string) => ImageDims | null,
): BoardPage[] {
  return slides.map((slide) => {
    const dims = slide.background ? dimsFor(slide.background) : null;
    const fit = dims ? computeFit(dims.width, dims.height) : null;
    return {
      id: newId(),
      floor,
      background: slide.background ? srcFor(slide.background) : undefined,
      elements: slide.elements.map((element) => {
        const board = elementToBoard(element, srcFor);
        return fit ? applyFit(board, fit) : board;
      }),
    };
  });
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
