// PPG ↔ ABP correspondence (brief §9 V3). Pleth feet are searched AFTER each arterial foot (pulseBeats with the
// arterial feet as the trigger times), so the delay is pleth foot − arterial foot of the same ejection even when the
// finger pulse arrives after the next R (common at HR > 100 under GA; measured on VitalDB while planning).
// Shape: Pearson r of the two median beats, each aligned on its own foot, 0 … 0.8·median beat interval, min–max
// normalised. Count ratio: pleth pulses / arterial pulses (1 in sinus; < 1 when beats do not reach the finger).
import { pulseBeats, type PulseBeat } from './abp.ts';
import { median, pearson } from '../stats.ts';
import type { Wave } from '../datasets/signals.ts';

export interface PpgAbp { delayMs: number[]; shapeR: number; countRatio: number }

function medianBeat(w: Wave, feet: number[], spanS: number, fsOut = 125): Float64Array {
  const n = Math.max(2, Math.round(spanS * fsOut));
  const cols: number[][] = Array.from({ length: n }, () => []);
  for (const f of feet) {
    for (let k = 0; k < n; k++) {
      const i = Math.round((f + k / fsOut) * w.fs);
      if (i >= 0 && i < w.x.length) (cols[k] as number[]).push(w.x[i] as number);
    }
  }
  const m = Float64Array.from(cols, (c) => median(c));
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of m) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  return Float64Array.from(m, (v) => (v - lo) / Math.max(1e-9, hi - lo));
}

export function ppgAbp(abp: Wave, pleth: Wave, rS: number[], abpBeats?: PulseBeat[]): PpgAbp {
  const a = abpBeats ?? pulseBeats(abp.x, abp.fs, rS);
  const aFeet = a.map((b) => b.foot);
  const p = pulseBeats(pleth.x, pleth.fs, aFeet, { searchMs: [10, 700] });
  const delayMs = p.map((b) => 1000 * (b.foot - b.r)).filter((d) => d > 0 && d < 500);
  const ibi = median(aFeet.slice(1).map((t, i) => t - (aFeet[i] as number)));
  const span = 0.8 * (Number.isFinite(ibi) ? ibi : 0.8);
  const inner = (xs: number[]) => xs.slice(1, -1);
  return { delayMs, shapeR: pearson(medianBeat(abp, inner(aFeet), span), medianBeat(pleth, inner(p.map((b) => b.foot)), span)), countRatio: p.length / Math.max(1, a.length) };
}
