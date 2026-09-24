// Pulse (upstroke) detector for ABP, PAP and pleth (brief §4.2 "PR from the ABP uses slope-sum upstroke
// detection"; research 03 §2.2). Slope-sum function after Zong et al. 2003 (written from the paper's
// description): SSF(n) = Σ_{k=n−w+1..n} max(0, x_k − x_{k−1}), w = 128 ms. A pulse is an upward crossing of
// an adaptive threshold (35% of the running SSF-peak average, never below a per-channel floor) outside a
// 250 ms refractory period; its foot is the minimum of the signal in the 128 ms before the crossing.
// Scale-free, so it works on mmHg (ABP/PAP) and on PI units (pleth). All state is plain data.

export const DET_RATE = 125;
const W = 16; // 128 ms at 125 Hz
const HIST = 32; // 256 ms of history for the foot search
const REFRACTORY_N = 31; // 250 ms
const PEAK_TRACK_N = 20; // SSF peak searched for 160 ms after the crossing
const THR_FRACTION = 0.6; // 60% of the recent SSF peaks (Zong 2003)
const SILENCE_N = 375; // after 3 s without a pulse the peak average decays (τ 2 s) [ENG]
const DECAY = Math.exp(-1 / (2 * DET_RATE));

export interface PulseDetState {
  n: number; // absolute index of the NEXT sample
  prev: number;
  inc: number[]; // ring of the last W positive increments
  ssf: number;
  hist: number[]; // ring of the last HIST samples
  floor: number;
  peakAvg: number;
  above: boolean;
  trackUntil: number;
  trackPeak: number;
  lastFoot: number; // absolute index, or -1
}

/** `floor`: minimum SSF threshold in signal units (ABP 3 mmHg, PAP 1.5 mmHg, pleth 0.03 %) [ENG]. */
export function createPulseDet(floor: number, startIndex = 0): PulseDetState {
  return {
    n: startIndex,
    prev: Number.NaN,
    inc: new Array<number>(W).fill(0),
    ssf: 0,
    hist: new Array<number>(HIST).fill(0),
    floor,
    peakAvg: 0,
    above: false,
    trackUntil: -1,
    trackPeak: 0,
    lastFoot: -1,
  };
}

/** Feed one sample. Returns the absolute index of a newly detected pulse foot, or −1. */
export function pulseStep(st: PulseDetState, x: number): number {
  const n = st.n++;
  const d = Number.isNaN(st.prev) ? 0 : Math.max(0, x - st.prev);
  st.prev = x;
  st.ssf += d - (st.inc[n % W] as number);
  st.inc[n % W] = d;
  st.hist[n % HIST] = x;
  if (st.ssf < 1e-9) st.ssf = 0; // float drift
  if (st.trackUntil >= n) {
    st.trackPeak = Math.max(st.trackPeak, st.ssf);
    if (st.trackUntil === n) st.peakAvg = st.peakAvg === 0 ? st.trackPeak : 0.75 * st.peakAvg + 0.25 * st.trackPeak;
  }
  if (st.lastFoot >= 0 && n - st.lastFoot > SILENCE_N) st.peakAvg *= DECAY;
  const thr = Math.max(st.floor, THR_FRACTION * st.peakAvg);
  let foot = -1;
  if (!st.above && st.ssf >= thr && (st.lastFoot < 0 || n - st.lastFoot > REFRACTORY_N)) {
    st.above = true;
    let best = n;
    let bestV = x;
    for (let k = 1; k < W; k++) {
      const v = st.hist[(n - k + HIST) % HIST] as number;
      if (n - k >= 0 && v < bestV) {
        bestV = v;
        best = n - k;
      }
    }
    foot = best;
    st.lastFoot = best;
    st.trackUntil = n + PEAK_TRACK_N;
    st.trackPeak = st.ssf;
  } else if (st.above && st.ssf < 0.5 * thr) {
    st.above = false;
  }
  return foot;
}

/** Pulse rate from foot times (s): 60 / mean of the last ≤ 8 intervals that are 0.2–3 s long. */
export function pulseRate(feet: readonly number[]): number | null {
  const iv: number[] = [];
  for (let i = feet.length - 1; i > 0 && iv.length < 8; i--) {
    const d = (feet[i] as number) - (feet[i - 1] as number);
    if (d >= 0.2 && d <= 3) iv.push(d);
  }
  if (iv.length < 2) return null;
  return 60 / (iv.reduce((a, b) => a + b, 0) / iv.length);
}

/** PR source rule stub (brief §6.1): pleth when the SpO2 probe is on, else the arterial line, else none. */
export function prSource(spo2: 'on' | 'off' | 'motion', abpActive: boolean): 'pleth' | 'abp' | null {
  if (spo2 === 'on') return 'pleth';
  return abpActive ? 'abp' : null;
}
