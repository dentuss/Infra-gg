// Minimal navigation over fast-xml-parser's `preserveOrder` tree. Each node is
// an object with one tag key (its children array) plus an optional ":@" key
// holding "@_"-prefixed attributes. Order is preserved, which matters: shape
// order in the slide is the z-order we replay on the board.

export type PONode = Record<string, unknown>;

export function tagOf(node: PONode): string {
  for (const key of Object.keys(node)) {
    if (key !== ":@") return key;
  }
  return "";
}

export function kidsOf(node: PONode): PONode[] {
  const value = node[tagOf(node)];
  return Array.isArray(value) ? (value as PONode[]) : [];
}

export function attrOf(node: PONode | null, name: string): string | null {
  const attrs = node?.[":@"] as Record<string, unknown> | undefined;
  const value = attrs?.["@_" + name];
  return value == null ? null : String(value);
}

export function numAttr(node: PONode | null, name: string): number {
  const raw = attrOf(node, name);
  return raw == null ? 0 : Number(raw);
}

/** Treat an array of top-level nodes as one searchable root. */
export function wrap(nodes: PONode[]): PONode {
  return { "#doc": nodes };
}

export function descendants(node: PONode, tag: string): PONode[] {
  const out: PONode[] = [];
  for (const child of kidsOf(node)) {
    if (tagOf(child) === tag) out.push(child);
    out.push(...descendants(child, tag));
  }
  return out;
}

export function firstDescendant(
  node: PONode | null,
  tag: string,
): PONode | null {
  if (!node) return null;
  for (const child of kidsOf(node)) {
    if (tagOf(child) === tag) return child;
    const found = firstDescendant(child, tag);
    if (found) return found;
  }
  return null;
}

/** Concatenated text of all `<a:t>` runs under a shape. */
export function textOf(node: PONode): string {
  return descendants(node, "a:t")
    .map((run) => {
      const textNode = kidsOf(run).find((child) => "#text" in child);
      return textNode ? String(textNode["#text"]) : "";
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
