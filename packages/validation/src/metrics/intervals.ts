// ECG intervals on a lead-II median beat (brief §9 V5), one method for PTB-XL and for the engine's 12-lead capture:
// - the lead is band-passed 0.5–40 Hz (zero phase, as Stage 5's PTB-XL comparison), then the median beat is taken
//   250 ms before to 450 ms after R (Stage 5's medianBeat, R from detectR);
// - baseline = median of the 250–200 ms pre-R segment (PR/TP region) [ENG];
// - QRS onset/offset: first/last sample within ±150 ms of R where |dV/dt| exceeds 15 % of its peak inside that
//   window [ENG]; P onset: the same rule on the 250–60 ms pre-QRS window with 25 % of that window's slope peak;
//   T end: tangent at the steepest descent after the T peak (or ascent for negative T) meets the baseline
//   (tangent method, Lepeschkin–Surawicz).
// PR = QRS onset − P onset; QRS = offset − onset; QT = T end − QRS onset; QTc Fridericia = QT / RR^(1/3).
import { medianBeat } from '../templates/compare-ptbxl.ts';
import { bandpassZeroPhase } from '../templates/dsp.ts';
import { median } from '../stats.ts';
import { detectR } from './ecg.ts';

export const PRE = 125; // samples at 500 Hz (compare-ptbxl.ts)
export interface Intervals { prMs: number; qrsMs: number; qtMs: number; qtcMs: number; rrS: number }

export function intervalsOf(x: Float64Array, fs = 500): Intervals | null {
  if (fs !== 500) throw new Error('intervalsOf expects 500 Hz');
  const peaks = detectR(x, fs);
  if (peaks.length < 4) return null;
  const rrS = median(peaks.slice(1).map((p, i) => (p - (peaks[i] as number)) / fs));
  const b = medianBeat(bandpassZeroPhase(x, fs, 0.5, 40), peaks);
  const base = median(Array.from(b.subarray(0, 25)));
  const y = Float64Array.from(b, (v) => v - base);
  const d = new Float64Array(y.length);
  for (let i = 1; i < y.length - 1; i++) d[i] = ((y[i + 1] as number) - (y[i - 1] as number)) / 2;
  const R = PRE;
  const w = 75; // ±150 ms
  let dmax = 0;
  for (let i = R - w; i <= R + w; i++) dmax = Math.max(dmax, Math.abs(d[i] as number));
  let on = R;
  for (let i = R - w; i < R; i++) if (Math.abs(d[i] as number) > 0.15 * dmax) { on = i; break; }
  let off = R;
  for (let i = R + w; i > R; i--) if (Math.abs(d[i] as number) > 0.15 * dmax) { off = i; break; }
  // P onset
  let pmax = 0;
  for (let i = Math.max(1, on - 125); i < on - 30; i++) pmax = Math.max(pmax, Math.abs(d[i] as number));
  let pOn = Number.NaN;
  for (let i = Math.max(1, on - 125); i < on - 30; i++) if (Math.abs(d[i] as number) > 0.25 * pmax) { pOn = i; break; }
  // T end by tangent
  let tp = off + 20;
  for (let i = off + 20; i < y.length - 2; i++) if (Math.abs(y[i] as number) > Math.abs(y[tp] as number)) tp = i;
  const sign = (y[tp] as number) >= 0 ? 1 : -1;
  let ts = tp;
  for (let i = tp; i < y.length - 2; i++) if (sign * (d[i] as number) < sign * (d[ts] as number)) ts = i;
  const slope = d[ts] as number;
  const tEnd = Math.abs(slope) > 1e-9 ? ts - (y[ts] as number) / slope : Number.NaN;
  const ms = (n: number) => (n * 1000) / fs;
  const qtMs = ms(tEnd - on);
  return { prMs: ms(on - pOn), qrsMs: ms(off - on), qtMs, qtcMs: qtMs / Math.cbrt(rrS), rrS };
}
