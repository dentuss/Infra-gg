import { colorFrom, type ColorResolver } from "./color";
import type { PptxElement } from "./types";
import {
  attrOf,
  firstDescendant,
  kidsOf,
  numAttr,
  tagOf,
  textOf,
  type PONode,
} from "./xml";

export type ParseCtx = {
  /** EMU → board px (x and y scale separately; equal for 16:9). */
  sx: number;
  sy: number;
  ptToPx: number;
  resolve: ColorResolver;
  mediaFor: (rId: string) => string | null;
};

// A group's coordinate transform: slide = a + b·child, applied to nested shapes.
type GroupXf = { ax: number; bx: number; ay: number; by: number };
const IDENTITY: GroupXf = { ax: 0, bx: 1, ay: 0, by: 1 };

function composeGroup(parent: GroupXf, group: PONode): GroupXf {
  const xf = firstDescendant(group, "a:xfrm");
  if (!xf) return parent;
  const off = firstDescendant(xf, "a:off");
  const ext = firstDescendant(xf, "a:ext");
  const chOff = firstDescendant(xf, "a:chOff");
  const chExt = firstDescendant(xf, "a:chExt");
  const bx = numAttr(ext, "cx") / (numAttr(chExt, "cx") || 1);
  const by = numAttr(ext, "cy") / (numAttr(chExt, "cy") || 1);
  const ax = numAttr(off, "x") - numAttr(chOff, "x") * bx;
  const ay = numAttr(off, "y") - numAttr(chOff, "y") * by;
  return {
    ax: parent.ax + parent.bx * ax,
    bx: parent.bx * bx,
    ay: parent.ay + parent.by * ay,
    by: parent.by * by,
  };
}

type Geom = { x: number; y: number; w: number; h: number; rot: number };

/**
 * PowerPoint's `a:off`/`a:ext` box, converted to board units. x/y is the box
 * CENTRE — the board anchors and rotates box elements there too, so a shape's
 * geometry copies straight across with no re-anchoring.
 */
function geom(node: PONode, gt: GroupXf, ctx: ParseCtx): Geom {
  const xf = firstDescendant(node, "a:xfrm");
  const off = firstDescendant(xf, "a:off");
  const ext = firstDescendant(xf, "a:ext");
  const w = gt.bx * numAttr(ext, "cx") * ctx.sx;
  const h = gt.by * numAttr(ext, "cy") * ctx.sy;
  return {
    x: (gt.ax + gt.bx * numAttr(off, "x")) * ctx.sx + w / 2,
    y: (gt.ay + gt.by * numAttr(off, "y")) * ctx.sy + h / 2,
    w,
    h,
    rot: numAttr(xf, "rot") / 60000,
  };
}

function fillColor(node: PONode, ctx: ParseCtx): string | null {
  const spPr = firstDescendant(node, "p:spPr");
  return colorFrom(firstDescendant(spPr, "a:solidFill"), ctx.resolve);
}

/** The shape/picture outline (`<a:ln>`), scaled to board px, or null. */
function strokeOf(
  node: PONode,
  ctx: ParseCtx,
): { color: string; width: number } | null {
  const ln = firstDescendant(firstDescendant(node, "p:spPr"), "a:ln");
  const color = colorFrom(ln, ctx.resolve);
  if (!color) return null;
  return {
    color,
    width: Math.max(1, Math.round((numAttr(ln, "w") || 9525) * ctx.sx)),
  };
}

function pushShape(
  node: PONode,
  gt: GroupXf,
  ctx: ParseCtx,
  out: PptxElement[],
) {
  const g = geom(node, gt, ctx);
  const text = textOf(node);
  const prst = attrOf(firstDescendant(node, "a:prstGeom"), "prst");
  const shapeKind = prst === "ellipse" ? "ellipse" : "rect";
  const fill = fillColor(node, ctx);
  const stroke = strokeOf(node, ctx);
  const box = {
    kind: shapeKind,
    x: g.x,
    y: g.y,
    width: g.w,
    height: g.h,
    rotation: g.rot,
    color: fill ?? "",
    filled: true,
    stroke,
  } as const;

  if (text) {
    if (fill) out.push({ ...box, color: fill });
    const rPr = firstDescendant(node, "a:rPr");
    const size = numAttr(rPr, "sz") || 1200; // hundredths of a point
    // PowerPoint aligns text within the shape box (e.g. the centred numbers in
    // marker circles). The board anchors text at its corner, so carry the box
    // size and alignment through and let the board centre within it.
    const algn = attrOf(firstDescendant(node, "a:pPr"), "algn");
    const anchor = attrOf(firstDescendant(node, "a:bodyPr"), "anchor");
    const align = algn === "ctr" ? "center" : algn === "r" ? "right" : "left";
    const verticalAlign =
      anchor === "ctr" ? "middle" : anchor === "b" ? "bottom" : "top";
    const boxed = align !== "left" || verticalAlign !== "top";
    out.push({
      kind: "text",
      text,
      x: g.x - g.w / 2,
      y: g.y - g.h / 2,
      fontSize: Math.max(8, Math.round((size / 100) * ctx.ptToPx)),
      color: colorFrom(rPr, ctx.resolve),
      // Only carry a box when the text is actually aligned, so plain left/top
      // labels keep their natural (un-wrapped) width.
      ...(boxed ? { width: g.w, height: g.h, align, verticalAlign } : {}),
    });
  } else if (prst && fill) {
    out.push({ ...box, color: fill });
  }
}

function pushPic(
  node: PONode,
  gt: GroupXf,
  ctx: ParseCtx,
  out: PptxElement[],
  media: Set<string>,
) {
  const rId = attrOf(firstDescendant(node, "a:blip"), "r:embed");
  const path = rId ? ctx.mediaFor(rId) : null;
  if (!path) return;
  media.add(path);
  const g = geom(node, gt, ctx);
  out.push({
    kind: "image",
    mediaPath: path,
    name: attrOf(firstDescendant(node, "p:cNvPr"), "title"),
    x: g.x,
    y: g.y,
    width: g.w,
    height: g.h,
    rotation: g.rot,
    stroke: strokeOf(node, ctx),
  });
}

function pushConnector(
  node: PONode,
  gt: GroupXf,
  ctx: ParseCtx,
  out: PptxElement[],
) {
  const g = geom(node, gt, ctx);
  const xf = firstDescendant(node, "a:xfrm");
  const flipH = attrOf(xf, "flipH") === "1";
  const flipV = attrOf(xf, "flipV") === "1";
  const line = firstDescendant(node, "a:ln");
  const hasArrow = ["a:headEnd", "a:tailEnd"].some((end) => {
    const type = attrOf(firstDescendant(node, end), "type");
    return type != null && type !== "none";
  });
  const dx = g.w;
  const dy = g.h;
  const local: [number, number, number, number] = flipH
    ? flipV
      ? [dx, dy, 0, 0]
      : [dx, 0, 0, dy]
    : flipV
      ? [0, dy, dx, 0]
      : [0, 0, dx, dy];
  // The endpoints are box-local (top-left origin); rotate them about the box
  // centre so a rotated connector (e.g. rot=180° to flip an arrow) points the
  // right way. Points are then stored relative to the centre (x/y).
  const rad = (g.rot * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rotate = (px: number, py: number): [number, number] => {
    const cx = px - g.w / 2;
    const cy = py - g.h / 2;
    return [cx * cos - cy * sin, cx * sin + cy * cos];
  };
  const [ax, ay] = rotate(local[0], local[1]);
  const [bx, by] = rotate(local[2], local[3]);
  out.push({
    kind: hasArrow ? "arrow" : "line",
    x: g.x,
    y: g.y,
    points: [ax, ay, bx, by],
    color: colorFrom(line, ctx.resolve),
    strokeWidth: 3,
  });
}

/** Walk a slide's shape tree in order (z-order), flattening groups. */
export function extractElements(spTree: PONode, ctx: ParseCtx) {
  const elements: PptxElement[] = [];
  const media = new Set<string>();
  let unsupported = 0;

  const walk = (nodes: PONode[], gt: GroupXf) => {
    for (const node of nodes) {
      switch (tagOf(node)) {
        case "p:sp":
          pushShape(node, gt, ctx, elements);
          break;
        case "p:pic":
          pushPic(node, gt, ctx, elements, media);
          break;
        case "p:cxnSp":
          pushConnector(node, gt, ctx, elements);
          break;
        case "p:grpSp":
          walk(kidsOf(node), composeGroup(gt, node));
          break;
        case "p:graphicFrame":
          unsupported++;
          break;
      }
    }
  };
  walk(kidsOf(spTree), IDENTITY);

  return { elements, mediaPaths: media, unsupported };
}
