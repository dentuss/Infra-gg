import type { BlueprintFit } from "@/lib/blueprint-detect";
import { newId, type BoardElement } from "@/lib/strategy";

const REINFORCEMENT_LENGTH = 36;
const WALL_PADDING = 8;
const HATCH_PADDING = 4;
const MARKER_BORDER = "#09090b";
const MARKER_STROKE = 3;

const base = (color: string) => ({
  id: newId(),
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  color,
  strokeWidth: MARKER_STROKE,
  filled: true,
  borderEnabled: true,
  borderColor: MARKER_BORDER,
});

/** Reinforcement square: fitted to the wall or the hatch outline. */
export function buildReinforcement(
  fit: BlueprintFit | null,
  click: { x: number; y: number },
  color: string,
): BoardElement {
  if (fit?.kind === "hatch") {
    return {
      ...base(color),
      type: "rect",
      x: fit.x - HATCH_PADDING,
      y: fit.y - HATCH_PADDING,
      width: fit.width + HATCH_PADDING * 2,
      height: fit.height + HATCH_PADDING * 2,
    };
  }

  const width = REINFORCEMENT_LENGTH;
  const height = fit ? Math.min(fit.thickness, 28) + WALL_PADDING : 16;
  const angle = fit?.angle ?? 0;
  const cx = fit?.cx ?? click.x;
  const cy = fit?.cy ?? click.y;
  // Rects rotate around their top-left corner; place it so the marker
  // stays centered on the wall line.
  const rad = (angle * Math.PI) / 180;
  return {
    ...base(color),
    type: "rect",
    x: cx - (Math.cos(rad) * width) / 2 + (Math.sin(rad) * height) / 2,
    y: cy - (Math.sin(rad) * width) / 2 - (Math.cos(rad) * height) / 2,
    rotation: angle,
    width,
    height,
  };
}

/** Rotation / hole circle, optionally numbered (1 feet, 2 head, 3 throw). */
export function buildHole(
  fit: BlueprintFit | null,
  click: { x: number; y: number },
  color: string,
  label: string,
): BoardElement {
  let cx = click.x;
  let cy = click.y;
  let diameter = 28;
  if (fit?.kind === "hatch") {
    cx = fit.x + fit.width / 2;
    cy = fit.y + fit.height / 2;
    diameter = Math.min(fit.width, fit.height) * 0.8;
  } else if (fit?.kind === "wall") {
    cx = fit.cx;
    cy = fit.cy;
    diameter = Math.min(44, Math.max(22, fit.thickness * 2.4));
  }
  return {
    ...base(color),
    type: "hole",
    x: cx,
    y: cy,
    width: diameter,
    height: diameter,
    label: label || undefined,
  };
}
