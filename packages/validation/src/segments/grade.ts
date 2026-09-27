// Target grading (R40 borrow #1). errPct = 0 when the target holds, else the distance to the nearest satisfying
// value as a percentage of that value's magnitude. Grades: green = target holds (for EqualTo/TrendsTo: within
// tolPct, default 10 %); yellow = misses by < 30 %; red = misses by ≥ 30 % (or the measurement is missing).
// An evidence band (Range) replaces the 10 % green zone: the band IS the tolerance (R37/R39).
// Gating: red fails `pnpm validate`; yellow is reported and goes to the calibration queue, as red does.
import type { Grade, Ref, Target } from './types.ts';

export const YELLOW_PCT = 30;
export const GREEN_PCT = 10;

export function resolveRef(r: Ref, segValue: (segment: string) => number): number {
  if (typeof r === 'number') return r;
  return segValue(r.segment) * (r.factor ?? 1) + (r.offset ?? 0);
}

const rel = (d: number, ref: number) => (100 * Math.abs(d)) / Math.max(Math.abs(ref), 1e-9);

export function gradeTarget(t: Target, measured: number, ctx: { segValue: (segment: string) => number; firstMeasured?: number }): { errPct: number; grade: Grade; pass: boolean; expected: string } {
  const R = (r: Ref) => resolveRef(r, ctx.segValue);
  let err: number;
  let holds: boolean;
  let expected: string;
  switch (t.type) {
    case 'EqualTo': {
      const v = R(t.value);
      err = rel(measured - v, v);
      holds = err <= (t.tolPct ?? GREEN_PCT);
      expected = `= ${fmt(v)} ±${t.tolPct ?? GREEN_PCT} %`;
      break;
    }
    case 'GreaterThan': {
      const v = R(t.value);
      holds = measured > v;
      err = holds ? 0 : rel(v - measured, v);
      expected = `> ${fmt(v)}`;
      break;
    }
    case 'LessThan': {
      const v = R(t.value);
      holds = measured < v;
      err = holds ? 0 : rel(measured - v, v);
      expected = `< ${fmt(v)}`;
      break;
    }
    case 'Range': {
      const lo = R(t.min);
      const hi = R(t.max);
      holds = measured >= lo && measured <= hi;
      err = holds ? 0 : measured < lo ? rel(lo - measured, lo) : rel(measured - hi, hi);
      expected = `${fmt(lo)}–${fmt(hi)}`;
      break;
    }
    case 'TrendsTo': {
      const v = R(t.value);
      const start = ctx.firstMeasured ?? Number.NaN;
      const closer = !(Math.abs(measured - v) > Math.abs(start - v));
      err = rel(measured - v, v);
      holds = closer && err <= (t.tolPct ?? GREEN_PCT);
      if (!closer) err = Math.max(err, YELLOW_PCT); // moving away is never better than yellow
      expected = `→ ${fmt(v)} ±${t.tolPct ?? GREEN_PCT} %`;
      break;
    }
  }
  if (!Number.isFinite(measured)) return { errPct: Number.POSITIVE_INFINITY, grade: 'red', pass: false, expected };
  const grade: Grade = holds ? 'green' : err < YELLOW_PCT ? 'yellow' : 'red';
  return { errPct: holds ? 0 : err, grade, pass: grade !== 'red', expected };
}

const fmt = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2));
