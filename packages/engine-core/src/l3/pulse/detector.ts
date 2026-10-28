// Pulse (upstroke) detector for ABP, PAP and pleth (brief §4.2 "PR from the ABP uses slope-sum upstroke
// detection"; research 03 §2.2). One foot path for the three lines. Scale-free, so it works on mmHg (ABP/PAP) and on PI
// units (pleth). All state is plain data.
//
// 1. Detection (Zong W, Heldt T, Moody GB, Mark RG, "An open-source algorithm to detect onset of arterial blood pressure
//    pulses", Computers in Cardiology 2003;30:259–262). Slope-sum function SSF(n) = Σ_{k=n−w+1..n} max(0, x_k − x_{k−1}),
//    w = 128 ms (the paper's w). A pulse is an upward crossing of THR_FRACTION × the running average of the SSF peaks of
//    the detected pulses (never below a per-channel floor), outside the eye-closing period after the last foot; its foot
//    is the minimum of the signal in the 128 ms before the crossing.
// 2. Search-back (Pan J, Tompkins WJ, "A real-time QRS detection algorithm", IEEE Trans Biomed Eng 1985;32:230–236).
//    When the interval from the last foot to the one just found exceeds the RR MISSED LIMIT (166 % of the recent
//    interval), the interval is searched for the largest SSF peak above the second threshold, half the first (PT's
//    THRESHOLD I2 = 0.5 × THRESHOLD I1), and that peak is a candidate pulse.
// 3. Acceptance of the candidate by its shape (Li BN, Dong MC, Vai MI, "On an automatic delineator for arterial blood
//    pressure waveforms", Biomed Signal Process Control 2010;5:76–81, and its published code delineator.m, rev. 2.0.5):
//    a beat is an onset (where the upstroke starts: a zero crossing of the smoothed derivative, or the inflection when
//    the upstroke rises out of the previous beat's run-off) paired with the systolic peak it rises to, after which the
//    signal runs off; it is accepted only if its rise is more than 0.4 × and less than 2 × the amplitude of the beats
//    around it, and an onset less than 300 ms after the previous beat's systolic peak is not a pulse (the delineator's
//    eye-closing, 3 × closeWin: the dicrotic notch and wave of the previous beat lie there). This is the pressure
//    analogue of Pan & Tompkins' T-wave rule, which discards a candidate in the repolarisation window of the previous
//    complex. The onset must also lie outside the eye-closing period of both feet, so each beat it makes is at least
//    250 ms long.
// The search-back runs on the systemic arterial line only (`createPulseDet`).

export const DET_RATE = 125;
const W = 16; // 128 ms at 125 Hz (Zong 2003: w = 128 ms)
/** History kept for the foot search and the search-back: 3.2 s, the longest beat the numerics measure (HR ≥ 19). */
const HIST = 400;
const FOOT_N = 16; // the foot is the minimum of the signal in the 128 ms before the crossing
/**
 * 250 ms eye-closing after a foot: no second pulse starts inside it. wabp.c (Zong's published code of the 2003 paper,
 * PhysioNet WFDB) uses EYE_CLS 0.25 s; the paper's text gives 300 ms. The code's value is kept: a 300 ms lock-out would
 * hide every pulse of a rhythm above 200/min [ENG: of the two published values, the one that keeps HR ≤ 240].
 */
const REFRACTORY_N = 31;
const PEAK_TRACK_N = 20; // SSF peak searched for 160 ms after the crossing
/** The actual threshold is 60 % of the threshold base, the running SSF-peak average (Zong 2003, §2.1 decision rule). */
const THR_FRACTION = 0.6;
/**
 * Re-arm: after a pulse the SSF must fall below half the threshold before the next crossing counts [ENG]. Neither
 * Zong's paper nor wabp.c has a re-arm level (wabp.c confirms a candidate by a fixed rise of the SSF, in ADC counts);
 * without one, an upstroke slower than the eye-closing period would be counted twice. Zong's paper confirms a crossing by
 * the rise of the SSF in the 150 ms around it ("exceeds a certain value", not given) instead. A pulse this rule hides
 * has an SSF peak above the threshold, so it is a search-back candidate when its interval is over the missed limit.
 */
const REARM_FRACTION = 0.5;
const SILENCE_N = 375; // after 3 s without a pulse the peak average decays (τ 2 s) [ENG]
const DECAY = Math.exp(-1 / (2 * DET_RATE));
/**
 * The RR MISSED LIMIT: an interval longer than 166 % of the recent interval holds a missed pulse (Pan & Tompkins 1985).
 * The recent interval is the median of the last ≤ 8 intervals [ENG: the median rather than Pan–Tompkins' range-limited
 * mean of 8, so that one merged interval does not lengthen it].
 */
export const MISSED_LIMIT = 1.66;
export const MISSED_AVG_N = 8;
/**
 * The search-back threshold is half the detection threshold (Pan & Tompkins 1985: THRESHOLD I2 = 0.5 × THRESHOLD I1).
 * Two further Pan–Tompkins rules are not used, each measured on the diagnosis run set (research/ibp-missed-foot-diag,
 * 2026-10-28): halving both thresholds in an irregular rhythm (their eqs. 22–23) recovered 14 more pulses (548 against
 * 534) and 2 more feet that are not beats, most of the candidates it adds failing the shape test below; feeding a
 * recovered pulse's SSF peak into the threshold base (their eq. 16) lowered the detection threshold, added 2
 * detection-path feet that are not beats and recovered fewer pulses (519).
 */
const SEARCH_FRACTION = 0.5;
/**
 * A beat's rise must lie between 0.4 × and 2 × the amplitude of the beats around it (Li 2010's code: 0.4 × abpMaxTH <
 * max − min < 2 × abpMaxTH). Li learns abpMaxTH from the max − min of 1 s windows spread over the record, off-line;
 * a monitor has only the past, so the amplitude here is the median rise of the last ≤ 8 pulses [ENG].
 */
const AMP_FRACTION = 0.4;
const AMP_MAX_FRACTION = 2;
/** An onset less than 300 ms after the previous systolic peak is not a pulse (Li 2010's delineator: 3 × closeWin). */
const EYE_CLOSE_PEAK_N = 38;

export interface PulseDetState {
  n: number; // absolute index of the NEXT sample
  prev: number;
  inc: number[]; // ring of the last W positive increments
  ssf: number;
  hist: number[]; // ring of the last HIST samples
  /** Ring of the last HIST SSF values (search-back). Absent in older snapshots. */
  ssfHist?: number[];
  floor: number;
  peakAvg: number;
  above: boolean;
  trackUntil: number;
  trackPeak: number;
  lastFoot: number; // absolute index, or -1
  /** The last ≤ MISSED_AVG_N foot-to-foot intervals (samples). */
  rr?: number[];
  /** The rises (systolic peak − onset) of the last ≤ MISSED_AVG_N pulses, in signal units. */
  amps?: number[];
  /** Absolute index of the last pulse's systolic peak, or −1 while it is still rising. */
  lastPeak?: number;
  /** Feet found and not yet returned (a search-back returns the recovered feet before the foot that triggered it). */
  pending?: number[];
  /** The last foot recovered by the search-back (−1: none). */
  sbFoot?: number;
}

/** `floor`: minimum SSF threshold in signal units (ABP 3 mmHg, PAP 1.5 mmHg, pleth 0.03 %) [ENG]. */
export function createPulseDet(floor: number, startIndex = 0): PulseDetState {
  return {
    n: startIndex,
    prev: Number.NaN,
    inc: new Array<number>(W).fill(0),
    ssf: 0,
    hist: new Array<number>(HIST).fill(0),
    ssfHist: new Array<number>(HIST).fill(0),
    floor,
    peakAvg: 0,
    above: false,
    trackUntil: -1,
    trackPeak: 0,
    lastFoot: -1,
    rr: [],
    amps: [],
    lastPeak: -1,
    pending: [],
    sbFoot: -1,
  };
}

const median = (a: readonly number[]): number => {
  const s = [...a].sort((u, v) => u - v);
  const k = s.length >> 1;
  return s.length % 2 ? (s[k] as number) : ((s[k - 1] as number) + (s[k] as number)) / 2;
};

/**
 * Feed one sample. Returns the absolute index of a newly detected pulse foot, or −1 (a search-back's recovered feet are
 * returned one per sample, before the foot that triggered it). `searchBack`: the search-back with Li's acceptance runs
 * on this line. The caller passes it for the systemic arterial line (ABP), the waveform Li's delineator was built and
 * validated on; the detection path is the same with or without it, the search-back only adds feet. The pleth keeps
 * #153's own-period rule (numerics.ts): Li's test is not validated on a pleth. The PAP stays without it until it is
 * measured: the engine's beat list times the aortic valve, not the pulmonary one, so a recovered PAP foot cannot yet be
 * checked against a beat.
 */
export function pulseStep(st: PulseDetState, x: number, searchBack = false): number {
  if (st.hist.length !== HIST || !st.ssfHist) upgrade(st);
  const n = st.n++;
  const d = Number.isNaN(st.prev) ? 0 : Math.max(0, x - st.prev);
  st.prev = x;
  st.ssf += d - (st.inc[n % W] as number);
  st.inc[n % W] = d;
  if (st.ssf < 1e-9) st.ssf = 0; // float drift
  st.hist[n % HIST] = x;
  (st.ssfHist as number[])[n % HIST] = st.ssf;
  // The systolic peak of the last pulse: the first sample after its crossing where the signal stops rising
  if (st.lastPeak === -1 && st.lastFoot >= 0 && n - 1 > st.lastFoot && x < (st.hist[(n - 1) % HIST] as number)) {
    st.lastPeak = n - 1;
    pushRecent(st.amps as number[], (st.hist[(n - 1) % HIST] as number) - (st.hist[st.lastFoot % HIST] as number));
  }
  if (st.trackUntil >= n) {
    st.trackPeak = Math.max(st.trackPeak, st.ssf);
    if (st.trackUntil === n) st.peakAvg = st.peakAvg === 0 ? st.trackPeak : 0.75 * st.peakAvg + 0.25 * st.trackPeak;
  }
  if (st.lastFoot >= 0 && n - st.lastFoot > SILENCE_N) st.peakAvg *= DECAY;
  const thr = Math.max(st.floor, THR_FRACTION * st.peakAvg);
  if (!st.above && st.ssf >= thr && (st.lastFoot < 0 || n - st.lastFoot > REFRACTORY_N)) {
    st.above = true;
    let best = n;
    let bestV = x;
    for (let k = 1; k < FOOT_N; k++) {
      const v = st.hist[(n - k + HIST) % HIST] as number;
      if (n - k >= 0 && v < bestV) {
        bestV = v;
        best = n - k;
      }
    }
    if (searchBack && st.lastFoot >= 0 && (st.rr as number[]).length > 0) searchBackInterval(st, best, n, thr);
    if (st.lastFoot >= 0) pushRecent(st.rr as number[], best - st.lastFoot);
    (st.pending as number[]).push(best);
    st.lastFoot = best;
    st.lastPeak = -1;
    st.trackUntil = n + PEAK_TRACK_N;
    st.trackPeak = st.ssf;
  } else if (st.above && st.ssf < REARM_FRACTION * thr) {
    st.above = false;
  }
  return (st.pending as number[]).shift() ?? -1;
}

function pushRecent(a: number[], v: number): void {
  a.push(v);
  if (a.length > MISSED_AVG_N) a.shift();
}

/**
 * Pan & Tompkins' search-back over (lastFoot, f), f the foot just found: while the interval left exceeds the missed
 * limit, the largest SSF peak above the second threshold is a candidate; it is a pulse if its onset and systolic peak
 * pass Li's tests. Recovered feet are queued before f. Called at the crossing sample n (f ≤ n).
 */
function searchBackInterval(st: PulseDetState, f: number, n: number, thr: number): void {
  const rr = st.rr as number[];
  const amps = st.amps as number[];
  const limit = MISSED_LIMIT * median(rr); // the rhythm before this interval
  const ampRef = amps.length > 0 ? median(amps) : 0;
  const X = (k: number) => st.hist[k % HIST] as number;
  const S = (k: number) => (st.ssfHist as number[])[k % HIST] as number;
  let p = st.lastFoot;
  let pPeak = st.lastPeak as number;
  while (f - p > limit && n - p < HIST - FOOT_N) {
    // A candidate's onset lies outside the eye-closing period of both feet and ≥ 300 ms after p's systolic peak; its SSF
    // peak lies before f (2 samples of margin for the smoothed derivative)
    const lo = Math.max(p + REFRACTORY_N, pPeak >= 0 ? pPeak + EYE_CLOSE_PEAK_N : p + REFRACTORY_N);
    const hi = f - REFRACTORY_N;
    let cand = -1;
    for (let k = lo + 1; k < f - 2; k++) {
      const s = S(k);
      if (s >= SEARCH_FRACTION * thr && s >= S(k - 1) && s > S(k + 1) && (cand < 0 || s > S(cand))) cand = k;
    }
    if (cand < 0) return;
    // The SSF crossing of the second threshold that leads to the peak; Li's systolic peak: the maximum of the upstroke
    // in the 160 ms after the crossing (the SSF peak's tracking window)
    let c = cand;
    while (c - 1 > p && S(c - 1) >= SEARCH_FRACTION * thr) c--;
    let pk = c;
    for (let k = c + 1; k <= c + PEAK_TRACK_N && k < f; k++) if (X(k) > X(pk)) pk = k;
    // Li's onset, on the derivative smoothed over 5 samples (the delineator's smoothing): from the steepest point of
    // the upstroke back to where it starts — the zero crossing of the derivative (a local minimum of the signal) or,
    // when the upstroke rises out of the previous beat's dicrotic wave without one, the inflection point (the smallest
    // slope) between them
    const D = (k: number) => (X(k + 2) - X(k - 3)) / 5;
    let a = c;
    while (a - 1 > p && D(a - 1) >= D(a)) a--; // back to the steepest point, when the crossing lies after it
    while (a - 1 > p && D(a) > 0 && D(a - 1) < D(a)) a--;
    if (D(a) <= 0) for (let k = a - 2; k <= a + 2; k++) if (k > p && X(k) < X(a)) a = k;
    const rise = X(pk) - X(a);
    // Accepted: the onset in its window, a systolic peak the signal runs off from, a rise consistent with the beats
    // around it
    if (a < lo || a > hi || !(X(pk + 1) < X(pk)) || !(rise > AMP_FRACTION * ampRef && rise < AMP_MAX_FRACTION * ampRef)) return;
    (st.pending as number[]).push(a);
    pushRecent(rr, a - p);
    pushRecent(amps, rise);
    st.sbFoot = a;
    st.lastFoot = a;
    p = a;
    pPeak = pk;
  }
}

/** A detector restored from an older snapshot (32-sample history, no search-back state) is brought up to this one. */
function upgrade(st: PulseDetState): void {
  const old = st.hist;
  st.hist = new Array<number>(HIST).fill(0);
  for (let k = Math.max(0, st.n - old.length); k < st.n; k++) st.hist[k % HIST] = old[k % old.length] as number;
  st.ssfHist = new Array<number>(HIST).fill(0);
  st.rr ??= [];
  st.amps ??= [];
  st.lastPeak ??= -1;
  st.pending ??= [];
  st.sbFoot ??= -1;
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
