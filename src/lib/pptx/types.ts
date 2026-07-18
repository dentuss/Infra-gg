// Board-ready elements extracted from a slide, already scaled to the 1600×900
// board. Images carry a `mediaPath` (a zip entry) instead of a resolved URL —
// the scene builder uploads the media and swaps in real URLs (Stage 2).

export type PptxElement =
  | {
      kind: "image";
      mediaPath: string;
      name: string | null;
      x: number;
      y: number;
      width: number;
      height: number;
      rotation: number;
    }
  | {
      kind: "text";
      text: string;
      x: number;
      y: number;
      fontSize: number;
      color: string | null;
    }
  | {
      kind: "rect" | "ellipse";
      x: number;
      y: number;
      width: number;
      height: number;
      rotation: number;
      color: string | null;
      filled: boolean;
    }
  | {
      kind: "arrow" | "line";
      x: number;
      y: number;
      points: [number, number, number, number];
      color: string | null;
      strokeWidth: number;
    };

export type ParsedSlide = {
  /** 1-based position in the deck. */
  index: number;
  /** Has a background map image (content slide vs. a title/section slide). */
  hasMap: boolean;
  elements: PptxElement[];
  /** Distinct zip entries referenced by this slide, for upload. */
  mediaPaths: string[];
};

export type ParsedDeck = {
  slides: ParsedSlide[];
  /** Referenced media only (zip path → bytes). */
  media: Record<string, Uint8Array>;
  /** Count of objects we can't represent yet (tables, charts, SmartArt…). */
  unsupported: number;
};
