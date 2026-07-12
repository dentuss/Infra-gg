import type { Json } from "@/types/database";

export const BOARD_WIDTH = 1600;
export const BOARD_HEIGHT = 900;

export type BoardTool =
  "select" | "text" | "line" | "arrow" | "rect" | "ellipse";

export type BoardElement = {
  id: string;
  type: "icon" | "text" | "line" | "arrow" | "rect" | "ellipse";
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
  /** rect / ellipse */
  width?: number;
  height?: number;
  /** line / arrow, relative to x/y */
  points?: number[];
  color: string;
};

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
  "#ef4444",
  "#3b82f6",
  "#eab308",
  "#22c55e",
  "#f97316",
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
