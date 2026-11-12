// EEG E7 (plan §7 E7; Q8; P-16): the BIS-type reader, built from the two papers the owner supplied, and only from them:
//   [CON22] Connor CW. Open reimplementation of the BIS algorithms for depth of anesthesia. Anesth Analg 2022 (author
//           manuscript, PMC). Its Table 1 (manuscript pp. 18–19) is the complete MATLAB code of `openibis`, an open
//           approximation of the A-2000 BIS Engine (r = 0.94 against it, p. 5); "l. n" below is that table's line n.
//   [RAM98] Rampil IJ. A primer for EEG signal processing in anesthesia. Anesthesiology 1998;89:980–1002 (a scan; read
//           as page images, pp. 994–1001: the bispectrum, Table 2 and the BIS section).
// Not the maker's algorithm (Q8): the screen label says it is computed from published components.
//
// WHERE THE TWO PAPERS DIFFER, AND WHICH IS FOLLOWED. RAM98 names the BIS's sub-parameters (Table 2, p. 997: the burst
// suppression ratio, QUAZI, the relative β ratio log(P30–47/P11–20) and the bispectral SynchFastSlow
// log(B0.5–47/B40–47)) and says they are mixed by a proprietary, empirically fitted function (p. 1000) whose weights
// it does not give; it averages over the previous minute (p. 1000; p. 1001: "the previous 60 s of useable data").
// CON22 states a complete method (Table 1): a 5-µV baseline-compensated suppression detector in place of QUAZI (p. 6),
// a sedation component ≈ the β ratio in dB (Eq 1, p. 7: "similar to the property described as the BetaRatio by
// Rampil"), a general-anaesthesia component from the power concentration of 40–47 Hz against 0.5–47 Hz (Eq 2), a
// low/mid weighting and the mixer, over 30-s windows with a 63-s BSR — and finds the BIS "does not appear to depend on
// a bispectral index at all" (abstract). The index follows CON22, the one that states its method completely.
// The bispectral term is RAM98's alone; it is computed here (bispectrum, bicoherence: Eqs 6–8, pp. 994–995) for the
// course tests and the record, and enters no index. Its SynchFastSlow cannot be computed as RAM98 defines it: the
// denominator's area "from 40 to 47 Hz on both axes" (Table 2 footnote) holds only triplets with f1 + f2 ≥ 80 Hz, above
// half of any sampling rate it names (128 Hz, p. 994), where the bispectrum is not defined (p. 994) — and the printed
// ratio of an area to a sub-area of itself could not be negative, as Fig. 16 prints it (−1.35 … −3.1). A marked gap.
//
// THE ENGINE'S CHANNEL (plan D2, P-6): one frontal channel at 125 Hz; openibis "must" have 128 Hz (l. 2). The 2-s
// epoch at 125 Hz is 250 samples, still 0.5-Hz bins (l. 18), and 47 Hz is below the 62.5-Hz limit, so every band
// either paper uses is in the signal. The 0.5-s stride is 62.5 samples: readings fall at the samples ⌈k·62.5⌉
// (strides of 63 and 62, 0.5 s on average) and the sawtooth template is the stride rounded, 63 samples [ENG: device].
// The suppression second and the PSD epoch both end at the newest sample (in l. 10 and l. 23 the suppression second
// ends a quarter-second after the epoch, 31.25 samples here) [ENG: device; 0.25 s of latency avoided].
//
// MATLAB functions Table 1 calls without defining them, written from their standard definitions (named, not defined, in
// the source): butter, filter, blackman (spectral.ts), movmean (a window that shrinks at the start), prctile
// (percentiles at 100·(i − 0.5)/n, linear between, clamped), trimmean (k = round(n·percent/200) dropped at each end),
// movvar and std(·, 1) (normalised by n), conv 'valid', interp1 (linear). nanmean / NaN rows: CON22 p. 6, "epochs
// containing burst suppression are excluded when calculating time-averages for the other components".
//
// Per reading (every 0.5 s): one 250-point DFT to 50 Hz (≈ 25 000 multiply-adds), the sawtooth match (≈ 24 000), the
// 30-s averages over ≤ 60 × 95 bins (≈ 12 000): ≈ 0.12 M operations/s, about twice the generic reader's.
// State: plain JSON (no NaN: an excluded epoch is null), ≈ 6 300 numbers, snapshotted with the engine.
import type { EegBandName, EegDeviceSpec, EegReading } from '../../types-eeg.ts';
import { GENERIC_SPEC } from './generic.ts';
import { bandPower, blackman, butterHighpass2, detrend, dftOf } from './spectral.ts';

const c = (value: number, unit: string, tag: string, what: string) => ({ value, unit, tag, what });
const G = GENERIC_SPEC.constants;

// <spec> — every number the reader uses; tests/l3/eeg-devices/bis-type.test.ts proves none is used outside this block.
export const BIS_TYPE_SPEC = {
  id: 'bisType',
  label: 'BIS-type index, computed from published components', // Q8: not the maker's algorithm
  updateS: 0.5,
  constants: {
    updateS: c(0.5, 's', '[CON22 Table 1 l. 2: stride 0.5 s; p. 4: "recalculates … after every half-second"]', 'a reading every stride'),
    epochS: c(2, 's', '[CON22 Table 1 l. 21: 2-s epochs, 4 strides; RAM98 p. 1000: epochs of 2-s duration]', 'the epoch each spectrum is computed from'),
    binHz: c(0.5, 'Hz', '[CON22 Table 1 l. 18: 0.5-Hz bins]', 'the spectral resolution (1 / epoch)'),
    sourceFsHz: c(128, 'Hz', '[CON22 Table 1 l. 2: "must be 128 Hz"] — the engine\'s channel is 125 Hz (P-6); see the file head', 'the rate openibis is written for (not used: recorded)'),
    rawWindowS: G.rawWindowS,
    dsaHistoryS: G.dsaHistoryS,
    dsaMaxHz: G.dsaMaxHz,
    hpHz: c(0.65, 'Hz', '[CON22 Table 1 l. 16: second-order high-pass Butterworth at 0.65 Hz]', 'the high-pass before the spectra'),
    suppressSegS: c(1, 's', '[CON22 Table 1 l. 10: "two half-second strides (1 second)"]', 'the segment tested for suppression'),
    suppressUv: c(5, 'µV', '[CON22 Table 1 l. 11: "all samples are within 5 uV of baseline"; p. 6]', 'the suppression threshold about the segment\'s own line'),
    bsrWindowS: c(63, 's', '[CON22 Table 1 l. 13: "the previous 63 sec"]', 'the burst suppression rate\'s window'),
    bsLookbackS: c(2, 's', '[CON22 Table 1 l. 22, l. 60: an epoch (4 strides) with any suppressed stride is excluded]', 'how far back a suppressed stride excludes the spectrum'),
    componentS: c(30, 's', '[CON22 Table 1 l. 28: "the most recent thirty seconds"]', 'the components\' window'),
    sawLenS: c(0.5, 's', '[CON22 Table 1 l. 40: a template of nStride samples] [ENG: device; 62.5 → 63 samples at 125 Hz]', 'the sawtooth template\'s length'),
    sawRampN: c(5, 'samples', '[CON22 Table 1 l. 40: zeros then 1:5]', 'the template\'s ramp'),
    sawVarUv2: c(10, 'µV²', '[CON22 Table 1 l. 44: v > 10]', 'the least variance a sawtooth match counts at'),
    sawMatch: c(0.63, 'fraction', '[CON22 Table 1 l. 44: > 0.63]', 'the normalised match that detects a K-complex'),
    sawF1Hz: c(3, 'Hz', '[CON22 Table 1 l. 19: piecewise(f, [0,3,6], [0,0.25,1]).^2]', 'the K-complex filter\'s middle point'),
    sawG1: c(0.25, 'fraction', '[CON22 Table 1 l. 19]', 'its amplitude there (squared on use)'),
    sawF2Hz: c(6, 'Hz', '[CON22 Table 1 l. 19]', 'above it the filter passes all'),
    vhighLoHz: c(40, 'Hz', '[CON22 Table 1 l. 29: bandRange(39.5,46.5) × bandRange(40,47), P(n − 1)·P(n) for n from 40 Hz; Fig. 3: very high band 40–47 Hz]', 'the very high band\'s power concentration: its lowest n'),
    topHz: c(47, 'Hz', '[CON22 Table 1 l. 29, 30, 32; RAM98 Table 2: 47 Hz]', 'the top of the high, very high and whole bands'),
    wholeLoHz: c(1, 'Hz', '[CON22 Table 1 l. 30: bandRange(0.5,46.5) × bandRange(1,47), P(n − 1)·P(n) for n from 1 Hz (the 0.5–47 Hz spectrum)]', 'the whole spectrum\'s power concentration: its lowest n'),
    midLoHz: c(11, 'Hz', '[CON22 Table 1 l. 31; RAM98 Table 2: P11–20]', 'the mid band, lower edge'),
    midHiHz: c(20, 'Hz', '[CON22 Table 1 l. 31; RAM98 Table 2]', 'the mid band, upper edge'),
    midPrct: c(50, '%', '[CON22 Table 1 l. 31: prctmean(…, 50, 100)]', 'the mid band\'s bins averaged from this percentile up'),
    highLoHz: c(30, 'Hz', '[CON22 Table 1 l. 32; Eq 1; RAM98 Table 2: P30–47]', 'the high band, lower edge'),
    lowLoHz: c(0.5, 'Hz', '[CON22 Table 1 l. 34]', 'the low band, lower edge'),
    lowHiHz: c(4, 'Hz', '[CON22 Table 1 l. 34]', 'the low band, upper edge'),
    trimPct: c(50, '%', '[CON22 Table 1 l. 33: trimmean(…, 50)]', 'the general component\'s trimmed mean'),
    sedE0: c(104.4, '', '[CON22 Table 1 l. 46: scurve(c1, 104.4, 49.4, −13.9, 5.29)]', 'sedation score: Eo'),
    sedEmax: c(49.4, '', '[CON22 Table 1 l. 46]', 'sedation score: Emax'),
    sedX50: c(-13.9, 'dB', '[CON22 Table 1 l. 46]', 'sedation score: x50'),
    sedW: c(5.29, 'dB', '[CON22 Table 1 l. 46]', 'sedation score: width'),
    genX0: c(-60.89, 'dB', '[CON22 Table 1 l. 47: piecewise(c2, [−60.89, −30], [−40, 43.1])]', 'general score, linear region: from'),
    genX1: c(-30, 'dB', '[CON22 Table 1 l. 47, 48]', 'general score, linear region: to; the S-curve adds from here'),
    genY0: c(-40, '', '[CON22 Table 1 l. 47]', 'general score at genX0'),
    genY1: c(43.1, '', '[CON22 Table 1 l. 47]', 'general score at genX1'),
    genE0: c(61.3, '', '[CON22 Table 1 l. 48: scurve(c2, 61.3, 72.6, −24.0, 3.55)]', 'general S-curve: Eo'),
    genEmax: c(72.6, '', '[CON22 Table 1 l. 48]', 'general S-curve: Emax'),
    genX50: c(-24, 'dB', '[CON22 Table 1 l. 48]', 'general S-curve: x50'),
    genW: c(3.55, 'dB', '[CON22 Table 1 l. 48]', 'general S-curve: width'),
    bsrScore0: c(50, '', '[CON22 Table 1 l. 49: piecewise(BSR, [0,100], [50,0]); p. 6: "exactly 50 – BSR/2"]', 'the BSR score at no suppression'),
    gwHiDb: c(5, 'dB', '[CON22 Table 1 l. 50: piecewise(c3, [0,5], [0.5,1]); Fig. 3E: "≤ 5 dBμV"]', 'low − mid at which the general score takes all the weight'),
    gwLo: c(0.5, 'fraction', '[CON22 Table 1 l. 50]', 'the general weight at low − mid ≤ 0'),
    bwLoPct: c(10, '%', '[CON22 Table 1 l. 51: piecewise(BSR, [10,50], [0,1])]', 'the BSR from which its score takes weight'),
    bwHiPct: c(50, '%', '[CON22 Table 1 l. 51; p. 6: "when the BSR is at least 50%"]', 'the BSR at which its score is the output'),
    outX0: c(-40, '', '[CON22 Table 1 l. 53: piecewise(x, [−40,10,97,110], [0,10,97,100]); Fig. 3F]', 'the compression\'s lowest input (→ 0)'),
    outLo: c(10, '', '[CON22 Table 1 l. 53]', 'below it the output is compressed'),
    outHi: c(97, '', '[CON22 Table 1 l. 53]', 'above it the output is compressed'),
    outX3: c(110, '', '[CON22 Table 1 l. 53]', 'the compression\'s highest input (→ 100)'),
    impedanceLimitKOhm: G.impedanceLimitKOhm,
    impedanceUnequalKOhm: G.impedanceUnequalKOhm,
    bicAvgS: c(60, 's', '[RAM98 p. 1000: "a running average against those calculated in the previous minute"; p. 1001]', 'the bispectrum\'s average'),
    bicLoHz: c(0.5, 'Hz', '[RAM98 Table 2: B0.5–47.0 Hz]', 'the bispectral area, lower edge'),
    bicHiHz: c(47, 'Hz', '[RAM98 Table 2]', 'the bispectral area, upper edge (f1 + f2 ≤ fs/2: p. 994)'),
    dsaFloor: c(1e-4, 'µV²/Hz', '[ENG: display; the generic reader\'s floor for the spectrogram\'s dB (generic.ts)]', 'the least power the spectrogram column draws'),
  },
} satisfies EegDeviceSpec;
// </spec>

const K = BIS_TYPE_SPEC.constants;
const BANDS: readonly EegBandName[] = ['slow', 'delta', 'theta', 'alpha', 'beta', 'gamma'];

/** Linear interpolation on a piecewise-linear curve, clamped to its ends (MATLAB interp1 of `piecewise`, l. 63). */
export function piecewise(x: number, xp: readonly number[], yp: readonly number[]): number {
  const b = Math.min(Math.max(x, xp[0] as number), xp[xp.length - 1] as number);
  for (let i = 1; i < xp.length; i++) {
    const x1 = xp[i] as number;
    if (b <= x1) {
      const x0 = xp[i - 1] as number;
      const y0 = yp[i - 1] as number;
      return x1 === x0 ? y0 : y0 + ((b - x0) / (x1 - x0)) * ((yp[i] as number) - y0);
    }
  }
  return yp[yp.length - 1] as number;
}
/** The logistic S-curve, l. 64: Eo − Emax / (1 + e^((x − x50)/width)). */
export const scurve = (x: number, e0: number, emax: number, x50: number, w: number): number => e0 - emax / (1 + Math.exp((x - x50) / w));

/** MATLAB prctile: sorted values at percentiles 100·(i − 0.5)/n, linear between, clamped at the ends. */
function prctile(sorted: readonly number[], p: number): number {
  const n = sorted.length;
  const pos = (p / 100) * n - 1 / 2; // 0-based
  if (pos <= 0) return sorted[0] as number;
  if (pos >= n - 1) return sorted[n - 1] as number;
  const i = Math.floor(pos);
  return (sorted[i] as number) + (pos - i) * ((sorted[i + 1] as number) - (sorted[i] as number));
}
/** l. 62 prctmean(x, lo, 100): the mean of the values from the lo-th percentile up. */
function prctmeanUp(x: readonly number[], lo: number): number {
  const s = [...x].sort((a, b) => a - b);
  const v = prctile(s, lo);
  const keep = s.filter((y) => y >= v);
  return keep.reduce((a, b) => a + b, 0) / keep.length;
}
/** MATLAB trimmean(x, pct): drop round(n·pct/200) values at each end, mean of the rest. */
function trimmean(x: readonly number[], pct: number): number {
  const s = [...x].sort((a, b) => a - b);
  const k = Math.round((s.length * pct) / (2 * 100));
  const keep = s.slice(k, s.length - k);
  return keep.reduce((a, b) => a + b, 0) / keep.length;
}
const mean = (x: readonly number[]) => x.reduce((a, b) => a + b, 0) / x.length;
const bin = (hz: number) => Math.round(hz / K.binHz.value);

/** l. 39–44: whether the epoch holds a strong sawtooth-shaped K-complex (either direction). */
export function sawtoothDetector(x: readonly number[], len: number): boolean {
  const saw = Array.from({ length: len }, (_, i) => Math.max(0, i - (len - K.sawRampN.value) + 1));
  const sm = mean(saw);
  const sd = Math.sqrt(mean(saw.map((v) => (v - sm) ** 2)));
  const z = saw.map((v) => (v - sm) / sd);
  for (let r = 0; r < x.length - len; r++) {
    let s1 = 0, s2 = 0, m = 0;
    for (let j = 0; j < len; j++) {
      const v = x[r + j] as number;
      s1 += v * (z[j] as number); // conv(eeg, flipud(saw), 'valid'): the template as drawn
      s2 += v * (z[len - 1 - j] as number); // conv(eeg, saw, 'valid'): the template reversed
      m += v;
    }
    m /= len;
    let vr = 0;
    for (let j = 0; j < len; j++) vr += ((x[r + j] as number) - m) ** 2;
    vr /= len; // movvar(…, 1): normalised by n
    if (vr > K.sawVarUv2.value && Math.max((s1 / len) ** 2, (s2 / len) ** 2) / vr > K.sawMatch.value) return true;
  }
  return false;
}

/** The components of l. 28–34 over the window's non-excluded spectra (rows: bins 0 … 47 Hz, µV²/Hz). */
export function components(rows: ReadonlyArray<readonly number[] | null>): { beta: number; conc: number; lowMid: number } | null {
  const ok = rows.filter((r): r is readonly number[] => r !== null);
  if (ok.length === 0) return null;
  const db = (v: number) => 10 * Math.log10(v);
  const top = bin(K.topHz.value);
  const conc = (r: readonly number[], lo: number) => {
    let s = 0;
    for (let k = bin(lo); k <= top; k++) s += (r[k - 1] as number) * (r[k] as number); // Eq 2: P(n − 1)·P(n)
    return Math.sqrt(s / (top - bin(lo) + 1));
  };
  const bandDb = (lo: number, hi: number) => mean(ok.flatMap((r) => r.slice(bin(lo), bin(hi) + 1).map(db))); // l. 55
  const midBins: number[] = [];
  for (let k = bin(K.midLoHz.value); k <= bin(K.midHiHz.value); k++) midBins.push(mean(ok.map((r) => db(r[k] as number))));
  const mid = prctmeanUp(midBins, K.midPrct.value);
  return {
    beta: bandDb(K.highLoHz.value, K.topHz.value) - mid,
    conc: trimmean(ok.map((r) => db(conc(r, K.vhighLoHz.value) / conc(r, K.wholeLoHz.value))), K.trimPct.value),
    lowMid: bandDb(K.lowLoHz.value, K.lowHiHz.value) - mid,
  };
}

/** l. 45–53, the mixer; with no component left (every spectrum of the window excluded) the BSR score alone where its
 * weight is whole (CON22 p. 6: "exactly 50 – BSR/2 when the BSR is at least 50%"), else no index. */
export function mixer(comp: { beta: number; conc: number; lowMid: number } | null, bsr: number): number | null {
  const bsrScore = piecewise(bsr, [0, 100], [K.bsrScore0.value, 0]);
  const bsrWeight = piecewise(bsr, [K.bwLoPct.value, K.bwHiPct.value], [0, 1]);
  if (!comp) return bsrWeight === 1 ? bsrScore : null;
  const sed = scurve(comp.beta, K.sedE0.value, K.sedEmax.value, K.sedX50.value, K.sedW.value);
  let gen = piecewise(comp.conc, [K.genX0.value, K.genX1.value], [K.genY0.value, K.genY1.value]);
  if (comp.conc >= K.genX1.value) gen += scurve(comp.conc, K.genE0.value, K.genEmax.value, K.genX50.value, K.genW.value);
  const gw = gen < sed ? piecewise(comp.lowMid, [0, K.gwHiDb.value], [K.gwLo.value, 1]) : 0;
  const x = sed * (1 - gw) + gen * gw;
  const out = [K.outX0.value, K.outLo.value, K.outHi.value, K.outX3.value];
  return piecewise(x, out, [0, K.outLo.value, K.outHi.value, 100]) * (1 - bsrWeight) + bsrScore * bsrWeight;
}

export interface BisTypeState {
  fs: number;
  /** Samples read since switch-on; readings made (strides closed). */
  n: number;
  k: number;
  /** The high-pass filter's two delays (transposed direct form II). */
  z1: number;
  z2: number;
  /** The last epoch, raw and high-passed, oldest first. */
  raw: number[];
  hp: number[];
  /** The samples since the last reading (the raw display). */
  fresh: number[];
  /** One flag per stride: its second was suppressed (the last 63 s). */
  bsr: boolean[];
  /** One spectrum per stride, 0–47 Hz, µV²/Hz; null when excluded (suppression) (the last 30 s). */
  rows: Array<number[] | null>;
}

export function createBisType(fsHz: number): BisTypeState {
  return { fs: fsHz, n: 0, k: 0, z1: 0, z2: 0, raw: [], hp: [], fresh: [], bsr: [], rows: [] };
}

const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;
const fin = (v: number | null | undefined) => (v === null || v === undefined || !Number.isFinite(v) ? null : v);

/** Read a block of samples (µV) with the electrode impedances (kΩ); the readings the block completes, in order. */
export function bisTypeRead(s: BisTypeState, samples: ArrayLike<number>, impedanceKOhm: readonly number[]): EegReading[] {
  const out: EegReading[] = [];
  const { b, a } = butterHighpass2(K.hpHz.value, s.fs);
  const epochN = Math.round(s.fs * K.epochS.value);
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i] as number;
    const y = b[0] * x + s.z1; // MATLAB filter(): transposed direct form II, from rest at switch-on
    s.z1 = b[1] * x - a[0] * y + s.z2;
    s.z2 = b[2] * x - a[1] * y;
    s.raw.push(x);
    s.hp.push(y);
    if (s.raw.length > epochN) {
      s.raw.shift();
      s.hp.shift();
    }
    s.fresh.push(x);
    s.n++;
    if (s.n === Math.ceil((s.k + 1) * s.fs * K.updateS.value)) {
      s.k++;
      const r = update(s, impedanceKOhm, epochN);
      if (r) out.push(r);
    }
  }
  return out;
}

function update(s: BisTypeState, z: readonly number[], epochN: number): EegReading | null {
  // l. 10–11: the newest second is suppressed if every sample lies within 5 µV of its own straight line
  const segN = Math.round(s.fs * K.suppressSegS.value);
  if (s.raw.length >= segN) {
    s.bsr.push(detrend(s.raw.slice(-segN)).every((v) => Math.abs(v) <= K.suppressUv.value));
    const keep = Math.round(K.bsrWindowS.value / K.updateS.value);
    if (s.bsr.length > keep) s.bsr.shift();
  }
  if (s.raw.length < epochN) return null;
  // l. 22–27, 36–38: the epoch's spectrum (Blackman, its line removed), µV²/Hz; excluded if a stride of it was suppressed
  const w = blackman(epochN);
  const u = w.reduce((p, q) => p + q * q, 0);
  const dsaTop = Math.floor(K.dsaMaxHz.value / K.binHz.value);
  const f = dftOf(detrend(s.hp).map((v, i) => v * (w[i] as number)), dsaTop);
  const psd = f.re.map((re, k) => ((k === 0 ? 1 : 2) * (re * re + (f.im[k] as number) ** 2)) / (s.fs * u));
  const exN = Math.round(K.bsLookbackS.value / K.updateS.value);
  const excluded = s.bsr.length < exN || s.bsr.slice(-exN).some(Boolean);
  let row: number[] | null = null;
  if (!excluded) {
    row = psd.slice(0, bin(K.topHz.value) + 1);
    if (sawtoothDetector(s.raw, Math.round(s.fs * K.sawLenS.value))) {
      row = row.map((p, k) => p * piecewise(k * K.binHz.value, [0, K.sawF1Hz.value, K.sawF2Hz.value], [0, K.sawG1.value, 1]) ** 2);
    }
  }
  s.rows.push(row);
  const keepRows = Math.round(K.componentS.value / K.updateS.value);
  if (s.rows.length > keepRows) s.rows.shift();
  const bsr = (100 * s.bsr.filter(Boolean).length) / Math.max(1, s.bsr.length); // movmean over the available strides
  const comp = components(s.rows);
  const index = fin(mixer(comp, bsr));
  const hi = Math.max(...z);
  const lo = Math.min(...z);
  const questionable = hi > K.impedanceLimitKOhm.value || hi - lo > K.impedanceUnequalKOhm.value;
  const bands = Object.fromEntries(BANDS.map((bn) => [bn, bandPower(psd, K.binHz.value, Math.max(G[`${bn}LoHz`].value, K.binHz.value), G[`${bn}HiHz`].value)])) as Record<EegBandName, number>;
  const perCol = Math.round(K.epochS.value / K.updateS.value);
  const dsa = s.k % perCol === 0 ? { dfHz: K.binHz.value, db: psd.map((p) => r1(10 * Math.log10(Math.max(p, K.dsaFloor.value)))) } : null;
  const raw = s.fresh;
  s.fresh = [];
  return {
    n: s.n,
    numerics: {
      bis: index === null ? null : r1(index),
      bisSr: r1(bsr),
      bisBeta: comp ? fin(r2(comp.beta)) : null,
      bisConc: comp ? fin(r2(comp.conc)) : null,
      bisLowMid: comp ? fin(r2(comp.lowMid)) : null,
      eegImp: r1(hi),
    },
    flags: { questionable, invalid: false }, // neither paper gives an artefact rule with its numbers (RAM98 p. 1000 names the steps only)
    bands,
    display: { raw, dsa },
  };
}

// ── The bispectral term (RAM98 pp. 994–995, 1000; Table 2): computed for the record and the course tests, in no index.
/** The complex spectrum (bins 0 … fs/2) of one 2-s epoch, Blackman-windowed with its line removed (RAM98 p. 1000). */
export function epochSpectrum(x: readonly number[]): { re: number[]; im: number[] } {
  const w = blackman(x.length);
  return dftOf(detrend(x).map((v, i) => v * (w[i] as number)), Math.floor(x.length / 2));
}

/**
 * The bispectrum B (Eq 6) and the bicoherence BIC = B/√RTP (Eqs 7, 8) at the bins (k1, k2), over the epochs given (RAM98
 * p. 1000: the previous minute of 2-s epochs). The triple product X(f1)·X(f2)·X*(f1 + f2) is averaged over the epochs
 * BEFORE its magnitude is taken, and RTP = mean |X(f1)|²·|X(f2)|²·|X(f1 + f2)|²: the reading under which BIC measures
 * phase coupling as p. 994 says it does (taken per epoch, |·| of Eq 6 makes BIC ≡ 1 for any signal). [ENG: device;
 * RAM98 says only that the epochs' bispectra are averaged, p. 996, p. 1000.]
 */
export function bispectrumAt(eps: ReadonlyArray<{ re: number[]; im: number[] }>, k1: number, k2: number): { b: number; bic: number } {
  let tr = 0, ti = 0, rtp = 0;
  for (const e of eps) {
    const ar = e.re[k1] as number, ai = e.im[k1] as number;
    const br = e.re[k2] as number, bi = e.im[k2] as number;
    const cr = e.re[k1 + k2] as number, ci = -(e.im[k1 + k2] as number); // the conjugate
    const pr = ar * br - ai * bi, pi = ar * bi + ai * br;
    tr += pr * cr - pi * ci;
    ti += pr * ci + pi * cr;
    rtp += (ar * ar + ai * ai) * (br * br + bi * bi) * (cr * cr + ci * ci);
  }
  const m = eps.length;
  const b = Math.hypot(tr, ti) / m;
  return { b, bic: rtp > 0 ? b / Math.sqrt(rtp / m) : 0 };
}

/** The mean bicoherence over RAM98's area 0.5–47 Hz on both axes (f2 ≤ f1, the symmetric half; f1 + f2 ≤ fs/2, p. 994). */
export function meanBicoherence(eps: ReadonlyArray<{ re: number[]; im: number[] }>): number {
  const top = Math.floor(K.bicHiHz.value / K.binHz.value);
  const nyq = eps[0] ? (eps[0].re.length - 1) : 0;
  let s = 0, n = 0;
  for (let k1 = bin(K.bicLoHz.value); k1 <= top; k1++) {
    for (let k2 = bin(K.bicLoHz.value); k2 <= k1 && k1 + k2 <= nyq; k2++) {
      s += bispectrumAt(eps, k1, k2).bic;
      n++;
    }
  }
  return n ? s / n : 0;
}
