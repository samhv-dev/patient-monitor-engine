// QRS detector on the DISPLAYED (monitor-filtered) lead (brief §4.1: it never reads the truth list).
// Pan–Tompkins-like, written from the published description (Pan & Tompkins, IEEE TBME 1985):
//   band-pass 5–15 Hz → 5-point derivative → square → 80 ms moving-window integral (MWI)
//   → adaptive threshold THR = NPK + 0.25·(SPK − NPK) with 200 ms refractory.
// A detection is a "hump" of the MWI above THR; it is finalised when the MWI falls below 60% of its hump
// maximum, and the R time is the largest |deflection| of the displayed lead inside the hump window.
// A hump within 600 ms of the last R and under half its size is classed as a T wave.
// All state is plain data (arrays and numbers) so the engine can clone and snapshot it.
import { createFilterState, filterSample, highpass, lowpass, type Biquad } from './ecg-filter.ts';

export const QRS_RATE = 500;
const MWI_N = 40; // 80 ms at 500 Hz
const HIST_N = 128; // displayed-lead history for R localisation (256 ms)
const REFRACTORY_N = 100; // 200 ms
const LEARN_N = 1000; // 2 s learning period
const LOOKBACK_N = 40; // R search starts 80 ms before the hump starts
const HUMP_MAX_N = 100; // a hump longer than 200 ms is closed anyway
const SILENCE_DECAY_N = 750; // after 1.5 s without a QRS, SPK halves each further 1.5 s (search-back stand-in) [ENG]
const T_WINDOW_N = 300; // humps within 600 ms of the last R ... [ENG, after Pan–Tompkins' 360 ms T-wave rule]
const T_RATIO = 0.5; // ... and below half the last QRS hump are T waves, not QRS
const FINAL_FRACTION = 0.6; // a hump is closed when the MWI falls below 60% of its maximum [ENG, latency]
/**
 * Pace-pulse rejection (R-51-3): after a transcutaneous pacing pulse the detection lead is held at its pre-pulse
 * value for this long, so the pad spike and the start of its polarisation tail never reach the filters
 * (monitors blank their QRS detector after a detected pace pulse; research/03 §1.7) [ENG].
 */
export const PACE_BLANK_N = 30; // 60 ms
/** R-51-3: announce a pace pulse this many samples before its marker time (8 ms) [ENG]. */
export const PACE_LEAD_N = 4;
const PACE_TAIL_TAU_N = 50; // 100 ms [ENG]
const PACE_TAIL_DECAY = Math.exp(-1 / PACE_TAIL_TAU_N);
/** Absolute floor for SPK in (mV/sample)² units, far above the MWI of 0.025 mV noise [ENG, see Task 14]. */
export const SPK_FLOOR = 2e-4;

const BP: readonly Biquad[] = [highpass(5, QRS_RATE), lowpass(15, QRS_RATE)];

export interface QrsState {
  bp: number[];
  d: number[]; // last 4 band-passed values (for the 5-point derivative)
  mwiBuf: number[];
  mwiSum: number;
  hist: number[]; // displayed-lead values, ring of HIST_N
  n: number; // absolute index of the NEXT sample
  learnMax: number;
  learnSum: number;
  spk: number;
  npk: number;
  prevMwi: number;
  prevPrevMwi: number;
  inHump: boolean;
  humpStart: number;
  humpMax: number;
  lastR: number; // absolute index of the last detected R, or -1
  lastDetN: number; // absolute index where the last detection was finalised
  lastQrsMax: number; // MWI hump maximum of the last detected QRS
  /** R-51-3: pace-pulse blanking (qrsPaceGate). The input is held at `paceHold` for samples paceFrom..paceUntil. */
  paceFrom?: number;
  paceUntil?: number;
  paceHold?: number;
  /** R-51-3: the previous unfiltered input (the value held through a blank). */
  paceLast?: number;
  /** R-51-3: offset re-basing the pad's polarisation tail after the blank (fades to 0). */
  paceOff?: number;
}

export function createQrsState(startIndex: number): QrsState {
  return {
    bp: createFilterState(BP),
    d: [0, 0, 0, 0],
    mwiBuf: new Array<number>(MWI_N).fill(0),
    mwiSum: 0,
    hist: new Array<number>(HIST_N).fill(0),
    n: startIndex,
    learnMax: 0,
    learnSum: 0,
    spk: 0,
    npk: 0,
    prevMwi: 0,
    prevPrevMwi: 0,
    inHump: false,
    humpStart: 0,
    humpMax: 0,
    lastR: -1,
    lastDetN: -1,
    lastQrsMax: 0,
  };
}

function findR(st: QrsState, from: number, to: number): number {
  // R = the largest |x − window mean| inside the hump window (robust to a sloping baseline or an
  // overlapping T wave at high rates) [ENG].
  const lo = Math.max(from, st.n - HIST_N + 1);
  let mean = 0;
  for (let i = lo; i <= to; i++) mean += st.hist[i % HIST_N] as number;
  mean /= to - lo + 1;
  let best = lo;
  let bestAbs = -1;
  for (let i = lo; i <= to; i++) {
    const a = Math.abs((st.hist[i % HIST_N] as number) - mean);
    if (a > bestAbs) {
      bestAbs = a;
      best = i;
    }
  }
  return best;
}

/**
 * R-51-3: a transcutaneous pacing pulse (paceSpike marker) is at absolute sample `n`. Call it at least
 * PACE_LEAD_N samples ahead (the spike kernel starts ~4 ms before the marker); blanking starts at the current sample.
 */
export function qrsPacePulse(st: QrsState, n: number): void {
  if (st.paceUntil === undefined) st.paceFrom = st.n;
  st.paceUntil = Math.max(st.paceUntil ?? n, n + PACE_BLANK_N);
}

/**
 * R-51-3 pace-pulse rejection, applied to the detection lead BEFORE the monitor filter (as a monitor's front end
 * does; after the filter, the spike rings the mains notch for > 100 ms). Call once per sample, before qrsStep, with
 * the unfiltered detection-lead value; returns the value to filter and detect on. During the blank the input is held
 * at its pre-pulse value; after it, the pad's polarisation tail is re-based on the held value and the offset fades
 * (τ 100 ms), too slowly for the 5–15 Hz band-pass to see a step.
 */
export function qrsPaceGate(st: QrsState, raw: number): number {
  const n = st.n;
  let x = raw;
  if (st.paceUntil !== undefined && n >= (st.paceFrom as number)) {
    if (n <= st.paceUntil) {
      st.paceHold ??= st.paceLast ?? raw;
      x = st.paceHold;
    } else {
      st.paceOff = raw - (st.paceHold as number);
      delete st.paceFrom;
      delete st.paceUntil;
      delete st.paceHold;
    }
  }
  if (st.paceOff !== undefined && st.paceUntil === undefined) {
    x = raw - st.paceOff;
    st.paceOff *= PACE_TAIL_DECAY;
    if (Math.abs(st.paceOff) < 1e-4) delete st.paceOff;
  }
  st.paceLast = raw;
  return x;
}

/**
 * Feed one displayed-lead sample (mV). Returns the absolute sample index of a newly detected R peak,
 * or -1. Detections are reported ~60–110 ms after the R peak.
 */
export function qrsStep(st: QrsState, xIn: number): number {
  const n = st.n;
  const x = xIn;
  st.hist[n % HIST_N] = x;
  const b = filterSample(BP, st.bp, x);
  const d = st.d;
  const deriv = (2 * b + (d[0] as number) - (d[2] as number) - 2 * (d[3] as number)) / 8;
  d[3] = d[2] as number;
  d[2] = d[1] as number;
  d[1] = d[0] as number;
  d[0] = b;
  const e = deriv * deriv;
  const slot = n % MWI_N;
  st.mwiSum += e - (st.mwiBuf[slot] as number);
  st.mwiBuf[slot] = e;
  const mwi = Math.max(0, st.mwiSum / MWI_N);
  st.n = n + 1;

  if (n < LEARN_N) {
    // Learning phase (Pan–Tompkins): SPK = 1/3 of the max, NPK = 1/2 of the mean.
    st.learnMax = Math.max(st.learnMax, mwi);
    st.learnSum += mwi;
    if (n === LEARN_N - 1) {
      st.spk = Math.max(SPK_FLOOR, st.learnMax / 3);
      st.npk = st.learnSum / LEARN_N / 2;
    }
    st.prevPrevMwi = st.prevMwi;
    st.prevMwi = mwi;
    return -1;
  }

  // Search-back stand-in: lower SPK during long silences so a smaller rhythm is re-acquired.
  const since = n - (st.lastDetN < 0 ? LEARN_N : st.lastDetN);
  if (since > 0 && since % SILENCE_DECAY_N === 0) st.spk = Math.max(SPK_FLOOR, st.spk / 2);

  const thr = st.npk + 0.25 * (st.spk - st.npk);
  let detected = -1;
  if (!st.inHump) {
    if (mwi > thr && (st.lastR < 0 || n - st.lastR > REFRACTORY_N)) {
      st.inHump = true;
      st.humpStart = n;
      st.humpMax = mwi;
    } else if (st.prevMwi > mwi && st.prevMwi >= st.prevPrevMwi) {
      st.npk = 0.125 * st.prevMwi + 0.875 * st.npk; // a noise peak
    }
  } else {
    st.humpMax = Math.max(st.humpMax, mwi);
    if (mwi < FINAL_FRACTION * st.humpMax || n - st.humpStart > HUMP_MAX_N) {
      st.inHump = false;
      const tWave = st.lastR >= 0 && st.humpStart - st.lastR < T_WINDOW_N && st.humpMax < T_RATIO * st.lastQrsMax;
      if (tWave) {
        st.npk = 0.125 * st.humpMax + 0.875 * st.npk;
      } else {
        const r = findR(st, st.humpStart - LOOKBACK_N, n);
        st.spk = Math.max(SPK_FLOOR, 0.125 * st.humpMax + 0.875 * st.spk);
        st.lastR = r;
        st.lastDetN = n;
        st.lastQrsMax = st.humpMax;
        detected = r;
      }
    }
  }
  st.prevPrevMwi = st.prevMwi;
  st.prevMwi = mwi;
  return detected;
}
