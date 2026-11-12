// The ECG analysis core (defibrillator plan §3.4.2, piece E4a): lead-agnostic measurements on one 3-s segment of the
// samples a device sees. It measures and never decides: the AED's rule and Check Patient (E4b) and the bedside VF
// detector (B1) each keep their own decision on these numbers.
//
// What is measured is the ZOLL M2 guide's list for its AED algorithm [G A-34]: the ECG divided into three-second
// segments; noise, artefact and baseline wander; baseline content at the right frequencies (frequency-domain analysis);
// QRS rate, width and variability; amplitude and temporal regularity (autocorrelation) of peaks and troughs. The guide
// names the measurements and gives no definition, so each definition is a published one, cited where it is computed.
// For the bedside detector the same list is a marked choice (plan §3.4.2): no bedside vendor's algorithm was read.
//
// Sources, read for this piece (12 November 2026):
//   [AM] Amann A, Tratnig R, Unterkofler K. Reliability of old and new ventricular fibrillation detection algorithms
//        for automated external defibrillators. Biomed Eng Online 2005;4:60, doi 10.1186/1475-925X-4-60 (CC BY 2.0;
//        PMC1283146). Its text gives each algorithm's parameters; its equations are images that were not readable as
//        text, so where a formula is the standard form of the cited original rather than read in [AM] it says so.
//   [FI] Figuera C, Irusta U, Morgado E, et al. Machine learning techniques for the detection of shockable rhythms in
//        automated external defibrillators. PLoS One 2016;11(7):e0159654 (CC BY 4.0): the same preprocessing, and
//        "1–30 Hz is a typical AED monitor bandwidth".
//   [G]  ZOLL M2 Operator's Guide 9650-000873-01 Rev. C, p. A-34.
import { highpass, lowpass, type Biquad } from '../ecg-filter.ts';
import { fft } from '../../util/dsp.ts';

/** The analysis segment: "Divides the ECG rhythm into three-second segments" [G A-34]. */
export const SEGMENT_S = 3;

/** Preprocessing [AM, "Preprocessing"; FI]: moving average of order 5, drift high-pass at 1 Hz, Butterworth low-pass at 30 Hz. */
export const PREPROCESS = { movingAverage: 5, highpassHz: 1, lowpassHz: 30 } as const;

export interface SegmentFeatures {
  /** Samples in the segment. */
  n: number;
  /** Peak-to-peak and mean absolute amplitude of the preprocessed segment (mV). */
  ppMv: number;
  meanAbsMv: number;
  /** Fraction of the raw segment's power below the drift cut-off (1 Hz) and above the low-pass corner (30 Hz). */
  baselineFrac: number;
  noiseFrac: number;
  /** Barro's spectral parameters [AM, SPEC]: Ω (Hz), the normalised first moment M, A1, A2, A3. */
  peakHz: number;
  moment: number;
  a1: number;
  a2: number;
  a3: number;
  /** Kuo & Dillman's VF-filter leakage [AM, VF filter]. */
  leakage: number;
  /** Pulses above the threshold-crossing rule [AM, TCI]: count, mean onset interval, rate, mean width, interval CV. */
  pulseCount: number;
  tciMs: number | null;
  ratePerMin: number | null;
  widthMs: number | null;
  intervalCv: number | null;
  /** Highest normalised autocorrelation over the lags of 40–240 /min, and its lag (s). */
  acfPeak: number;
  acfLagS: number;
  /** Zhang's normalised Lempel–Ziv complexity [AM, CPLX]. */
  complexity: number;
}

const copy = (x: ArrayLike<number>): Float64Array => {
  const n = x.length;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = x[i] as number;
  return out;
};

const pow2 = (n: number): number => 2 ** Math.ceil(Math.log2(Math.max(2, n)));

function biquadRun(s: Biquad, x: Float64Array): void {
  let z1 = 0;
  let z2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i] as number;
    const y = s.b0 * v + z1;
    z1 = s.b1 * v - s.a1 * y + z2;
    z2 = s.b2 * v - s.a2 * y;
    x[i] = y;
  }
}

/**
 * [AM] "Preprocessing": the mean is subtracted [FI], then a moving average of order 5 (noise), a 1 Hz high-pass (drift)
 * and a 30 Hz Butterworth low-pass. The order 5 is in samples, as [AM] applied it to 250 and 360 Hz records alike. The
 * filter orders and kinds are not stated: second-order Butterworth sections, causal (a device filters as it records)
 * [ENG: numerics].
 */
export function preprocess(raw: ArrayLike<number>, fs: number): Float64Array {
  const x = copy(raw);
  const n = x.length;
  let m = 0;
  for (let i = 0; i < n; i++) m += x[i] as number;
  m /= n || 1;
  const w = PREPROCESS.movingAverage;
  const y = new Float64Array(n);
  let acc = 0;
  for (let i = 0; i < n; i++) {
    acc += (x[i] as number) - m;
    if (i >= w) acc -= (x[i - w] as number) - m;
    y[i] = acc / Math.min(w, i + 1);
  }
  biquadRun(highpass(PREPROCESS.highpassHz, fs), y);
  biquadRun(lowpass(PREPROCESS.lowpassHz, fs), y);
  return y;
}

/** Peak-to-peak and mean absolute value. */
export function amplitude(x: ArrayLike<number>): { ppMv: number; meanAbsMv: number } {
  let lo = Infinity;
  let hi = -Infinity;
  let s = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i] as number;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
    s += Math.abs(v);
  }
  return x.length > 0 ? { ppMv: hi - lo, meanAbsMv: s / x.length } : { ppMv: 0, meanAbsMv: 0 };
}

/**
 * Noise, artefact and baseline wander [G A-34]: the share of the raw segment's power that the analysis band
 * removes — below the 1 Hz drift cut-off (baseline) and above the 30 Hz corner (noise) [AM; FI]. The bands are the
 * sources'; reading them as power fractions of a Hann-windowed periodogram is a choice [ENG: measurement].
 */
export function bandFractions(raw: ArrayLike<number>, fs: number): { baselineFrac: number; noiseFrac: number } {
  const n = raw.length;
  const nfft = pow2(n);
  const re = new Float64Array(nfft);
  const im = new Float64Array(nfft);
  let m = 0;
  for (let i = 0; i < n; i++) m += raw[i] as number;
  m /= n || 1;
  for (let i = 0; i < n; i++) re[i] = ((raw[i] as number) - m) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / Math.max(1, n - 1)));
  fft(re, im);
  let tot = 0;
  let low = 0;
  let high = 0;
  for (let k = 1; k <= nfft / 2; k++) {
    const p = (re[k] as number) ** 2 + (im[k] as number) ** 2;
    const f = (k * fs) / nfft;
    tot += p;
    if (f < PREPROCESS.highpassHz) low += p;
    if (f > PREPROCESS.lowpassHz) high += p;
  }
  return tot > 0 ? { baselineFrac: low / tot, noiseFrac: high / tot } : { baselineFrac: 0, noiseFrac: 0 };
}

/**
 * Barro's spectral algorithm as [AM] describes it (SPEC): Hamming window, FFT; amplitude = |Re| + |Im|; the peak
 * frequency Ω searched in 0.5–9 Hz; amplitudes below 5 % of Ω's set to zero; the highest frequency examined
 * min(20Ω, 100 Hz). A1 = amplitude 0.5 Hz…Ω/2, A2 = 0.7Ω…1.4Ω, A3 = 0.6 Hz bands about the harmonics 2Ω…8Ω, each over
 * the amplitude 0.5 Hz…min(20Ω, 100 Hz). The moment M = (1/Ω)·Σ aⱼwⱼ / Σ aⱼ over the lines up to that limit is the
 * standard form of Barro's normalised first spectral moment; [AM]'s equation is an image, not read as text
 * [ENG: measurement]. Zero padding to the next power of two [ENG: numerics]. A component at Ω's own band is "waviness at
 * the correct frequencies" [G A-34].
 */
export function spectrum(x: ArrayLike<number>, fs: number): { peakHz: number; moment: number; a1: number; a2: number; a3: number; binHz: number } {
  const n = x.length;
  const nfft = pow2(n);
  const re = new Float64Array(nfft);
  const im = new Float64Array(nfft);
  for (let i = 0; i < n; i++) re[i] = (x[i] as number) * (0.54 - 0.46 * Math.cos((2 * Math.PI * i) / Math.max(1, n - 1)));
  fft(re, im);
  const half = nfft / 2;
  const binHz = fs / nfft;
  const a = new Float64Array(half + 1);
  for (let k = 0; k <= half; k++) a[k] = Math.abs(re[k] as number) + Math.abs(im[k] as number);
  let kp = -1;
  for (let k = 1; k <= half; k++) {
    const f = k * binHz;
    if (f < 0.5 || f > 9) continue;
    if (kp < 0 || (a[k] as number) > (a[kp] as number)) kp = k;
  }
  const zero = { peakHz: 0, moment: 0, a1: 0, a2: 0, a3: 0, binHz };
  if (kp < 0 || (a[kp] as number) <= 0) return zero;
  const omega = kp * binHz;
  const floor = 0.05 * (a[kp] as number);
  for (let k = 0; k <= half; k++) if ((a[k] as number) < floor) a[k] = 0;
  const jmax = Math.min(half, Math.floor(Math.min(20 * omega, 100) / binHz));
  let sa = 0;
  let saw = 0;
  let den = 0;
  let s1 = 0;
  let s2 = 0;
  let s3 = 0;
  for (let k = 1; k <= jmax; k++) {
    const f = k * binHz;
    const v = a[k] as number;
    sa += v;
    saw += v * f;
    if (f < 0.5) continue;
    den += v;
    if (f <= omega / 2) s1 += v;
    if (f >= 0.7 * omega && f <= 1.4 * omega) s2 += v;
    for (let h = 2; h <= 8; h++) if (Math.abs(f - h * omega) <= 0.3) s3 += v;
  }
  if (den <= 0 || sa <= 0) return { ...zero, peakHz: omega };
  return { peakHz: omega, moment: saw / sa / omega, a1: s1 / den, a2: s2 / den, a3: s3 / den, binHz };
}

/**
 * Kuo & Dillman's VF filter as [AM] describes it: the ECG combined with a copy shifted by its mean half period, a
 * narrow band-stop at the mean frequency; the output is the leakage. N = ⌊π·Σ|Vᵢ| / Σ|Vᵢ − Vᵢ₋₁| + ½⌋ and
 * l = Σ|Vᵢ + Vᵢ₋N| / Σ(|Vᵢ| + |Vᵢ₋N|) are the standard forms of the original's equations; [AM]'s equations are images,
 * not read as text [ENG: measurement]. Computed over the whole segment.
 */
export function vfLeakage(x: ArrayLike<number>, _fs: number): { leakage: number; halfPeriod: number } {
  const n = x.length;
  let sAbs = 0;
  let sDiff = 0;
  for (let i = 1; i < n; i++) {
    sAbs += Math.abs(x[i] as number);
    sDiff += Math.abs((x[i] as number) - (x[i - 1] as number));
  }
  if (sDiff <= 0) return { leakage: 0, halfPeriod: 0 };
  const N = Math.max(1, Math.floor((Math.PI * sAbs) / sDiff + 0.5));
  let num = 0;
  let den = 0;
  for (let i = N; i < n; i++) {
    const v = x[i] as number;
    const w = x[i - N] as number;
    num += Math.abs(v + w);
    den += Math.abs(v) + Math.abs(w);
  }
  return { leakage: den > 0 ? num / den : 0, halfPeriod: N };
}

/**
 * QRS rate, width and variability [G A-34] from pulses at Thakor's threshold-crossing rule as [AM] gives it (TCI): the
 * threshold is 20 % of the maximum of each 1-s part, recomputed every second; a pulse is a run above it. Rate =
 * 60 / the mean interval between pulse onsets (the threshold crossing interval); width = the mean pulse duration;
 * variability = the coefficient of variation of those intervals. Thakor's TCI combines the intervals of each 1-s part
 * with the crossings around it; one mean over the 3-s segment, and width and variability read from the same pulses,
 * are choices [ENG: measurement]. A pulse cut by the segment's edge is not counted.
 */
export function pulses(x: ArrayLike<number>, fs: number): { count: number; tciMs: number | null; ratePerMin: number | null; widthMs: number | null; intervalCv: number | null } {
  const n = x.length;
  const part = Math.max(1, Math.round(fs));
  const parts = Math.max(1, Math.floor(n / part));
  const thr = new Float64Array(parts);
  for (let p = 0; p < parts; p++) {
    let mx = -Infinity;
    const end = p === parts - 1 ? n : (p + 1) * part;
    for (let i = p * part; i < end; i++) mx = Math.max(mx, x[i] as number);
    thr[p] = mx > 0 ? 0.2 * mx : Infinity;
  }
  const onsets: number[] = [];
  const widths: number[] = [];
  let start = -1;
  for (let i = 0; i <= n; i++) {
    const above = i < n && (x[i] as number) > (thr[Math.min(parts - 1, Math.floor(i / part))] as number);
    if (above && start < 0) start = i;
    if (!above && start >= 0) {
      if (start > 0 && i < n) {
        onsets.push(start);
        widths.push(i - start);
      }
      start = -1;
    }
  }
  const count = onsets.length;
  const widthMs = count > 0 ? (widths.reduce((s, w) => s + w, 0) / count / fs) * 1000 : null;
  if (count < 2) return { count, tciMs: null, ratePerMin: null, widthMs, intervalCv: null };
  const iv: number[] = [];
  for (let k = 1; k < count; k++) iv.push((((onsets[k] as number) - (onsets[k - 1] as number)) / fs) * 1000);
  const mean = iv.reduce((s, v) => s + v, 0) / iv.length;
  const sd = Math.sqrt(iv.reduce((s, v) => s + (v - mean) ** 2, 0) / iv.length);
  return { count, tciMs: mean, ratePerMin: 60000 / mean, widthMs, intervalCv: sd / mean };
}

/** The lag range of the autocorrelation search: one period at 240 /min to one at 40 /min [ENG: measurement]. */
export const ACF_LAG_S = [0.25, 1.5] as const;

/**
 * Temporal regularity of peaks and troughs, "auto-correlation" [G A-34]. Chen's algorithm (as [AM] gives it) correlates
 * the segment with itself over a rectangular window and tests the regularity of the correlation's peaks; here the
 * measurement is the highest correlation coefficient between the segment and itself shifted by a lag in ACF_LAG_S, and
 * that lag. A Pearson coefficient over the overlap, so a lag's shorter overlap does not lower it [ENG: measurement].
 */
export function autocorrelation(x: ArrayLike<number>, fs: number): { peak: number; lagS: number } {
  const n = x.length;
  const k0 = Math.max(1, Math.round(ACF_LAG_S[0] * fs));
  const k1 = Math.min(n - 2, Math.round(ACF_LAG_S[1] * fs));
  let best = -Infinity;
  let bestK = k0;
  for (let k = k0; k <= k1; k++) {
    const m = n - k;
    let sa = 0;
    let sb = 0;
    for (let i = 0; i < m; i++) {
      sa += x[i] as number;
      sb += x[i + k] as number;
    }
    sa /= m;
    sb /= m;
    let sab = 0;
    let saa = 0;
    let sbb = 0;
    for (let i = 0; i < m; i++) {
      const a = (x[i] as number) - sa;
      const b = (x[i + k] as number) - sb;
      sab += a * b;
      saa += a * a;
      sbb += b * b;
    }
    const r = saa > 0 && sbb > 0 ? sab / Math.sqrt(saa * sbb) : 0;
    if (r > best + 1e-12) {
      best = r;
      bestK = k;
    }
  }
  return k1 < k0 ? { peak: 0, lagS: 0 } : { peak: best, lagS: bestK / fs };
}

/** Lempel–Ziv (1976) complexity counter, Kaspar & Schuster's algorithm (Phys Rev A 1987;36:842). */
function lz76(s: Uint8Array): number {
  const n = s.length;
  if (n < 2) return n;
  let c = 1;
  let l = 1;
  let i = 0;
  let k = 1;
  let kmax = 1;
  for (;;) {
    if (s[i + k - 1] === s[l + k - 1]) {
      k++;
      if (l + k > n) {
        c++;
        break;
      }
    } else {
      if (k > kmax) kmax = k;
      i++;
      if (i === l) {
        c++;
        l += kmax;
        if (l + 1 > n) break;
        i = 0;
        k = 1;
        kmax = 1;
      } else k = 1;
    }
  }
  return c;
}

/**
 * Zhang's complexity measure as [AM] gives it (CPLX): the mean subtracted; Vp and Vn the largest and smallest values;
 * Pc the samples in (0, 0.1·Vp), Nc those in (0.1·Vn, 0); the threshold Td = 0 if Pc + Nc < 0.4·n, else 0.2·Vp if
 * Pc < Nc, else 0.2·Vn; the samples above Td are 1, the rest 0; the string's Lempel–Ziv complexity c(n) normalised as
 * c(n)·log₂n / n, the normalisation of Lempel and Ziv's bound (Zhang 1999; [AM]'s equation is an image, not read as
 * text) [ENG: measurement].
 */
export function lzComplexity(raw: ArrayLike<number>): number {
  const n = raw.length;
  if (n < 2) return 0;
  const x = copy(raw);
  let m = 0;
  for (let i = 0; i < n; i++) m += x[i] as number;
  m /= n;
  let vp = -Infinity;
  let vn = Infinity;
  for (let i = 0; i < n; i++) {
    x[i] = (x[i] as number) - m;
    vp = Math.max(vp, x[i] as number);
    vn = Math.min(vn, x[i] as number);
  }
  let pc = 0;
  let nc = 0;
  for (let i = 0; i < n; i++) {
    const v = x[i] as number;
    if (v > 0 && v < 0.1 * vp) pc++;
    if (v < 0 && v > 0.1 * vn) nc++;
  }
  const td = pc + nc < 0.4 * n ? 0 : pc < nc ? 0.2 * vp : 0.2 * vn;
  const s = new Uint8Array(n);
  for (let i = 0; i < n; i++) s[i] = (x[i] as number) > td ? 1 : 0;
  return (lz76(s) * Math.log2(n)) / n;
}

/**
 * Every measurement of one segment: the raw samples' baseline and noise content, then the preprocessed segment's
 * amplitude, spectrum, leakage, pulses, autocorrelation and complexity. The input is the samples and their rate only:
 * no rhythm identity can reach it.
 */
export function measureSegment(raw: ArrayLike<number>, fs: number): SegmentFeatures {
  const want = Math.round(SEGMENT_S * fs);
  if (raw.length !== want) throw new RangeError(`a segment is ${SEGMENT_S} s = ${want} samples at ${fs} Hz, got ${raw.length}`);
  const r = copy(raw);
  const x = preprocess(r, fs);
  const s = spectrum(x, fs);
  const p = pulses(x, fs);
  const ac = autocorrelation(x, fs);
  return {
    n: want,
    ...amplitude(x),
    ...bandFractions(r, fs),
    peakHz: s.peakHz,
    moment: s.moment,
    a1: s.a1,
    a2: s.a2,
    a3: s.a3,
    leakage: vfLeakage(x, fs).leakage,
    pulseCount: p.count,
    tciMs: p.tciMs,
    ratePerMin: p.ratePerMin,
    widthMs: p.widthMs,
    intervalCv: p.intervalCv,
    acfPeak: ac.peak,
    acfLagS: ac.lagS,
    complexity: lzComplexity(x),
  };
}
