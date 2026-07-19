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

function geom(node: PONode, gt: GroupXf, ctx: ParseCtx): Geom {
  const xf = firstDescendant(node, "a:xfrm");
  const off = firstDescendant(xf, "a:off");
  const ext = firstDescendant(xf, "a:ext");
  const slideX = gt.ax + gt.bx * numAttr(off, "x");
  const slideY = gt.ay + gt.by * numAttr(off, "y");
  return {
    x: slideX * ctx.sx,
    y: slideY * ctx.sy,
    w: gt.bx * numAttr(ext, "cx") * ctx.sx,
    h: gt.by * numAttr(ext, "cy") * ctx.sy,
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

  if (text) {
    if (fill) {
      out.push({
        kind: shapeKind,
        ...box(g),
        rotation: g.rot,
        color: fill,
        filled: true,
        stroke,
      });
    }
    const rPr = firstDescendant(node, "a:rPr");
    const size = numAttr(rPr, "sz") || 1200; // hundredths of a point
    out.push({
      kind: "text",
      text,
      x: g.x,
      y: g.y,
      fontSize: Math.max(8, Math.round((size / 100) * ctx.ptToPx)),
      color: colorFrom(rPr, ctx.resolve),
    });
  } else if (prst && fill) {
    out.push({
      kind: shapeKind,
      ...box(g),
      rotation: g.rot,
      color: fill,
      filled: true,
      stroke,
    });
  }
}

function box(g: Geom) {
  return { x: g.x, y: g.y, width: g.w, height: g.h };
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
    ...box(g),
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
  const points: [number, number, number, number] = flipH
    ? flipV
      ? [dx, dy, 0, 0]
      : [dx, 0, 0, dy]
    : flipV
      ? [0, dy, dx, 0]
      : [0, 0, dx, dy];
  out.push({
    kind: hasArrow ? "arrow" : "line",
    x: g.x,
    y: g.y,
    points,
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
