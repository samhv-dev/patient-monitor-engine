// Stage 5.1 measurement helpers: every acceptance number is measured on the generated waveform (continuous kernel
// waveforms at 2 kHz, or 500 Hz lead samples), never read back from a constant.
import { welch, rms } from '../../src/util/dsp.ts';
import { K_STRIDE, WAVE } from '../../src/l2/ecg/kernels.ts';
import { LEAD_IDS, type LeadId } from '../../src/types.ts';
import { kernelLead } from './s5.ts';

export const FS2K = 2000;
const QRS_PRE_S = 0.1; // search window around the R fiducial
const QRS_POST_S = 0.12;

/**
 * Global QRS duration by the tangent method (ms). Per lead: the tangents at the steepest point of the first and of
 * the last limb whose slope reaches 15 % of that lead's steepest slope meet the isoelectric line (0 mV) at the onset
 * and the offset. Leads whose steepest slope is < 30 % of the steepest lead are skipped (near-null leads, where a T
 * wave outranks the QRS). QRS = earliest onset → latest offset over the 12 leads (the usual global measurement).
 * `lead(l, t)` is the noise-free waveform, t in s relative to the same origin as tR (the R fiducial).
 */
export function qrsGlobal(lead: (l: LeadId, t: number) => number, tR: number): { ms: number; on: number; off: number } {
  const n = Math.round((QRS_PRE_S + QRS_POST_S) * FS2K);
  const tt = (i: number) => tR - QRS_PRE_S + i / FS2K;
  const tr = LEAD_IDS.map((l) => {
    const v = Float64Array.from({ length: n + 1 }, (_, i) => lead(l, tt(i)));
    const s = Float64Array.from({ length: n + 1 }, (_, i) => (i === 0 || i === n ? 0 : ((v[i + 1]! - v[i - 1]!) * FS2K) / 2));
    let peak = 0;
    for (let i = 0; i <= n; i++) peak = Math.max(peak, Math.abs(s[i]!));
    return { v, s, peak };
  });
  const smax = Math.max(...tr.map((x) => x.peak));
  let on = Infinity;
  let off = -Infinity;
  for (const { v, s, peak } of tr) {
    if (peak < 0.3 * smax) continue;
    const th = 0.15 * peak;
    let a = 0;
    while (a < n && Math.abs(s[a]!) < th) a++;
    while (a < n && Math.abs(s[a + 1]!) > Math.abs(s[a]!)) a++;
    let b = n;
    while (b > 0 && Math.abs(s[b]!) < th) b--;
    while (b > 0 && Math.abs(s[b - 1]!) > Math.abs(s[b]!)) b--;
    on = Math.min(on, tt(a) - v[a]! / s[a]!);
    off = Math.max(off, tt(b) - v[b]! / s[b]!);
  }
  return { on, off, ms: (off - on) * 1000 };
}

/** qrsGlobal of one beat's kernel list (QRS onset at 0, R fiducial at `tR`). */
export function beatQrs(k: readonly number[], tR: number): { ms: number; on: number; off: number } {
  return qrsGlobal((l, t) => kernelLead(k, l, t), tR);
}

/** Remove < ~1 Hz content with a centred 0.5 s moving average (as s5/vf.test.ts). */
export function detrend(x: ArrayLike<number>): Float64Array {
  const h = 125;
  const n = x.length;
  const out = new Float64Array(n);
  let acc = 0;
  let lo = 0;
  let hi = -1;
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - h);
    const b = Math.min(n - 1, i + h);
    while (hi < b) acc += x[++hi] as number;
    while (lo < a) acc -= x[lo++] as number;
    out[i] = (x[i] as number) - acc / (b - a + 1);
  }
  return out;
}

/** Peak normalised autocorrelation for lags within 0.8–1.25 dominant periods (1/fd) of the detrended signal. */
export function acfAtPeriod(x0: ArrayLike<number>, fs: number, fd: number): number {
  const x = detrend(x0);
  const n = x.length;
  let e = 0;
  for (let i = 0; i < n; i++) e += x[i]! ** 2;
  let best = -1;
  for (let L = Math.floor((0.8 * fs) / fd); L <= Math.ceil((1.25 * fs) / fd); L++) {
    let s = 0;
    for (let i = 0; i + L < n; i++) s += x[i]! * x[i + L]!;
    best = Math.max(best, s / (n - L) / (e / n));
  }
  return best;
}

/** Dominant frequency (1–12 Hz) and −3 dB bandwidth (Hz) of the Welch PSD (nfft 1024, 3-bin smoothed, crossings interpolated). */
export function spectralPeak(x: ArrayLike<number>, fs: number): { fd: number; bw: number } {
  const { f, p } = welch(detrend(x), fs, 1024);
  const sm = new Float64Array(p.length);
  for (let k = 0; k < p.length; k++) sm[k] = (p[Math.max(0, k - 1)]! + p[k]! + p[Math.min(p.length - 1, k + 1)]!) / 3;
  let pk = 0;
  for (let k = 0; k < p.length; k++) if (f[k]! >= 1 && f[k]! <= 12 && sm[k]! > sm[pk]!) pk = k;
  const half = sm[pk]! / 2;
  let a = pk;
  let b = pk;
  while (a > 0 && sm[a - 1]! >= half) a--;
  while (b < p.length - 1 && sm[b + 1]! >= half) b++;
  const df = f[1]! - f[0]!;
  const lo = a > 0 ? f[a]! - (df * (sm[a]! - half)) / (sm[a]! - sm[a - 1]!) : f[a]!;
  const hi = b < p.length - 1 ? f[b]! + (df * (sm[b]! - half)) / (sm[b]! - sm[b + 1]!) : f[b]!;
  return { fd: f[pk]!, bw: hi - lo };
}

/** RMS of a over RMS of b, both detrended. */
export function rmsRatio(a: ArrayLike<number>, b: ArrayLike<number>): number {
  return rms(detrend(a)) / rms(detrend(b));
}

/** The same kernel list without the kernels of one wave code (to isolate that wave's share of the waveform). */
export function without(k: readonly number[], wave: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < k.length; i += K_STRIDE) if (k[i + 6] !== wave) out.push(...k.slice(i, i + K_STRIDE));
  return out;
}

/** Local maxima (value, time) of lead l over [t0, t1] (2 kHz) whose value exceeds `min`. */
export function peaks(k: readonly number[], l: LeadId, t0: number, t1: number, min: number, sign: 1 | -1 = 1): { t: number; v: number }[] {
  const out: { t: number; v: number }[] = [];
  const at = (t: number) => sign * kernelLead(k, l, t);
  for (let t = t0 + 1 / FS2K; t < t1; t += 1 / FS2K) {
    const v = at(t);
    if (v > min && v >= at(t - 1 / FS2K) && v > at(t + 1 / FS2K)) out.push({ t, v: sign * v });
  }
  return out;
}

export { WAVE };
