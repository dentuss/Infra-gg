import { XMLParser } from "fast-xml-parser";
import { unzipSync } from "fflate";

import { buildColorResolver } from "./color";
import { extractElements } from "./shapes";
import type { ParsedDeck, ParsedSlide } from "./types";
import {
  attrOf,
  descendants,
  firstDescendant,
  numAttr,
  wrap,
  type PONode,
} from "./xml";

export const BOARD_W = 1600;
export const BOARD_H = 900;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  preserveOrder: true,
});

const decoder = new TextDecoder();

function parseXml(bytes: Uint8Array | undefined): PONode[] | null {
  if (!bytes) return null;
  return parser.parse(decoder.decode(bytes)) as PONode[];
}

/** Relationship id → target path, relative to `ppt/`. */
function relMap(relsDoc: PONode[] | null): Record<string, string> {
  const map: Record<string, string> = {};
  if (!relsDoc) return map;
  for (const rel of descendants(wrap(relsDoc), "Relationship")) {
    const id = attrOf(rel, "Id");
    const target = attrOf(rel, "Target");
    if (id && target) map[id] = "ppt/" + target.replace(/^(\.\.\/)+/, "");
  }
  return map;
}

function relsPathFor(path: string): string {
  const cut = path.lastIndexOf("/");
  return `${path.slice(0, cut)}/_rels/${path.slice(cut + 1)}.rels`;
}

/** Deck slide order comes from `sldIdLst` resolved through presentation rels. */
function slidePaths(
  pres: PONode[],
  presRels: Record<string, string>,
): string[] {
  return descendants(wrap(pres), "p:sldId")
    .map((sldId) => presRels[attrOf(sldId, "r:id") ?? ""])
    .filter((path): path is string => Boolean(path));
}

export function parsePptx(fileBytes: ArrayBuffer): ParsedDeck {
  const files = unzipSync(new Uint8Array(fileBytes));
  const pres = parseXml(files["ppt/presentation.xml"]);
  if (!pres)
    throw new Error("Not a PowerPoint file (missing presentation.xml).");

  const sldSz = firstDescendant(wrap(pres), "p:sldSz");
  const emuW = numAttr(sldSz, "cx") || 9144000;
  const emuH = numAttr(sldSz, "cy") || 5143500;
  const sx = BOARD_W / emuW;
  const sy = BOARD_H / emuH;
  const ptToPx = (BOARD_W * 914400) / emuW / 72;

  const resolve = buildColorResolver(
    parseXml(files["ppt/theme/theme1.xml"]),
    parseXml(files["ppt/slideMasters/slideMaster1.xml"]),
  );

  const presRels = relMap(parseXml(files["ppt/_rels/presentation.xml.rels"]));
  const usedMedia = new Set<string>();
  let unsupported = 0;

  const slides: ParsedSlide[] = slidePaths(pres, presRels).map((path, i) => {
    const doc = parseXml(files[path]);
    const spTree = doc && firstDescendant(wrap(doc), "p:spTree");
    if (!doc || !spTree) {
      return {
        index: i + 1,
        hasMap: false,
        background: null,
        elements: [],
        mediaPaths: [],
      };
    }

    const rmap = relMap(parseXml(files[relsPathFor(path)]));
    const mediaFor = (rId: string): string | null => rmap[rId] ?? null;

    const parsed = extractElements(spTree, {
      sx,
      sy,
      ptToPx,
      resolve,
      mediaFor,
    });
    unsupported += parsed.unsupported;

    // The map is the slide background — it becomes the page's fixed board
    // background (not a draggable element), so the overlays line up on it.
    const bgId = attrOf(
      firstDescendant(firstDescendant(wrap(doc), "p:bg"), "a:blip"),
      "r:embed",
    );
    const bgPath = bgId ? mediaFor(bgId) : null;

    if (bgPath) parsed.mediaPaths.add(bgPath);
    parsed.mediaPaths.forEach((m) => usedMedia.add(m));

    return {
      index: i + 1,
      hasMap: Boolean(bgPath),
      background: bgPath,
      elements: parsed.elements,
      mediaPaths: [...parsed.mediaPaths],
    };
  });

  const media: Record<string, Uint8Array> = {};
  for (const path of usedMedia) {
    if (files[path]) media[path] = files[path];
  }

  return { slides, media, unsupported };
}
