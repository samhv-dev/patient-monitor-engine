// Provenance coverage: every leaf value of a skin must be covered by a provenance entry whose key is the leaf's
// dotted path or a prefix of it (so one entry can cover a whole block that shares a source).
import type { Provenance } from './types.ts';

const SKIP = new Set(['schema', 'kind', 'id', 'label', 'extends', 'provenance', 'base']);

/** Dotted paths of every leaf (arrays are leaves: a list of options is one value). */
export function leafPaths(doc: unknown, prefix = ''): string[] {
  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) return prefix ? [prefix] : [];
  const out: string[] = [];
  for (const [k, v] of Object.entries(doc)) {
    if (!prefix && SKIP.has(k)) continue;
    out.push(...leafPaths(v, prefix ? `${prefix}.${k}` : k));
  }
  return out;
}

/** The provenance key that covers `path` (longest matching prefix), or undefined. */
export function coveringKey(prov: Provenance, path: string): string | undefined {
  const parts = path.split('.');
  for (let n = parts.length; n > 0; n--) {
    const key = parts.slice(0, n).join('.');
    if (key in prov) return key;
  }
  return undefined;
}

/** Leaves with no covering entry, and entries that point at nothing in the document. */
export function provenanceGaps(doc: Record<string, unknown>, prov: Provenance): { uncovered: string[]; dangling: string[] } {
  const leaves = leafPaths(doc);
  const uncovered = leaves.filter((p) => coveringKey(prov, p) === undefined);
  const dangling = Object.keys(prov).filter((k) => !leaves.some((p) => p === k || p.startsWith(`${k}.`)));
  return { uncovered, dangling };
}
