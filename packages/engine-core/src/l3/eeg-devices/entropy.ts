// EEG E8 (plan §7 E8; Q8; P-17): the Entropy reader, State Entropy (SE) and Response Entropy (RE), built from the
// maker's published description, and only from it:
//   [VO04] Viertiö-Oja H, Maja V, Särkelä M, et al. Description of the Entropy algorithm as applied in the Datex-Ohmeda
//          S/5 Entropy Module. Acta Anaesthesiol Scand 2004;48:154–161. "p. n" below is its page n; "Eq n" its Eq n.
// Not the maker's module (Q8): the screen label says it is computed from published components, because parts of the
// method are named in the paper without their numbers (below).
//
// WHAT THE PAPER STATES AND IS FOLLOWED. The spectrum is the DFT of the samples (Eq 1, no taper named) and its squared
// magnitudes (Eq 2); over a range [f1, f2] it is normalised to sum 1 (Eq 3), its Shannon entropy taken (Eq 4) and
// divided by log N[f1, f2], the number of components in the range (Eq 5). R_low = 0.8–32 Hz, R_high = 32–47 Hz (p. 158).
// RE = S[R_low+high] / log N[R_low+high] (Eq 8); SE = S[R_low] / log N[R_low+high] (Eq 7), so RE = SE when R_high holds no
// power, and RE − SE indicates EMG (p. 158). Each frequency is read from its own time window: 1.92 s for 32–47 Hz
// (pp. 155, 158), 60.16 s only below 2 Hz (p. 155); SE's windows run from 60 s to 15 s, RE's from 15.36 s to 1.92 s
// (p. 158). The continuous 0–1 values are shown as whole numbers 0–100 through a monotone spline F (p. 159, Fig. 7);
// only the figure gives F, so its curve is read off the page (the knots below; Fig. 7's own marks — the slope-1 points
// at about 0.47 and 0.89 — are the test's check). A signal with no power is perfectly regular: entropy 0 (p. 158).
//
// WHERE THE PAPER IS SILENT, AND WHAT IS DONE [ENG: device, each named in its constant's tag]:
//  - The set of frequency components. Eq 7 divides SE and RE by ONE count, N[R_low+high], although their windows differ,
//    so both are read on one set of components; and the module's SE tops out at 91 on screen (p. 159), which with F's
//    slope below 1 above ≈ 0.89 (Fig. 7) needs log N[R_low] / log N[R_low+high] < ≈ 0.91: a coarse grid, not the
//    thousands of 0.017-Hz bins a 60-s DFT would give (≈ 0.99 → 99 on screen). So the components are the bins of the
//    shortest window (1/1.92 s = 0.52 Hz), and a longer window is the mean of the 1.92-s periodograms it holds, one every
//    update. On this grid R_low holds 60 components (1.04–31.77 Hz), R_high 29 (32.29–46.88 Hz): SE's top is
//    ln 60 / ln 89 = 0.912, F(0.912) ≈ 93, not the module's 91 (an expected failure in the test, not tuned).
//  - The window between the ends (p. 155: "window lengths between these two extremes"): not published. SE uses 60.16 s
//    below 2 Hz and 15.36 s for 2–32 Hz; RE 15.36 s for 0.8–32 Hz and 1.92 s for 32–47 Hz — only the lengths the paper
//    names, each where it names it.
//  - The update interval: not published; 0.64 s, the module's artefact epoch (p. 160), of which every window is a whole
//    number (1.92 = 3, 15.36 = 24, 60.16 = 94).
//  - Until a window has filled after switch-on, it is the mean of the periodograms it holds so far.
//
// WHAT IS NOT BUILT, AND WHY (the hand-over and docs/guides/known-deviations.md carry these):
//  - Burst suppression (p. 159, Eqs 9–10, after Särkelä 2002): the suppression threshold ("a fixed threshold") and the
//    elliptic filters' orders are not given, and its artefact band is a 75-Hz high-pass at 200 Hz — above this channel's
//    62.5-Hz limit. So no BSR, the suppressed part is not set to zero entropy and the 1-min window for all frequencies
//    while suppression is present (p. 158) never starts: in burst suppression SE and RE read the spectrum as it is.
//  - The Cn_limit modification for R_high (p. 160): Cn_limit's value is not given; Eq 3's single Cn is used.
//  - Artefact rejection (p. 160): electrocautery is checked at 200–1000 kHz and 66–86 Hz (above 62.5 Hz); ECG/pacer
//    subtraction rests on 400-Hz sampling and names no method; the eye/movement stationarity test and its five
//    characteristics and two rule sets are not given. None is built; the impedance flag is the generic reader's.
//
// THE ENGINE'S CHANNEL (plan D2, P-6): one frontal channel at 125 Hz; the module samples at 400 Hz (p. 155). Every range
// SE and RE read ends at 47 Hz (p. 158), below the 62.5-Hz limit, so the 125-Hz channel carries all of R_low and R_high;
// the 1.92-s epoch is 240 samples here (768 at 400 Hz) with the same 0.52-Hz components. What 125 Hz cannot carry is
// listed above: the burst-suppression artefact band (75 Hz at 200 Hz) and the cautery check band (66–86 Hz).
//
// Per reading (every 0.64 s): one 240-point DFT to 50 Hz (≈ 23 000 multiply-adds) and the window means over ≤ 92 rows ×
// 89 components (≈ 10 000): ≈ 0.05 M operations/s. State: plain JSON, ≤ 92 × 89 + 240 numbers, snapshotted with the engine.
import type { EegBandName, EegDeviceSpec, EegReading } from '../../types-eeg.ts';
import { GENERIC_SPEC } from './generic.ts';
import { bandPower, dftOf } from './spectral.ts';

const c = (value: number, unit: string, tag: string, what: string) => ({ value, unit, tag, what });
const G = GENERIC_SPEC.constants;
const FIG7 = '[VO04 Fig. 7, p. 159: the curve read off a 600-dpi render of the page, between its grid lines (± 0.3)]';

// <spec> — every number the reader uses; test/l3/eeg-devices/entropy.test.ts proves none is used outside this block.
export const ENTROPY_SPEC = {
  id: 'entropy',
  label: 'Entropy-type SE and RE, computed from published components', // Q8: not the maker's module
  updateS: 0.64,
  constants: {
    updateS: c(0.64, 's', '[ENG: device; VO04 gives no update interval: its artefact epoch of 0.64 s (p. 160), of which every window it names is a whole number]', 'a reading every update; each adds one 1.92-s periodogram'),
    epochS: c(1.92, 's', '[VO04 p. 155: "the shortest time window is equal to 1.92 s", used for 32–47 Hz; p. 158] [ENG: device; its bins are the components, see the file head]', 'the epoch of each periodogram (Eqs 1–2); 1/1.92 s = 0.52-Hz components'),
    sourceFsHz: c(400, 'Hz', '[VO04 p. 155: "a sampling frequency of 400 Hz is used"] — the engine\'s channel is 125 Hz (P-6); see the file head', 'the module\'s rate (not used: recorded)'),
    seLongS: c(60.16, 's', '[VO04 p. 155: the longest window, 60.16 s, "used only for frequencies below 2 Hz"; p. 158: SE\'s windows from 60 s]', 'SE\'s window below longBelowHz'),
    longBelowHz: c(2, 'Hz', '[VO04 p. 155]', 'below it SE reads the longest window'),
    midS: c(15.36, 's', '[VO04 p. 158: RE\'s longest window 15.36 s; SE\'s "from 60 s to 15 s"; p. 160: 24 × 0.64 = 15.36 s] [ENG: device; the paper does not give the window between its ends: SE 2–32 Hz and RE 0.8–32 Hz use this one]', 'SE\'s window for 2–32 Hz and RE\'s for 0.8–32 Hz'),
    shortS: c(1.92, 's', '[VO04 p. 158: RE\'s shortest window, "applied for frequencies between 32 Hz and 47 Hz, equal to 1.92 s"]', 'RE\'s window for 32–47 Hz'),
    loHz: c(0.8, 'Hz', '[VO04 p. 158: SE "from 0.8 Hz to 32 Hz", RE "from 0.8 Hz to 47 Hz"]', 'the lower edge of R_low'),
    midHz: c(32, 'Hz', '[VO04 p. 158: R_low 0.8–32 Hz, R_high 32–47 Hz] [ENG: device; a component at 32 Hz or above is R_high\'s]', 'R_low\'s upper and R_high\'s lower edge'),
    hiHz: c(47, 'Hz', '[VO04 p. 158: RE to 47 Hz; R_high "from 32 Hz to 47 Hz"]', 'the upper edge of R_high'),
    shownMax: c(100, '', '[VO04 p. 159: "a scale of full integers between 0 and 100"; F maps [0 … 1] to [0 … 100]]', 'F(1)'),
    seTopShown: c(91, '', '[VO04 p. 159: "SE varies between 0 and 91"]', 'the module\'s SE top on screen (recorded; the test compares)'),
    knotX0: c(0.05, '', `${FIG7} [ENG: display; midway between the grid lines, clear of their dashes]`, 'the first interior knot of F'),
    knotDx: c(0.1, '', `${FIG7} [ENG: display; one knot per grid cell]`, 'the spacing of F\'s interior knots'),
    f05: c(1.4, '', FIG7, 'F(0.05)'),
    f15: c(5.3, '', FIG7, 'F(0.15)'),
    f25: c(10.6, '', FIG7, 'F(0.25)'),
    f35: c(17.7, '', FIG7, 'F(0.35)'),
    f45: c(25.9, '', FIG7, 'F(0.45)'),
    f55: c(37.8, '', FIG7, 'F(0.55)'),
    f65: c(54.6, '', FIG7, 'F(0.65)'),
    f75: c(71.7, '', FIG7, 'F(0.75)'),
    f85: c(87.6, '', FIG7, 'F(0.85)'),
    f95: c(97.2, '', FIG7, 'F(0.95)'),
    rawWindowS: G.rawWindowS,
    dsaHistoryS: G.dsaHistoryS,
    dsaMaxHz: G.dsaMaxHz,
    impedanceLimitKOhm: G.impedanceLimitKOhm,
    impedanceUnequalKOhm: G.impedanceUnequalKOhm,
    dsaFloor: c(1e-4, 'µV²/Hz', '[ENG: display; the generic reader\'s floor for the spectrogram\'s dB (generic.ts)]', 'the least power the spectrogram column draws'),
  },
} satisfies EegDeviceSpec;
// </spec>

const K = ENTROPY_SPEC.constants;
const BANDS: readonly EegBandName[] = ['slow', 'delta', 'theta', 'alpha', 'beta', 'gamma'];
const KNOTS_Y = [K.f05, K.f15, K.f25, K.f35, K.f45, K.f55, K.f65, K.f75, K.f85, K.f95].map((k) => k.value);
const KNOTS_X = KNOTS_Y.map((_, i) => K.knotX0.value + i * K.knotDx.value);
/** F's knots: (0, 0) and (1, 100) (p. 159: [0 … 1] onto [0 … 100]) with the curve of Fig. 7 between. */
const FX = [0, ...KNOTS_X, 1];
const FY = [0, ...KNOTS_Y, K.shownMax.value];

/**
 * The tangents of the monotone piecewise-cubic Hermite interpolant through (xs, ys) (Fritsch and Carlson 1980, the
 * standard construction of a monotone spline; VO04 p. 159 names "a particular monotonous spline function" without its
 * kind): secant means inside, the end secants at the ends, zero where the secants change sign, and each pair of tangents
 * pulled inside the circle of radius 3 that keeps the cubic monotone.
 */
function monotoneTangents(xs: readonly number[], ys: readonly number[]): number[] {
  const n = xs.length;
  const d = Array.from({ length: n - 1 }, (_, i) => ((ys[i + 1] as number) - (ys[i] as number)) / ((xs[i + 1] as number) - (xs[i] as number)));
  const m = Array.from({ length: n }, (_, i) => {
    if (i === 0) return d[0] as number;
    if (i === n - 1) return d[n - 2] as number;
    const a = d[i - 1] as number, b = d[i] as number;
    return a * b <= 0 ? 0 : (a + b) / 2;
  });
  for (let i = 0; i < n - 1; i++) {
    const di = d[i] as number;
    if (di === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = (m[i] as number) / di, b = (m[i + 1] as number) / di;
    const r = a * a + b * b;
    if (r > 9) {
      const tau = 3 / Math.sqrt(r);
      m[i] = tau * a * di;
      m[i + 1] = tau * b * di;
    }
  }
  return m;
}
const FM = monotoneTangents(FX, FY);

/** F (p. 159, Fig. 7): the original entropy scale [0 … 1] onto the presented scale [0 … 100], clamped at the ends. */
export function presented(s: number): number {
  const x = Math.min(Math.max(s, 0), 1);
  let i = 0;
  while (i < FX.length - 2 && x > (FX[i + 1] as number)) i++;
  const x0 = FX[i] as number, x1 = FX[i + 1] as number;
  const h = x1 - x0;
  const t = (x - x0) / h;
  const t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * (FY[i] as number) + (t3 - 2 * t2 + t) * h * (FM[i] as number)
    + (-2 * t3 + 3 * t2) * (FY[i + 1] as number) + (t3 - t2) * h * (FM[i + 1] as number);
}

/** Eqs 3–4: the Shannon entropy Σ Pn·log(1/Pn) of the powers p, normalised to sum 1 over them (natural log, as the
 * figures' axes "P·ln(1/P)"); 0 when they hold no power (p. 158: a suppressed signal is perfectly regular). */
export function shannon(p: readonly number[]): number {
  let s = 0;
  for (const v of p) s += v;
  if (!(s > 0)) return 0;
  let h = 0;
  for (const v of p) if (v > 0) h += (v / s) * Math.log(s / v);
  return h;
}

/** The components on the 1.92-s grid (fs, the epoch's N samples): R_low is k = lo … mid − 1, R_high k = mid … hi; SE's
 * longest window for k < long. */
export function componentBins(fs: number, n: number): { lo: number; long: number; mid: number; hi: number } {
  const T = n / fs;
  return { lo: Math.ceil(K.loHz.value * T), long: Math.ceil(K.longBelowHz.value * T), mid: Math.ceil(K.midHz.value * T), hi: Math.floor(K.hiHz.value * T) };
}

/**
 * Eqs 7 and 8 on the original scale: SE = S[R_low] / log N[R_low+high] from SE's spectrum, RE = S[R_low+high] /
 * log N[R_low+high] from RE's. `se` holds R_low's components, `re` R_low's then R_high's.
 */
export function stateResponse(se: readonly number[], re: readonly number[]): { se: number; re: number } {
  const lnN = Math.log(re.length);
  return { se: shannon(se) / lnN, re: shannon(re) / lnN };
}

/** How many periodograms, one per update, a window of `s` seconds holds: (s − epoch) / update + 1. */
export const rowsIn = (s: number) => Math.round((s - K.epochS.value) / K.updateS.value) + 1;

/**
 * SE's and RE's spectra from the periodograms held (rows over the components b.lo … b.hi, newest last): each component's
 * power is the mean of the periodograms in its window (p. 155, p. 158; the file head), or of all held while the window
 * fills. SE: R_low, 60.16 s below 2 Hz and 15.36 s above. RE: R_low at 15.36 s, then R_high at 1.92 s.
 */
export function windowSpectra(rows: readonly (readonly number[])[], b: { lo: number; long: number; mid: number; hi: number }): { se: number[]; re: number[] } {
  const avg = (k: number, count: number) => {
    const rs = rows.slice(-count);
    let a = 0;
    for (const r of rs) a += r[k - b.lo] as number;
    return a / rs.length;
  };
  const longN = rowsIn(K.seLongS.value);
  const midN = rowsIn(K.midS.value);
  const shortN = rowsIn(K.shortS.value);
  const se: number[] = [];
  const re: number[] = [];
  for (let k = b.lo; k <= b.hi; k++) {
    if (k < b.mid) se.push(avg(k, k < b.long ? longN : midN));
    re.push(avg(k, k < b.mid ? midN : shortN));
  }
  return { se, re };
}

export interface EntropyState {
  fs: number;
  /** Samples read since switch-on. */
  n: number;
  /** Readings made (updates closed). */
  k: number;
  /** The last epoch, oldest first. */
  raw: number[];
  /** The samples since the last reading (the raw display). */
  fresh: number[];
  /** One periodogram per update over the components lo … hi (Eq 2: |X|², µV²), newest last; SE's longest window of them. */
  rows: number[][];
}

export function createEntropy(fsHz: number): EntropyState {
  return { fs: fsHz, n: 0, k: 0, raw: [], fresh: [], rows: [] };
}

const r1 = (v: number) => Math.round(v * 10) / 10;

/** Read a block of samples (µV) with the electrode impedances (kΩ); the readings the block completes, in order. */
export function entropyRead(s: EntropyState, samples: ArrayLike<number>, impedanceKOhm: readonly number[]): EegReading[] {
  const out: EegReading[] = [];
  const epochN = Math.round(s.fs * K.epochS.value);
  const stepN = Math.round(s.fs * K.updateS.value);
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i] as number;
    s.raw.push(x);
    if (s.raw.length > epochN) s.raw.shift();
    s.fresh.push(x);
    s.n++;
    if (s.n % stepN === 0) {
      s.k++;
      const r = update(s, impedanceKOhm, epochN);
      if (r) out.push(r);
    }
  }
  return out;
}

function update(s: EntropyState, z: readonly number[], epochN: number): EegReading | null {
  if (s.raw.length < epochN) return null;
  // Eqs 1–2: the DFT of the epoch as it is (no taper, VO04 names none) and its squared magnitudes, to the spectrogram's top
  const T = epochN / s.fs;
  const f = dftOf(s.raw, Math.min(Math.floor(K.dsaMaxHz.value * T), Math.floor(epochN / 2)));
  const p = f.re.map((re, k) => re * re + (f.im[k] as number) ** 2);
  const b = componentBins(s.fs, epochN);
  s.rows.push(p.slice(b.lo, b.hi + 1));
  if (s.rows.length > rowsIn(K.seLongS.value)) s.rows.shift();
  const { se: seSpec, re: reSpec } = windowSpectra(s.rows, b);
  const orig = stateResponse(seSpec, reSpec);
  const se = Math.round(presented(orig.se));
  const re = Math.round(presented(orig.re));
  const hi = Math.max(...z);
  const lo = Math.min(...z);
  const questionable = hi > K.impedanceLimitKOhm.value || hi - lo > K.impedanceUnequalKOhm.value;
  // the display: one-sided PSD of the same epoch, µV²/Hz (rectangular window: Σ PSD·Δf is the epoch's mean square)
  const psd = p.map((v, k) => ((k === 0 ? 1 : 2) * v) / (s.fs * epochN));
  const df = 1 / T;
  const bands = Object.fromEntries(BANDS.map((bn) => [bn, bandPower(psd, df, Math.max(G[`${bn}LoHz`].value, df), G[`${bn}HiHz`].value)])) as Record<EegBandName, number>;
  const perCol = Math.round(K.epochS.value / K.updateS.value);
  const dsa = s.k % perCol === 0 ? { dfHz: df, db: psd.map((v) => r1(10 * Math.log10(Math.max(v, K.dsaFloor.value)))) } : null;
  const raw = s.fresh;
  s.fresh = [];
  return {
    n: s.n,
    numerics: { se, re, reSe: re - se, eegImp: r1(hi) },
    flags: { questionable, invalid: false }, // VO04's artefact rules are not given with their numbers (p. 160): none built
    bands,
    display: { raw, dsa },
  };
}
