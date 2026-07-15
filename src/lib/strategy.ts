import type { Json } from "@/types/database";

export const BOARD_WIDTH = 1600;
export const BOARD_HEIGHT = 900;

export type BoardShapeType =
  "rect" | "ellipse" | "triangle" | "diamond" | "star";

export type BoardTool =
  "select" | "text" | "line" | "arrow" | "reinforce" | "hole" | BoardShapeType;

export type BoardElement = {
  id: string;
  /** "hole" is a rotation/hatch circle; x/y is its center like ellipse. */
  type: "icon" | "text" | "line" | "arrow" | "hole" | BoardShapeType;
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
  /** hole circles: centered number (1 feet, 2 head, 3 throw holes) */
  label?: string;
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

/** One player column in the lineup strip under the blueprint. */
export type LineupSlot = {
  nickname?: string;
  operator?: { src: string; name: string };
  gadget?: { src: string; name: string };
};

export const LINEUP_SIZE = 5;
export const LINEUP_HEIGHT = 200;
export const LINEUP_SLOT_WIDTH = BOARD_WIDTH / LINEUP_SIZE;
/** Board plus the lineup strip — the full exported canvas. */
export const STAGE_HEIGHT = BOARD_HEIGHT + LINEUP_HEIGHT;

/** Player colors, slots left to right. */
export const LINEUP_COLORS = [
  "#ef4444",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
];

export function emptyLineup(): LineupSlot[] {
  return Array.from({ length: LINEUP_SIZE }, () => ({}));
}

export type BoardScene = {
  pages: BoardPage[];
  lineup: LineupSlot[];
  /** Blueprint render style chosen for the strategy (e.g. "black", "bw"). */
  style?: string;
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
    const raw = data as unknown as {
      pages: BoardPage[];
      lineup?: LineupSlot[];
      style?: string;
    };
    return {
      pages: raw.pages,
      // Scenes saved before the lineup existed get five empty slots.
      lineup: emptyLineup().map((slot, index) => raw.lineup?.[index] ?? slot),
      style: typeof raw.style === "string" ? raw.style : undefined,
    };
  }
  return { pages: [], lineup: emptyLineup() };
}

const FLOOR_ORDER = [
  "basement",
  "ground_floor",
  "middle_floor",
  "first_floor",
  "second_floor",
  "third_floor",
  "top_floor",
  "roof",
];

export function titleize(slug: string): string {
  return slug
    .split(/[_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** One render of a floor: same geometry, different colour/annotation style. */
export type BlueprintVariant = { style: string; url: string };
export type BlueprintFloor = {
  slug: string;
  name: string;
  variants: BlueprintVariant[];
};
export type BlueprintMap = {
  slug: string;
  name: string;
  /** Render styles available across this map's floors (BG excluded). */
  styles: string[];
  floors: BlueprintFloor[];
};

// The user's uploads are named inconsistently (camelCase, spaces, underscores,
// "RW"/"Rework" infixes), so the floor and render style are recovered by
// keyword rather than a fixed pattern. The map name comes from the folder.
const STYLE_WORDS: Record<string, string> = {
  bw: "bw",
  bg: "bg",
  black: "black",
  blue: "blue",
  blueprint: "base",
  b: "b",
};

const FLOOR_WORDS: { matches: string[]; slug: string }[] = [
  { matches: ["basement", "sub"], slug: "basement" },
  { matches: ["ground"], slug: "ground_floor" },
  { matches: ["middle", "mid"], slug: "middle_floor" },
  { matches: ["first", "1f", "1st"], slug: "first_floor" },
  { matches: ["second", "2f", "2nd"], slug: "second_floor" },
  { matches: ["third", "3f", "3rd"], slug: "third_floor" },
  { matches: ["top"], slug: "top_floor" },
  { matches: ["roof"], slug: "roof" },
];

const STYLE_ORDER = ["base", "b", "black", "blue", "bw", "bg"];

export function styleOrder(style: string): number {
  const index = STYLE_ORDER.indexOf(style);
  return index === -1 ? STYLE_ORDER.length : index;
}

export function styleLabelKey(style: string): string {
  const keys: Record<string, string> = {
    base: "styleBlueprint",
    b: "styleDark",
    black: "styleBlack",
    blue: "styleBlue",
    bw: "styleBW",
    bg: "styleBackground",
  };
  return keys[style] ?? "styleBlueprint";
}

/** BW line-art has no yellow annotation, so enhanced tagging can't read it. */
export function styleSupportsEnhanced(style: string): boolean {
  return style !== "bw";
}

export function slugifyMap(folder: string): string {
  return folder
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** `BankReworkGroundFloorBlack.png` → floor `ground_floor`, style `black`. */
export function parseBlueprintFileName(
  fileName: string,
): { floor: string; style: string } | null {
  const words = fileName
    .replace(/\.[a-z0-9]+$/i, "")
    // Split camelCase, but keep floor tags like "1F"/"2F" intact (no digit→A-Z).
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return null;

  let style = "base";
  const last = words[words.length - 1]!;
  if (last in STYLE_WORDS) {
    style = STYLE_WORDS[last]!;
    words.pop();
  }

  for (const word of words) {
    const floor = FLOOR_WORDS.find((entry) => entry.matches.includes(word));
    if (floor) return { floor: floor.slug, style };
  }
  return null;
}

/** The floor's chosen-style render, falling back to the closest available. */
export function resolveVariant(
  floor: BlueprintFloor,
  style: string,
): BlueprintVariant | null {
  return (
    floor.variants.find((variant) => variant.style === style) ??
    [...floor.variants].sort(
      (a, b) => styleOrder(a.style) - styleOrder(b.style),
    )[0] ??
    null
  );
}

export function buildBlueprintMaps(
  files: { mapFolder: string; name: string; url: string }[],
): BlueprintMap[] {
  const maps = new Map<string, BlueprintMap>();

  for (const file of files) {
    const parsed = parseBlueprintFileName(file.name);
    if (!parsed || parsed.style === "bg") continue; // BG excluded for now
    const slug = slugifyMap(file.mapFolder);
    const map: BlueprintMap = maps.get(slug) ?? {
      slug,
      name: file.mapFolder.trim(),
      styles: [],
      floors: [],
    };
    let floor = map.floors.find((entry) => entry.slug === parsed.floor);
    if (!floor) {
      floor = {
        slug: parsed.floor,
        name: titleize(parsed.floor),
        variants: [],
      };
      map.floors.push(floor);
    }
    if (!floor.variants.some((variant) => variant.style === parsed.style)) {
      floor.variants.push({ style: parsed.style, url: file.url });
    }
    maps.set(slug, map);
  }

  for (const map of maps.values()) {
    const styles = new Set<string>();
    for (const floor of map.floors) {
      floor.variants.sort((a, b) => styleOrder(a.style) - styleOrder(b.style));
      floor.variants.forEach((variant) => styles.add(variant.style));
    }
    map.styles = [...styles].sort((a, b) => styleOrder(a) - styleOrder(b));
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
