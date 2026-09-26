// R-peak detection for metric fiducials, identical for recorded and generated ECG (brief §9 V1–V3).
// Band-pass 5–15 Hz (zero phase), rectify, threshold at 45 % of the 98th-percentile amplitude of each 10 s block,
// 250 ms refractory, then refine to the extreme of the unfiltered signal within ±40 ms [ENG].
import { quantile } from '../stats.ts';
import { bandpassZeroPhase } from '../templates/dsp.ts';

export function detectR(x: Float64Array, fs: number): number[] {
  const clean = Float64Array.from(x, (v) => (Number.isFinite(v) ? v : 0));
  const f = bandpassZeroPhase(clean, fs, 5, 15);
  const a = Float64Array.from(f, Math.abs);
  const block = Math.round(10 * fs);
  const thr = new Float64Array(a.length);
  for (let b = 0; b < a.length; b += block) {
    const t = 0.45 * quantile(a.subarray(b, Math.min(a.length, b + block)), 0.98);
    thr.fill(t, b, Math.min(a.length, b + block));
  }
  const out: number[] = [];
  const refr = Math.round(0.25 * fs);
  const w = Math.round(0.04 * fs);
  for (let i = 1; i < a.length - 1; i++) {
    const v = a[i] as number;
    if (v < (thr[i] as number) || v < (a[i - 1] as number) || v < (a[i + 1] as number)) continue;
    // polarity of the dominant deflection in this window decides whether R is a max or a min of the raw signal
    let best = i;
    const sign = (f[i] as number) >= 0 ? 1 : -1;
    for (let k = Math.max(0, i - w); k <= Math.min(x.length - 1, i + w); k++) if (sign * (clean[k] as number) > sign * (clean[best] as number)) best = k;
    const last = out[out.length - 1];
    if (last !== undefined && best - last < refr) {
      if (Math.abs(clean[best] as number) > Math.abs(clean[last] as number)) out[out.length - 1] = best;
      continue;
    }
    out.push(best);
  }
  return out;
}
