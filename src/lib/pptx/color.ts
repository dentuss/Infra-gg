import {
  attrOf,
  firstDescendant,
  kidsOf,
  tagOf,
  wrap,
  type PONode,
} from "./xml";

// Sensible defaults so a colour never resolves to nothing (invisible shapes).
const FALLBACK: Record<string, string> = {
  dk1: "#111827",
  dk2: "#374151",
  lt1: "#fafafa",
  lt2: "#e5e7eb",
  accent1: "#ef4444",
  accent2: "#f59e0b",
  accent3: "#22c55e",
  accent4: "#3b82f6",
  accent5: "#a855f7",
  accent6: "#ec4899",
  hlink: "#3b82f6",
  folHlink: "#8b5cf6",
};

export type ColorResolver = (schemeVal: string) => string;

/** Resolve `schemeClr` names through the theme palette + master colour map. */
export function buildColorResolver(
  themeDoc: PONode[] | null,
  masterDoc: PONode[] | null,
): ColorResolver {
  const scheme: Record<string, string> = {};
  const clrScheme = themeDoc && firstDescendant(wrap(themeDoc), "a:clrScheme");
  if (clrScheme) {
    for (const slot of kidsOf(clrScheme)) {
      const name = tagOf(slot).replace(/^a:/, "");
      const hex =
        attrOf(firstDescendant(slot, "a:srgbClr"), "val") ??
        attrOf(firstDescendant(slot, "a:sysClr"), "lastClr");
      if (hex) scheme[name] = "#" + hex;
    }
  }

  const clrMap: Record<string, string> = {};
  const map = masterDoc && firstDescendant(wrap(masterDoc), "p:clrMap");
  const attrs = (map?.[":@"] as Record<string, unknown>) ?? {};
  for (const key of Object.keys(attrs)) {
    clrMap[key.replace("@_", "")] = String(attrs[key]);
  }

  return (val) => {
    const target = clrMap[val] ?? val; // tx1 → dk1, bg1 → lt1, …
    return scheme[target] ?? FALLBACK[target] ?? FALLBACK[val] ?? "#111827";
  };
}

/** First `srgbClr`/`schemeClr` under a container (a fill, a line, a run). */
export function colorFrom(
  container: PONode | null,
  resolve: ColorResolver,
): string | null {
  if (!container) return null;
  const srgb = firstDescendant(container, "a:srgbClr");
  if (srgb) return "#" + attrOf(srgb, "val");
  const scheme = firstDescendant(container, "a:schemeClr");
  const val = attrOf(scheme, "val");
  return val ? resolve(val) : null;
}
