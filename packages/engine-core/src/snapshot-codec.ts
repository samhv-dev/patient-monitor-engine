// FU-11 (external review F14, browser audit BA03): a snapshot's `state` must survive JSON exactly. The pipeline state
// holds a few numbers JSON cannot carry — empty accumulators (LVAD qMin/qMax = ±Infinity), "not yet measured" markers
// (NaN: the pressure detectors' previous sample, the spontaneous-breathing set point, the IABP's valve-off time) and
// negative zeros — and JSON turns each into null or 0, so a bookmark saved to a file or sent over the relay restored a
// different patient; a key holding `undefined` vanished (the truth tree's `dropped` count changed). The codec copies the
// state and writes each such value as a tagged object { $nf: 'NaN' | 'Infinity' | '-Infinity' | '-0' | 'undefined' };
// decoding copies back. Decoding leaves raw non-finite numbers as they are, so a
// structured-clone snapshot from before this change (same build only — the engine version guards that) still restores.
// No model code changes: the physiology keeps its sentinels; only their transport form is defined here.

/** The tag key. No pipeline state object has a key that starts with `$`. */
export const NF_KEY = '$nf';
type NfTag = 'NaN' | 'Infinity' | '-Infinity' | '-0' | 'undefined';

function tagOf(n: number): NfTag | null {
  if (Number.isNaN(n)) return 'NaN';
  if (n === Infinity) return 'Infinity';
  if (n === -Infinity) return '-Infinity';
  if (n === 0 && Object.is(n, -0)) return '-0';
  return null;
}

const UNTAG: Record<NfTag, number | undefined> = { NaN: Number.NaN, Infinity: Infinity, '-Infinity': -Infinity, '-0': -0, undefined };

/** A deep copy of plain data (objects, arrays, primitives) in which every non-JSON number and `undefined` is a tagged object. */
export function encodeState(v: unknown): unknown {
  if (v === undefined) return { [NF_KEY]: 'undefined' };
  if (typeof v === 'number') {
    const t = tagOf(v);
    return t === null ? v : { [NF_KEY]: t };
  }
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(encodeState);
  if (ArrayBuffer.isView(v) || v instanceof Map || v instanceof Set) throw new TypeError(`snapshot state holds a ${v.constructor.name}, which JSON cannot carry`);
  const out: Record<string, unknown> = {};
  for (const [k, x] of Object.entries(v)) out[k] = encodeState(x);
  return out;
}

/** The inverse of encodeState (a deep copy); raw values pass through unchanged. */
export function decodeState(v: unknown): unknown {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(decodeState);
  const o = v as Record<string, unknown>;
  const keys = Object.keys(o);
  const tag = o[NF_KEY];
  if (keys.length === 1 && typeof tag === 'string' && Object.hasOwn(UNTAG, tag)) return UNTAG[tag as NfTag];
  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = decodeState(o[k]);
  return out;
}
