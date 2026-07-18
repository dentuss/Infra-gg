import { newId, type BoardElement, type BoardPage } from "@/lib/strategy";

import type { ParsedSlide, PptxElement } from "./types";

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
        color: ICON_COLOR,
        borderEnabled: false,
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
        borderEnabled: false,
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
        borderEnabled: false,
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
    elements: slide.elements.map((element) => elementToBoard(element, srcFor)),
  }));
}
