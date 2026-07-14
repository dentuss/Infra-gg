import type { HatchZone, WallPanel } from "@/lib/blueprint-analyze";
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

/** Square over a hatch, covering the dashed outline. */
export function buildHatchSquare(zone: HatchZone, color: string): BoardElement {
  return {
    ...base(color),
    type: "rect",
    x: zone.x - HATCH_PADDING,
    y: zone.y - HATCH_PADDING,
    width: zone.width + HATCH_PADDING * 2,
    height: zone.height + HATCH_PADDING * 2,
  };
}

/** Circle inscribed in a hatch (opened), optionally numbered. */
export function buildHatchCircle(
  zone: HatchZone,
  color: string,
  label = "",
): BoardElement {
  const diameter = Math.min(zone.width, zone.height) * 0.9;
  return {
    ...base(color),
    type: "hole",
    x: zone.x + zone.width / 2,
    y: zone.y + zone.height / 2,
    width: diameter,
    height: diameter,
    label: label || undefined,
  };
}

/** Reinforcement covering a whole wall panel: exact length, width overhang. */
export function buildPanelReinforcement(
  panel: WallPanel,
  color: string,
): BoardElement {
  const width = panel.length + 2;
  const height = Math.min(panel.thickness, 28) + WALL_PADDING;
  const rad = (panel.angle * Math.PI) / 180;
  return {
    ...base(color),
    type: "rect",
    x: panel.cx - (Math.cos(rad) * width) / 2 + (Math.sin(rad) * height) / 2,
    y: panel.cy - (Math.sin(rad) * width) / 2 - (Math.cos(rad) * height) / 2,
    rotation: panel.angle,
    width,
    height,
  };
}

/** Hole circle on a panel's center line, at the click's spot along it. */
export function buildPanelHole(
  panel: WallPanel,
  click: { x: number; y: number },
  color: string,
  label: string,
): BoardElement {
  const diameter = Math.min(34, Math.max(22, panel.thickness * 2.4));
  const reach = Math.max(0, panel.length / 2 - diameter / 2);
  const clampAlong = (value: number) =>
    Math.max(-reach, Math.min(reach, value));
  return {
    ...base(color),
    type: "hole",
    x: panel.angle === 0 ? panel.cx + clampAlong(click.x - panel.cx) : panel.cx,
    y:
      panel.angle === 90 ? panel.cy + clampAlong(click.y - panel.cy) : panel.cy,
    width: diameter,
    height: diameter,
    label: label || undefined,
  };
}

/** Reinforcement square: fitted to the wall or the hatch outline. */
export function buildReinforcement(
  fit: BlueprintFit | null,
  click: { x: number; y: number },
  color: string,
): BoardElement {
  if (fit?.kind === "hatch") {
    return buildHatchSquare(fit, color);
  }

  // Short wall stubs get a shorter marker instead of overhanging.
  const width = fit
    ? Math.max(16, Math.min(REINFORCEMENT_LENGTH, fit.alongExtent + 4))
    : REINFORCEMENT_LENGTH;
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
  if (fit?.kind === "hatch") {
    return buildHatchCircle(fit, color, label);
  }
  let cx = click.x;
  let cy = click.y;
  let diameter = 28;
  if (fit?.kind === "wall") {
    cx = fit.cx;
    cy = fit.cy;
    diameter = Math.min(34, Math.max(22, fit.thickness * 2.4));
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
