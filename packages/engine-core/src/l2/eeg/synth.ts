// EEG stage E3: the signal generator — the spectral description of a cortical state (spectra.ts) turned into microvolt
// samples (docs/plans/stage-eeg-depth-of-anaesthesia.md §7 E3, D2, D3). Rate-agnostic; deterministic from its stream.
// HOW. Every hop (half a block) the generator renders one block of BLOCK_S by random-phase spectral synthesis — for
// each frequency bin k, Gaussian cosine and sine coefficients with variance PSD(f_k)·Δf, one inverse FFT — and
// overlap-adds it under a sine window: w² of a block plus w² of its neighbour is 1, so the variance is the
// spectrum's at every sample and the trace has no step at a block edge. The spectrum is split into slots that are
// gated separately in time:
//   slot 0: everything below FF_SPLIT_HZ (the sustained 0.5–2 Hz of the forme fruste);
//   slot 1: the aperiodic background above it; slots 2…7: each named peak above it (its own burstiness envelope).
//   x(t) = gBS(t) · (low(t) + gFF(t) · (bg(t) + Σ_p e_p(t) · peak_p(t)))
// gBS is the burst-suppression alternation, gFF the forme fruste's drop-outs of all power above ≈ 2 Hz, e_p a peak's
// burst envelope (amplitude 1/√duty in a burst, so its mean power is the spectrum's). A narrowband peak rendered this
// way is an oscillation whose frequency jitters within the peak's width. Ch36 = Miller 10th ed. chapter 36, printed
// pages; research/43 = research/43-eeg-sources-review.md.
import { normal, uniform, type Sfc32State } from '../../rng/sfc32.ts';
import type { EegPeakName, EegSpectrum } from '../../types-eeg.ts';
import { SUPP_ESTABLISHED } from './state.ts';

// --- blocks (Ch35 p. 1106) ---
/** The block the generator renders: the 2 s epoch many devices use (Miller Ch35 p. 1106), rounded to a power of two
 * of samples for the FFT (256 at 125 Hz = 2.048 s). */
export const BLOCK_S = 2;
/** The split between the sustained slow activity and the power that drops out in the forme fruste: "brief drops of
 * all power above ≈ 2 Hz with sustained 0.5–2 Hz" (Miller Ch36 pp. 1140–1141). */
export const FF_SPLIT_HZ = 2;

// --- burst suppression (research/43 P-8; Ch36 pp. 1139–1141) ---
/** Mean burst length, s: canonical broadband bursts 3.58 ± 1.01 s under propofol at suppression ratio 70–90 % (Jones
 * 2023, research/43 P-8). Used for every agent: the volatile burst length in humans was not found [INF]. */
export const BS_BURST_S = 3.58;
/** Minimum suppression, s: < 5 µV for > 0.5 s (Rampil 1998, Ch36 ref. 45, via secondary sources — research/43 P-8). */
export const BS_MIN_SUPP_S = 0.5;
/** Burst onset and offset ramp, s [ENG: numerics; a few samples, so the trace has no step; bursts start abruptly, Ch36 Fig. 36.6]. */
export const BS_RAMP_S = 0.05;
/** The burst amplitude the spectrum gives (`suppression.burstUv`) is a 99th-percentile amplitude (Fleischmann 2018;
 * Kratzer 2020 "max"): a Gaussian burst's 99th percentile of |x| is 2.576 σ [INF]. */
export const BURST_UV_PER_SD = 2.576;

// --- burstiness and the forme fruste (Ch36 pp. 1140–1141, 1144) ---
/** Mean length of one burst of a bursty oscillation, s [FIT: oscillation burst length; brief research/43 P-8; Jones 2023's spindle bursts 1.12 ± 0.30 s are of this
 * order, research/43 P-8]. */
export const OSC_BURST_S = 1;
/** The duty cycle at burstiness 1 [FIT: duty cycle at full burstiness; brief research/43 P-7; fragmented into short bursts, "not continuous" (Ch36 p. 1144)]; burstiness b gives
 * duty 1 − b·(1 − OSC_DUTY_MIN). */
export const OSC_DUTY_MIN = 0.2;
/** Envelope ramp of a bursty oscillation, s [FIT: oscillation envelope ramp, smooth waxing and waning; brief research/43 P-7]. */
export const OSC_RAMP_S = 0.1;
/** Fraction of time the power above FF_SPLIT_HZ is dropped at forme fruste 1 [FIT: forme fruste drop share; brief research/43 P-8; "brief drops", Ch36 p. 1141]. */
export const FF_DROP_MAX = 0.5;
/** Mean length of one drop-out, s [FIT: forme fruste drop length, brief; brief research/43 P-8]. */
export const FF_DROP_S = 1;
/** Amplitude left during a drop-out [FIT: forme fruste floor, −20 dB; brief research/43 P-8]. */
export const FF_FLOOR = 0.1;
/** Smoothing of the per-hop gains, s [ENG: numerics; a new hop's gains reach the trace without a step]. */
export const GAIN_TAU_S = 0.1;

const PEAKS: readonly EegPeakName[] = ['slow', 'theta', 'alpha', 'spindle', 'beta', 'gamma'];
const SLOTS = 2 + PEAKS.length;

interface Gate { on: boolean; level: number; n: number } // n: samples in the current state

/** The generator's state: plain data (it lives in the pipeline state, so it is snapshotted and cloned). */
export interface SynthState {
  fs: number;
  /** Block length N and hop H = N/2, samples. */
  N: number;
  H: number;
  /** Next sample's index within the current hop (H: a new hop is due). */
  i: number;
  rng: Sfc32State;
  /** The current hop's overlap-added samples per slot, and the rendered block's second halves (the next hop's start). */
  out: number[][];
  tail: number[][];
  /** The current hop's targets: burst/suppressed gains, suppressed fraction, forme fruste, per-peak duty. */
  hop: { gBurst: number; gSupp: number; p: number; ff: number; duty: number[] };
  /** Smoothed gains (GAIN_TAU_S). */
  g: { burst: number; supp: number; amp: number[] };
  bs: Gate; // on = bursting
  ffGate: Gate; // on = dropped
  osc: Gate[]; // on = in a burst
}

// --- the FFT (radix 2, in place; tables per size) ---
const TABLES = new Map<number, { rev: Uint32Array; cos: Float64Array; sin: Float64Array }>();
function tables(n: number) {
  let t = TABLES.get(n);
  if (!t) {
    const bits = Math.log2(n);
    const rev = new Uint32Array(n);
    for (let i = 0; i < n; i++) {
      let r = 0;
      for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b);
      rev[i] = r;
    }
    const cos = new Float64Array(n / 2);
    const sin = new Float64Array(n / 2);
    for (let i = 0; i < n / 2; i++) {
      cos[i] = Math.cos((2 * Math.PI * i) / n);
      sin[i] = Math.sin((2 * Math.PI * i) / n);
    }
    t = { rev, cos, sin };
    TABLES.set(n, t);
  }
  return t;
}
/** In-place inverse DFT without the 1/N factor: x[n] = Σ X[k]·e^{+2πikn/N}. */
function ifft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  const { rev, cos, sin } = tables(n);
  for (let i = 0; i < n; i++) {
    const j = rev[i] as number;
    if (j > i) {
      const tr = re[i] as number; re[i] = re[j] as number; re[j] = tr;
      const ti = im[i] as number; im[i] = im[j] as number; im[j] = ti;
    }
  }
  for (let size = 2; size <= n; size *= 2) {
    const half = size / 2;
    const step = n / size;
    for (let s = 0; s < n; s += size) {
      for (let k = 0; k < half; k++) {
        const c = cos[k * step] as number;
        const si = sin[k * step] as number; // + sign: inverse transform
        const a = s + k;
        const b = a + half;
        const xr = (re[b] as number) * c - (im[b] as number) * si;
        const xi = (re[b] as number) * si + (im[b] as number) * c;
        re[b] = (re[a] as number) - xr; im[b] = (im[a] as number) - xi;
        re[a] = (re[a] as number) + xr; im[a] = (im[a] as number) + xi;
      }
    }
  }
}

const lin = (dB: number) => 10 ** (dB / 10);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** One-sided PSD per slot at bins 1…N/2−1, µV²/Hz. */
function slotPsd(s: SynthState, spec: EegSpectrum): number[][] {
  const out = Array.from({ length: SLOTS }, () => new Array<number>(s.H).fill(0));
  const peaks = PEAKS.map((name) => spec.peaks.find((p) => p.name === name));
  for (let k = 1; k < s.H; k++) {
    const f = (k * s.fs) / s.N;
    const bg = lin(spec.aperiodic.offsetDb - 10 * spec.aperiodic.slope * Math.log10(f));
    const pk = peaks.map((p) => (p ? lin(p.powerDb) * Math.exp(-((f - p.fHz) ** 2) / (2 * p.widthHz ** 2)) : 0));
    if (f < FF_SPLIT_HZ) (out[0] as number[])[k] = bg + pk.reduce((a, b) => a + b, 0);
    else {
      (out[1] as number[])[k] = bg;
      pk.forEach((v, j) => ((out[2 + j] as number[])[k] = v));
    }
  }
  return out;
}

const RE = new Map<number, [Float64Array, Float64Array]>();
/** Render the next block for `spec`; out = tail + its first half, tail = its second half. Returns the block's
 * continuous RMS, µV (Σ PSD·Δf over all slots). */
function renderBlock(s: SynthState, spec: EegSpectrum): number {
  const psd = slotPsd(s, spec);
  const df = s.fs / s.N;
  let buf = RE.get(s.N);
  if (!buf) {
    buf = [new Float64Array(s.N), new Float64Array(s.N)];
    RE.set(s.N, buf);
  }
  const [re, im] = buf;
  let varSum = 0;
  for (let c = 0; c < SLOTS; c += 2) {
    // two real slots in one complex transform: Z = X_c + i·X_{c+1}, each X Hermitian
    re.fill(0);
    im.fill(0);
    for (let k = 1; k < s.H; k++) {
      // coefficients A, B ~ N(0, PSD·Δf): x[n] = Σ A cos + B sin, so X[k] = (N/2)(A − iB)
      const sd0 = Math.sqrt((psd[c] as number[])[k] as number * df);
      const sd1 = Math.sqrt((psd[c + 1] as number[])[k] as number * df);
      varSum += sd0 * sd0 + sd1 * sd1;
      const a0 = normal(s.rng) * sd0, b0 = normal(s.rng) * sd0;
      const a1 = normal(s.rng) * sd1, b1 = normal(s.rng) * sd1;
      const h = s.N / 2;
      // Z[k] = X0[k] + i X1[k];  Z[N−k] = conj(X0[k]) + i conj(X1[k])
      re[k] = h * (a0 + b1); im[k] = h * (-b0 + a1);
      re[s.N - k] = h * (a0 - b1); im[s.N - k] = h * (b0 + a1);
    }
    ifft(re, im);
    for (let j = 0; j < 2; j++) {
      const src = j === 0 ? re : im;
      const o = s.out[c + j] as number[];
      const t = s.tail[c + j] as number[];
      for (let n = 0; n < s.N; n++) {
        const v = ((src[n] as number) / s.N) * Math.sin((Math.PI * (n + 0.5)) / s.N);
        if (n < s.H) o[n] = (t[n] as number) + v;
        else t[n - s.H] = v;
      }
    }
  }
  return Math.sqrt(varSum);
}

/** A new hop: render its block and set its targets from the spectrum. */
function newHop(s: SynthState, spec: EegSpectrum): void {
  const cont = Math.max(1e-6, renderBlock(s, spec));
  const p = clamp01(spec.suppression.p);
  const burstSd = spec.suppression.burstUv / BURST_UV_PER_SD;
  s.hop = {
    // bursts take the spectrum's burst amplitude as the suppression becomes established [ENG: numerics; blend, no step at onset]
    gBurst: 1 + (burstSd / cont - 1) * Math.min(1, p / SUPP_ESTABLISHED),
    gSupp: spec.suppression.suppressedUv / cont,
    p,
    ff: clamp01(spec.formeFruste),
    duty: PEAKS.map((name) => 1 - clamp01(spec.peaks.find((x) => x.name === name)?.burstiness ?? 0) * (1 - OSC_DUTY_MIN)),
  };
  s.i = 0;
}

/** A generator for `fs` drawing from `rng`, primed with `spec` (two blocks, so the first sample has full variance). */
export function createSynth(rng: Sfc32State, fs: number, spec: EegSpectrum): SynthState {
  const N = 2 ** Math.round(Math.log2(BLOCK_S * fs));
  const H = N / 2;
  const s: SynthState = {
    fs, N, H, i: H, rng: [...rng] as Sfc32State,
    out: Array.from({ length: SLOTS }, () => new Array<number>(H).fill(0)),
    tail: Array.from({ length: SLOTS }, () => new Array<number>(H).fill(0)),
    hop: { gBurst: 1, gSupp: 1, p: 0, ff: 0, duty: PEAKS.map(() => 1) },
    g: { burst: 1, supp: 1, amp: PEAKS.map(() => 1) },
    bs: { on: true, level: 1, n: 0 }, ffGate: { on: false, level: 0, n: 0 }, osc: PEAKS.map(() => ({ on: true, level: 1, n: 0 })),
  };
  renderBlock(s, spec); // the block before the first: its tail starts the first hop
  newHop(s, spec);
  s.g = { burst: s.hop.gBurst, supp: s.hop.gSupp, amp: s.hop.duty.map((d) => 1 / Math.sqrt(d)) };
  return s;
}

/** Probability of leaving a state at `rate` (1/s) within one sample; Infinity → 1. */
const leave = (rate: number, dt: number) => (rate === Infinity ? 1 : 1 - Math.exp(-rate * dt));
/** Move a gate's level one ramp step toward its state. */
function ramp(g: Gate, dt: number, rampS: number): void {
  const step = dt / rampS;
  g.level = g.on ? Math.min(1, g.level + step) : Math.max(0, g.level - step);
  g.n++;
}
function flip(g: Gate): void {
  g.on = !g.on;
  g.n = 0;
}

/** The next sample, µV. `spec` is read only when a new hop starts (once per H samples). Fixed draws per sample. */
export function synthNext(s: SynthState, spec: () => EegSpectrum): number {
  if (s.i >= s.H) newHop(s, spec());
  const dt = 1 / s.fs;
  const h = s.hop;
  // burst suppression: bursts of mean BS_BURST_S; suppressions of mean BS_BURST_S·p/(1 − p), never shorter than
  // BS_MIN_SUPP_S (when that would make them shorter, the bursts shorten instead so the suppressed fraction stays p)
  let tb = BS_BURST_S;
  let ts = h.p >= 1 ? Infinity : (BS_BURST_S * h.p) / (1 - h.p);
  if (h.p > 0 && ts < BS_MIN_SUPP_S) {
    ts = BS_MIN_SUPP_S;
    tb = (BS_MIN_SUPP_S * (1 - h.p)) / h.p;
  }
  if (h.p >= 1) tb = 0; // isoelectric: no burst lasts
  const uBs = uniform(s.rng);
  if (s.bs.on) {
    if (h.p > 0 && uBs < leave(1 / tb, dt)) flip(s.bs);
  } else if (s.bs.n * dt >= BS_MIN_SUPP_S && uBs < leave(1 / Math.max(0, ts - BS_MIN_SUPP_S), dt)) flip(s.bs);
  ramp(s.bs, dt, BS_RAMP_S);
  // the forme fruste's drop-outs: dropped a fraction q of the time, each of mean FF_DROP_S
  const q = FF_DROP_MAX * h.ff;
  const uFf = uniform(s.rng);
  if (s.ffGate.on ? uFf < leave(1 / FF_DROP_S, dt) : uFf < leave(q / ((1 - q) * FF_DROP_S), dt)) flip(s.ffGate);
  ramp(s.ffGate, dt, OSC_RAMP_S);
  // the gains, smoothed so a new hop's targets reach the trace without a step
  const a = 1 - Math.exp(-dt / GAIN_TAU_S);
  s.g.burst += (h.gBurst - s.g.burst) * a;
  s.g.supp += (h.gSupp - s.g.supp) * a;
  let x = 0;
  for (let j = 0; j < PEAKS.length; j++) {
    const d = h.duty[j] as number;
    const o = s.osc[j] as Gate;
    const u = uniform(s.rng);
    // bursts of mean OSC_BURST_S, gaps so that the duty cycle is d
    if (o.on ? d < 1 && u < leave(1 / OSC_BURST_S, dt) : u < leave(d >= 1 ? Infinity : d / ((1 - d) * OSC_BURST_S), dt)) flip(o);
    ramp(o, dt, OSC_RAMP_S);
    s.g.amp[j] = (s.g.amp[j] as number) + (1 / Math.sqrt(d) - (s.g.amp[j] as number)) * a;
    x += o.level * (s.g.amp[j] as number) * ((s.out[2 + j] as number[])[s.i] as number);
  }
  const gFf = 1 - s.ffGate.level * (1 - FF_FLOOR);
  const gBs = s.bs.level * s.g.burst + (1 - s.bs.level) * s.g.supp;
  const v = gBs * (((s.out[0] as number[])[s.i] as number) + gFf * (((s.out[1] as number[])[s.i] as number) + x));
  s.i++;
  return v;
}
