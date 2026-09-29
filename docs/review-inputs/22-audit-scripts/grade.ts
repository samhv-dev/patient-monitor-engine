// Coverage run BF — automatic grading (research/12 §6 "grading"), copied from research/14-audit-scripts/grade.ts.
// One verdict per cell: the worst of its expect items. band → PL inside / TW or TS outside by direction / WR if the
// sign is opposite; dir → PL when the sign matches and |v| > tol, TW when smaller, WR when opposite; quiet → PL when
// |v| ≤ tol; event → PL when the boolean matches, else WR. A rejected command makes the cell NE; a missing (NaN)
// measure makes it MI. A cell with `ne` is NE whatever its probe arms measured. Every WR/MI/TW/TS/IN is confirmed by
// hand in the report (`hand`).
import type { Cell, Verdict } from './spec.ts';

export interface Graded { id: string; verdict: Verdict; auto: Verdict; notes: string[]; values: Record<string, number | boolean | string>; rejected: string[] }

function one(e: { m: string; lo?: number; hi?: number; dir?: 1 | -1; tol?: number; quiet?: boolean; event?: boolean; invert?: boolean }, v: number | boolean | string | undefined): { verdict: Verdict; note: string } {
  if (v === undefined) return { verdict: 'MI', note: `${e.m}: absent` };
  if (e.event !== undefined) {
    const got = v === true;
    return { verdict: got === e.event ? 'PL' : 'WR', note: `${e.m} = ${got} (expected ${e.event})` };
  }
  const x = typeof v === 'number' ? v : NaN;
  if (!Number.isFinite(x)) return { verdict: 'MI', note: `${e.m}: not a finite number (${String(v)})` };
  if (e.quiet) return { verdict: Math.abs(x) <= (e.tol ?? 0) ? 'PL' : 'WR', note: `${e.m} = ${x} (quiet, tol ±${e.tol ?? 0})` };
  if (e.dir !== undefined) {
    const tol = e.tol ?? 0;
    if (Math.sign(x) !== e.dir) return { verdict: 'WR', note: `${e.m} = ${x} (expected sign ${e.dir})` };
    return { verdict: Math.abs(x) > tol ? 'PL' : 'TW', note: `${e.m} = ${x} (sign ${e.dir}, beyond ${tol})` };
  }
  const lo = e.lo as number;
  const hi = e.hi as number;
  if (x >= lo && x <= hi) return { verdict: 'PL', note: `${e.m} = ${x} in [${lo}, ${hi}]` };
  if (e.invert) return x > hi ? { verdict: 'TW', note: `${e.m} = ${x} above [${lo}, ${hi}] (lower = stronger/faster)` } : { verdict: 'TS', note: `${e.m} = ${x} below [${lo}, ${hi}] (lower = stronger/faster)` };
  const mid = (lo + hi) / 2;
  // a band whose midpoint is negative describes a FALL: less negative = too weak, more negative = too strong
  if (mid < 0) return x > hi ? { verdict: x >= 0 ? 'WR' : 'TW', note: `${e.m} = ${x} above [${lo}, ${hi}]` } : { verdict: 'TS', note: `${e.m} = ${x} below [${lo}, ${hi}]` };
  if (mid > 0) return x < lo ? { verdict: x <= 0 ? 'WR' : 'TW', note: `${e.m} = ${x} below [${lo}, ${hi}]` } : { verdict: 'TS', note: `${e.m} = ${x} above [${lo}, ${hi}]` };
  return { verdict: 'PL', note: `${e.m} = ${x}` };
}

const RANK: Verdict[] = ['PL', 'TW', 'TS', 'IN', 'WR', 'MI', 'NE', 'NM'];
export const worse = (a: Verdict, b: Verdict): Verdict => (RANK.indexOf(a) >= RANK.indexOf(b) ? a : b);

export function grade(cell: Cell, values: Record<string, number | boolean | string>, rejected: string[]): Graded {
  if (cell.ne) return { id: cell.id, verdict: 'NE', auto: 'NE', notes: [cell.ne], values, rejected };
  if (rejected.length) return { id: cell.id, verdict: 'NE', auto: 'NE', notes: [`command rejected: ${rejected.join('; ')}`], values, rejected };
  let v: Verdict = 'PL';
  const notes: string[] = [];
  for (const e of cell.expect) {
    const r = one(e, values[e.m]);
    v = worse(v, r.verdict);
    notes.push(`${r.verdict} ${r.note} [${e.src}]`);
  }
  if (!cell.expect.length) v = 'NM';
  const auto = v;
  if (cell.hand) { notes.push(`HAND ${cell.hand.verdict} (automatic ${v}): ${cell.hand.why}`); v = cell.hand.verdict; }
  return { id: cell.id, verdict: v, auto, notes, values, rejected };
}
