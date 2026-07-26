// Side-effect-free helpers for skill reference generation, extracted so the
// dotted-path validation can be unit-tested (scripts/generate-skill-refs.ts
// runs generation on execution and cannot be imported from tests directly).

// Parses a documented result field line like:
//   - `result.ime.enabled_ids[]` ...
// into path segments ["ime", "enabled_ids[]"]. Returns null for non-field lines.
export function parseDocumentedResultPath(line: string): string[] | null {
  const match = /^- `result\.([A-Za-z0-9_]+(?:\[\])?(?:\.[A-Za-z0-9_]+(?:\[\])?)*)/.exec(line.trim());
  if (!match) {
    return null;
  }
  return (match[1] as string).split(".");
}

// Every documented dotted path must resolve through the JSON schema, walking
// properties across anyOf/oneOf/allOf branches (nullable fields compile to
// anyOf) and descending into array items for `[]` segments. Validating only
// the first segment would let `result.verify.any_typo` pass.
export function resultPathExists(resultSchemas: readonly unknown[], segments: readonly string[]): boolean {
  let nodes: readonly unknown[] = resultSchemas;
  for (const rawSegment of segments) {
    const isArraySegment = rawSegment.endsWith("[]");
    const key = isArraySegment ? rawSegment.slice(0, -2) : rawSegment;
    let next: unknown[] = [];
    for (const node of nodes) {
      next.push(...propertySchemas(node, key));
    }
    if (isArraySegment) {
      next = next.flatMap((node) => itemSchemas(node));
    }
    if (next.length === 0) {
      return false;
    }
    nodes = next;
  }
  return true;
}

function branchesOf(node: unknown): Record<string, unknown>[] {
  if (typeof node !== "object" || node === null) {
    return [];
  }
  const record = node as Record<string, unknown>;
  const out: Record<string, unknown>[] = [record];
  for (const combinator of ["anyOf", "oneOf", "allOf"]) {
    const branches = record[combinator];
    if (Array.isArray(branches)) {
      for (const branch of branches) {
        out.push(...branchesOf(branch));
      }
    }
  }
  return out;
}

function propertySchemas(node: unknown, key: string): unknown[] {
  const out: unknown[] = [];
  for (const branch of branchesOf(node)) {
    const properties = branch["properties"];
    if (typeof properties === "object" && properties !== null && key in (properties as Record<string, unknown>)) {
      out.push((properties as Record<string, unknown>)[key]);
    }
  }
  return out;
}

function itemSchemas(node: unknown): unknown[] {
  const out: unknown[] = [];
  for (const branch of branchesOf(node)) {
    const items = branch["items"];
    if (Array.isArray(items)) {
      out.push(...items);
    } else if (items !== undefined) {
      out.push(items);
    }
  }
  return out;
}
