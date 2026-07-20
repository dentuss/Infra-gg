import { XMLParser } from "fast-xml-parser";
import { describe, expect, it } from "vitest";

import { buildColorResolver } from "@/lib/pptx/color";
import type { PONode } from "@/lib/pptx/xml";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  preserveOrder: true,
});

const theme = (dk2: string): PONode[] =>
  parser.parse(
    `<a:theme xmlns:a="a"><a:themeElements><a:clrScheme name="x">` +
      `<a:dk1><a:srgbClr val="000000"/></a:dk1>` +
      `<a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>` +
      `<a:dk2><a:srgbClr val="${dk2}"/></a:dk2>` +
      `<a:lt2><a:srgbClr val="F3F3F3"/></a:lt2>` +
      `</a:clrScheme></a:themeElements></a:theme>`,
  ) as PONode[];

const master = (map: string): PONode[] =>
  parser.parse(
    `<p:sldMaster xmlns:p="p"><p:clrMap ${map}/></p:sldMaster>`,
  ) as PONode[];

const STANDARD = `bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2"`;
const INVERTED = `bg1="lt1" tx1="dk1" bg2="dk2" tx2="lt2"`; // Google Slides

describe("colour resolver", () => {
  it("folds a bare dk2 onto dk1 for an inverted (Google Slides) map", () => {
    // dk2 is a non-neutral green here, which PowerPoint renders as the dark tx.
    const resolve = buildColorResolver(theme("158158"), master(INVERTED));
    expect(resolve("dk2")).toBe("#000000");
  });

  it("leaves dk2 as itself for a standard map", () => {
    const resolve = buildColorResolver(theme("1F497D"), master(STANDARD));
    expect(resolve("dk2")).toBe("#1F497D");
  });

  it("still resolves mapped names through the map either way", () => {
    const resolve = buildColorResolver(theme("158158"), master(INVERTED));
    expect(resolve("tx1")).toBe("#000000"); // tx1 → dk1
    expect(resolve("bg1")).toBe("#FFFFFF"); // bg1 → lt1
  });
});
