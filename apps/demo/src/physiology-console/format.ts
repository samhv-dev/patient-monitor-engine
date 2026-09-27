// Stage 7x: value, delta and change formatting (monospace table cells).
import type { Leaf } from './flatten.ts';
import type { Meta } from './meta.ts';

/** Decimals by magnitude when the metadata has none: 3 significant figures, at most 3 decimals. */
export function autoDigits(v: number): number {
  const a = Math.abs(v);
  if (a >= 100 || a === 0) return 0;
  if (a >= 10) return 1;
  if (a >= 1) return 2;
  return 3;
}

export function fmtValue(v: Leaf | undefined, m: Pick<Meta, 'digits' | 'scale'>): string {
  if (v === undefined) return '';
  if (v === null) return '—';
  if (typeof v !== 'number') return String(v);
  const x = v * m.scale;
  return x.toFixed(m.digits ?? autoDigits(x));
}

/**
 * Decimals for comparing `a` with `b`: from the larger magnitude, so a value that starts at 0 (a drug's Ce, a bus
 * fraction) is compared at the precision it is displayed with, not at autoDigits(0) = 0 decimals.
 */
const pairDigits = (a: number, b: number, m: Pick<Meta, 'digits' | 'scale'>): number =>
  m.digits ?? autoDigits(Math.max(Math.abs(a), Math.abs(b)) * m.scale);

const MINUS = '−';
/** Signed delta with the value's decimals (Unicode minus); '0' when it rounds to zero. `ref` is the baseline. */
export function fmtDelta(d: number | null, m: Pick<Meta, 'digits' | 'scale'>, ref: number): string {
  if (d === null) return '';
  const x = d * m.scale;
  const s = x.toFixed(pairDigits(ref, ref + d, m));
  if (Number(s) === 0) return '0';
  return x > 0 ? `+${s}` : `${MINUS}${s.slice(1)}`;
}

export type Dir = 'up' | 'down' | 'diff' | null;
/** Relative change that counts as a change [ENG]: HR 70 → 71 (1.4 %) is jitter, phenylephrine's SVR +30–40 % is not. */
export const CHANGE_REL = 0.02;
/**
 * Change against the baseline, for highlighting: numbers must move by ≥ the tolerance — the path's absolute one
 * (`Meta.tol`: pH 0.02, temperature 0.2 °C, saturation one point, PaCO2/EtCO2 2 mmHg, K 0.2, lactate 0.3) or else 2 %
 * of the baseline (beat-to-beat jitter stays quiet) — AND by at least one displayed digit; anything else (strings,
 * booleans, null) highlights when different.
 */
export function changeDir(cur: Leaf | undefined, base: Leaf | undefined, m: Pick<Meta, 'digits' | 'scale' | 'tol'>): Dir {
  if (cur === undefined || base === undefined) return null;
  if (typeof cur === 'number' && typeof base === 'number') {
    if (!Number.isFinite(cur) || !Number.isFinite(base)) return cur === base ? null : 'diff';
    const d = cur - base;
    const step = 10 ** -pairDigits(base, cur, m) / m.scale;
    const tol = m.tol === 'sat' ? (Math.abs(base) > 1.5 ? 1 : 0.01) : (m.tol ?? CHANGE_REL * Math.abs(base));
    if (Math.abs(d) < Math.max(tol, step)) return null;
    return d > 0 ? 'up' : 'down';
  }
  return cur === base ? null : 'diff';
}
