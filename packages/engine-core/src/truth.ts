// Stage 7x (R52): prune the engine's pipeline state into a small, structured-clone-safe truth tree for developer
// tools. Read-only: it walks the live state and builds a NEW object; it never writes to what it reads. No clone of
// the whole state is made (the look-ahead already clones it every tick; this walk copies leaves only).
import type { TruthLeaf, TruthTree } from './types-truth.ts';

export const TRUTH_LIMITS = {
  /**
   * Leaf cap [ENG]: a tree cut here stays under the 50 KB budget. Today's tree averages 17 JSON bytes per leaf (keys
   * included); the busy test case (organ sub-trees + 7g's pk with all 58 drugs given) averages 23, so 2 100 leaves ≈
   * 48.7 KB. A typical future tree (12 drugs) is ≈ 1 900 leaves and is not cut.
   */
  maxLeaves: 2100,
  /** Numeric arrays up to this length are kept (per-lung pairs, small vectors); longer ones are buffers or histories. */
  maxNumArray: 8,
  /** Arrays of objects up to this length are kept, keyed by `id`/`drugId`/`agent`/index (per-lung pairs, left/right units); longer ones are beat/breath histories. */
  maxObjArray: 4,
  maxString: 40,
  maxDepth: 10,
} as const;

/** Top-level pipeline keys that are ECG/QRS machinery, not physiology. */
const SKIP_TOP = new Set(['n', 'hrv', 'laneFilter', 'detFilter', 'qrs', 'hrm', 'detections', 'lanes', 'filterMode']);
/** Keys skipped at any depth: event queues and PRNG state. */
const SKIP_ANY = new Set(['out', 'rng']);
/** Stage 7c: `blood.out` is the published chemistry block (Na, K, lactate, Hb…), not an event queue — kept (its twin `blood.core.out` is skipped). */
const KEEP_OUT = new Set(['blood.out']);
/**
 * Sub-trees skipped by their full path: configuration and reference copies, not live physiology — the alarm profile
 * (≈ 2.3 KB of limits and labels) and 7a's copies of the profile parameters (the live ones are `hemo.circ.p`).
 */
const SKIP_PATH = new Set(['dev.alarms.profile', 'hemo.circ.prof', 'hemo.circ.base', 'hemo.circ.ref', 'endo.core.x', 'endo.core.profile', 'resp.temp.env']); // Stage 7e: its input copy, profile and heat calibration
/** Paths are only built as deep as the deepest SKIP_PATH entry, so the walk stays a leaf copy below that. */
const SKIP_PATH_DEPTH = Math.max(...[...SKIP_PATH].map((p) => p.split('.').length));

const leafOf = (v: number): TruthLeaf => (Number.isFinite(v) ? v : String(v));

export function pruneTruth(st: object, dev?: object): { tree: TruthTree; leaves: number; dropped: number; truncated: boolean } {
  let leaves = 0;
  let dropped = 0;
  let truncated = false;
  const take = (): boolean => {
    if (leaves >= TRUTH_LIMITS.maxLeaves) {
      truncated = true;
      return false;
    }
    leaves++;
    return true;
  };
  const walk = (v: unknown, depth: number, path: string): TruthLeaf | TruthLeaf[] | TruthTree | undefined => {
    if (v === null) return take() ? null : undefined;
    switch (typeof v) {
      case 'number':
        return take() ? leafOf(v) : undefined;
      case 'boolean':
        return take() ? v : undefined;
      case 'string':
        return take() ? (v.length > TRUTH_LIMITS.maxString ? `${v.slice(0, TRUTH_LIMITS.maxString)}…` : v) : undefined;
      case 'object':
        break;
      default:
        dropped++; // functions, symbols, bigints, undefined
        return undefined;
    }
    if (ArrayBuffer.isView(v) || v instanceof ArrayBuffer || depth > TRUTH_LIMITS.maxDepth) {
      dropped++;
      return undefined;
    }
    if (Array.isArray(v)) {
      if (v.every((x) => typeof x === 'number')) {
        if (v.length > TRUTH_LIMITS.maxNumArray) {
          dropped++;
          return undefined;
        }
        const out: TruthLeaf[] = [];
        for (const x of v as number[]) if (take()) out.push(leafOf(x));
        return out;
      }
      if (v.length > TRUTH_LIMITS.maxObjArray) {
        dropped++;
        return undefined;
      }
      const out: TruthTree = {};
      v.forEach((item, i) => {
        const o = item as { id?: unknown; drugId?: unknown; agent?: unknown } | null;
        const id = o && typeof o === 'object' ? (o.id ?? o.drugId ?? o.agent) : undefined;
        const w = walk(item, depth + 1, '');
        if (w !== undefined) out[typeof id === 'string' || typeof id === 'number' ? String(id) : String(i)] = w;
      });
      return out;
    }
    const out: TruthTree = {};
    for (const [k, x] of Object.entries(v)) {
      if (SKIP_ANY.has(k) && !(path && KEEP_OUT.has(`${path}.${k}`))) continue; // Stage 7c: KEEP_OUT
      const p = path && depth < SKIP_PATH_DEPTH ? `${path}.${k}` : '';
      if (p && SKIP_PATH.has(p)) continue;
      const w = walk(x, depth + 1, p);
      if (w !== undefined) out[k] = w;
    }
    return out;
  };
  const tree: TruthTree = {};
  // the device layer first: when the leaf cap cuts the walk, it cuts the tail of the physiology, never the devices
  if (dev) {
    const w = walk(dev, 1, 'dev');
    if (w !== undefined) tree.dev = w;
  }
  for (const [k, x] of Object.entries(st)) {
    if (SKIP_TOP.has(k) || SKIP_ANY.has(k)) continue;
    const w = walk(x, 1, k);
    if (w !== undefined) tree[k] = w;
  }
  return { tree, leaves, dropped, truncated };
}
