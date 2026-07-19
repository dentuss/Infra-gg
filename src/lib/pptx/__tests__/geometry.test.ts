import { XMLParser } from "fast-xml-parser";
import { describe, expect, it } from "vitest";

import { extractElements, type ParseCtx } from "@/lib/pptx/shapes";
import { wrap, type PONode } from "@/lib/pptx/xml";

// A 16:9 deck mapped onto the 1600x900 board: 1 EMU square = 1 board px.
const EMU = 9525;
const ctx: ParseCtx = {
  sx: 1 / EMU,
  sy: 1 / EMU,
  ptToPx: 1,
  resolve: (schemeVal) => schemeVal,
  mediaFor: (rId) => (rId === "rId1" ? "ppt/media/image1.png" : null),
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  preserveOrder: true,
});

/** Build a shape tree holding one shape, in board px (converted to EMU). */
function spTree(body: string): PONode {
  const doc = parser.parse(
    `<p:spTree xmlns:p="p" xmlns:a="a">${body}</p:spTree>`,
  ) as PONode[];
  const tree = wrap(doc);
  // wrap() yields the document node; the spTree is its only child.
  return (tree as unknown as { children: PONode[] }).children?.[0] ?? doc[0]!;
}

const xfrm = (x: number, y: number, w: number, h: number, rot = 0) =>
  `<a:xfrm${rot ? ` rot="${rot * 60000}"` : ""}>` +
  `<a:off x="${x * EMU}" y="${y * EMU}"/>` +
  `<a:ext cx="${w * EMU}" cy="${h * EMU}"/></a:xfrm>`;

const shape = (x: number, y: number, w: number, h: number, rot = 0) =>
  `<p:sp><p:spPr>${xfrm(x, y, w, h, rot)}` +
  `<a:prstGeom prst="rect"/><a:solidFill><a:srgbClr val="FF0000"/>` +
  `</a:solidFill></p:spPr></p:sp>`;

const picture = (x: number, y: number, w: number, h: number, rot = 0) =>
  `<p:pic><p:nvPicPr><p:cNvPr title="goyo.png"/></p:nvPicPr>` +
  `<p:blipFill><a:blip r:embed="rId1"/></p:blipFill>` +
  `<p:spPr>${xfrm(x, y, w, h, rot)}</p:spPr></p:pic>`;

describe("PowerPoint box → board element", () => {
  it("anchors a shape at the box centre, not its corner", () => {
    const { elements } = extractElements(spTree(shape(100, 200, 60, 40)), ctx);
    expect(elements[0]).toMatchObject({
      kind: "rect",
      x: 130,
      y: 220,
      width: 60,
      height: 40,
    });
  });

  it("anchors a picture at the box centre", () => {
    const { elements } = extractElements(spTree(picture(10, 20, 30, 50)), ctx);
    expect(elements[0]).toMatchObject({ kind: "image", x: 25, y: 45 });
  });

  /**
   * The bug this whole model exists to prevent: PowerPoint rotates about the
   * centre, so a rotation must not move the box's centre at all.
   */
  it.each([0, 90, 180, -90, -34.4])(
    "keeps the centre fixed under %s° of rotation",
    (rot) => {
      const { elements } = extractElements(
        spTree(shape(100, 200, 60, 40, rot)),
        ctx,
      );
      expect(elements[0]).toMatchObject({ x: 130, y: 220, rotation: rot });
    },
  );

  it("hangs connector points off the box corner", () => {
    const { elements } = extractElements(
      spTree(
        `<p:cxnSp><p:spPr>${xfrm(10, 20, 30, 40)}` +
          `<a:prstGeom prst="straightConnector1"/></p:spPr></p:cxnSp>`,
      ),
      ctx,
    );
    expect(elements[0]).toMatchObject({
      kind: "line",
      x: 10,
      y: 20,
      points: [0, 0, 30, 40],
    });
  });
});
