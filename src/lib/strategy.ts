import type { Json } from "@/types/database";

export const BOARD_WIDTH = 1600;
export const BOARD_HEIGHT = 900;

export type BoardShapeType =
  "rect" | "ellipse" | "triangle" | "diamond" | "star";

export type BoardTool = "select" | "text" | "line" | "arrow" | BoardShapeType;

export type BoardElement = {
  id: string;
  type: "icon" | "text" | "line" | "arrow" | BoardShapeType;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  /** icon */
  src?: string;
  name?: string;
  /** text */
  text?: string;
  fontSize?: number;
  /** shapes: bounding box (ellipse x/y is the center) */
  width?: number;
  height?: number;
  /** line / arrow, relative to x/y */
  points?: number[];
  color: string;
  /** shapes / lines / arrows: line or border width */
  strokeWidth?: number;
  /** shapes only: solid fill instead of outline */
  filled?: boolean;
  /** outline toggle — defaults on for shapes, off for icons */
  borderEnabled?: boolean;
  /** outline color; falls back to the element color */
  borderColor?: string;
};

export const DEFAULT_STROKE_WIDTH = 3;

/** Closed polygon points within a w×h bounding box, per shape. */
export function trianglePoints(width: number, height: number): number[] {
  return [width / 2, 0, width, height, 0, height];
}

export function diamondPoints(width: number, height: number): number[] {
  return [width / 2, 0, width, height / 2, width / 2, height, 0, height / 2];
}

export function starPoints(width: number, height: number): number[] {
  const spikes = 5;
  const points: number[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const angle = (Math.PI / spikes) * i - Math.PI / 2;
    const factor = i % 2 === 0 ? 1 : 0.45;
    points.push(
      width / 2 + factor * (width / 2) * Math.cos(angle),
      height / 2 + factor * (height / 2) * Math.sin(angle),
    );
  }
  return points;
}

export type BoardPage = {
  id: string;
  floor: string;
  elements: BoardElement[];
};

export type BoardScene = {
  pages: BoardPage[];
};

export const BOARD_COLORS = [
  "#fafafa",
  "#a1a1aa",
  "#52525b",
  "#09090b",
  "#ef4444",
  "#b91c1c",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
];

export function newId(): string {
  return crypto.randomUUID();
}

export function newPage(floor: string): BoardPage {
  return { id: newId(), floor, elements: [] };
}

/** Best-effort parse of the jsonb scene column. */
export function parseScene(data: Json): BoardScene {
  if (
    data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    Array.isArray((data as { pages?: unknown }).pages)
  ) {
    return data as unknown as BoardScene;
  }
  return { pages: [] };
}

const FLOOR_ORDER = [
  "basement",
  "ground_floor",
  "first_floor",
  "second_floor",
  "third_floor",
  "roof",
];

export function titleize(slug: string): string {
  return slug
    .split(/[_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export type BlueprintFloor = { slug: string; name: string; url: string };
export type BlueprintMap = {
  slug: string;
  name: string;
  floors: BlueprintFloor[];
};

/** `consulate_second_floor.png` → map `consulate`, floor `second_floor`. */
export function parseBlueprintFileName(
  fileName: string,
): { map: string; floor: string } | null {
  const base = fileName.replace(/\.[a-z0-9]+$/i, "").toLowerCase();
  for (const floor of FLOOR_ORDER) {
    if (base.endsWith(`_${floor}`)) {
      return { map: base.slice(0, -(floor.length + 1)), floor };
    }
  }
  // Unknown floor suffix: treat the last underscore segment as the floor.
  const index = base.lastIndexOf("_");
  if (index <= 0) return null;
  return { map: base.slice(0, index), floor: base.slice(index + 1) };
}

export function buildBlueprintMaps(
  files: { name: string; url: string }[],
): BlueprintMap[] {
  const maps = new Map<string, BlueprintMap>();

  for (const file of files) {
    const parsed = parseBlueprintFileName(file.name);
    if (!parsed) continue;
    const entry = maps.get(parsed.map) ?? {
      slug: parsed.map,
      name: titleize(parsed.map),
      floors: [],
    };
    entry.floors.push({
      slug: parsed.floor,
      name: titleize(parsed.floor),
      url: file.url,
    });
    maps.set(parsed.map, entry);
  }

  for (const map of maps.values()) {
    map.floors.sort((a, b) => {
      const ai = FLOOR_ORDER.indexOf(a.slug);
      const bi = FLOOR_ORDER.indexOf(b.slug);
      if (ai === -1 && bi === -1) return a.slug.localeCompare(b.slug);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }

  return [...maps.values()].sort((a, b) => a.name.localeCompare(b.name));
}
