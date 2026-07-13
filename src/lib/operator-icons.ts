import r6operators, { type Operator } from "r6operators";

/**
 * Operator icons ship inside the bundle (r6operators package, MIT) instead
 * of Supabase Storage. Board scenes reference them as `r6op:<id>` so saved
 * JSON stays small and survives package updates.
 */
export const OPERATOR_SRC_PREFIX = "r6op:";

export type OperatorSide = Operator["role"];

export type OperatorIcon = {
  id: string;
  name: string;
  side: OperatorSide;
  src: string;
};

const SIDE_ORDER: OperatorSide[] = ["Attacker", "Defender", "Recruit"];

/** All bundled icons: attackers, defenders, then recruit markers. */
export function listOperatorIcons(): OperatorIcon[] {
  return Object.values<Operator>(r6operators)
    .map((operator) => ({
      id: operator.id,
      name: operator.name,
      side: operator.role,
      src: `${OPERATOR_SRC_PREFIX}${operator.id}`,
    }))
    .sort(
      (a, b) =>
        SIDE_ORDER.indexOf(a.side) - SIDE_ORDER.indexOf(b.side) ||
        a.name.localeCompare(b.name),
    );
}

const dataUrlCache = new Map<string, string>();

export function operatorIconDataUrl(id: string): string | null {
  const cached = dataUrlCache.get(id);
  if (cached) return cached;

  const operator = (r6operators as Record<string, Operator | undefined>)[id];
  const svg = operator?.toSVG();
  if (typeof svg !== "string") return null;

  // Firefox rasterizes dimensionless SVGs as blank on canvas — inject the
  // viewBox size explicitly.
  const sized = svg.replace("<svg", '<svg width="350" height="350"');
  const url = `data:image/svg+xml;utf8,${encodeURIComponent(sized)}`;
  dataUrlCache.set(id, url);
  return url;
}

/** Icon element `src` is either a storage URL or a bundled `r6op:<id>` ref. */
export function resolveIconSrc(src: string): string {
  if (!src.startsWith(OPERATOR_SRC_PREFIX)) return src;
  return operatorIconDataUrl(src.slice(OPERATOR_SRC_PREFIX.length)) ?? src;
}
