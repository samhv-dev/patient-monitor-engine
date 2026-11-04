// The ECG auto-gain's judgement (Saadat-like `ecg.gainDefault: "AUTO"`): which of the skin's discrete sizes a lane shows.
// Vendor behaviour: Philips IntelliVue "Auto Size" lets the monitor choose the adjustment factor from the size set for
// each displayed ECG wave (MP20–MP90 IFU M8000-9001K §"Changing the Size of the ECG Wave"; MX400–MX800 IFU 453564443141);
// Mindray "Auto" adjusts the wave size (BeneView T5/T8/T9 manual 6800-20-50657 §9.5.11). Neither states a cadence, a
// hysteresis or a beat rule, so these are [ENG]: the size is judged per 4-s window on the beats' median amplitude, and a
// new size is taken only when it has been asked for by two consecutive windows and the amplitude has left a band around
// the current size's threshold (US 6,510,339 B2 likewise waits for agreement among several measurements).

/** Every judgement looks at one window of this length, on the sim clock's grid (windows [kW − W, kW]) [ENG]. */
export const AUTO_GAIN_WINDOW_S = 4;
/** The window's amplitude should fill at most this share of the lane's nominal height (RR-2) [ENG]. */
export const AUTO_GAIN_FILL = 0.6;
/** Consecutive windows that must ask for the same new size before it is shown [ENG; brief rule, no manual states one]. */
export const AUTO_GAIN_HOLD = 2;
/** Hysteresis: a smaller size needs the amplitude this fraction over the current size's threshold, a larger one this
 *  fraction under its own threshold. The sizes step ×2, so the bands never overlap [ENG]. */
export const AUTO_GAIN_BAND = 0.2;
/** The nominal ECG lane (mm) of a skin with no measured screen (layout.grid with sweep.pxPerMm) [ENG]. */
export const NOMINAL_ECG_LANE_MM = 30;
/** A beat closer than this to a window edge is not whole in the window and is left out (s) [ENG]. */
const EDGE_S = 0.1;
const BASE_MM_PER_MV = 10; // ×1 = 10 mm/mV (brief §3.5)

/** One lane's auto-gain state: the size shown, whether it has been judged yet, and the size asked for and since when. */
export interface GainJudge {
  mult: number;
  judged: boolean;
  pending: number | null;
  pendingK: number;
  held: number;
}

export function newJudge(mult: number): GainJudge {
  return { mult, judged: false, pending: null, pendingK: Number.NaN, held: 0 };
}

/** The largest mV that fits gain g on a nominal lane of laneMm. */
const limitMv = (g: number, laneMm: number) => (AUTO_GAIN_FILL * laneMm) / (g * BASE_MM_PER_MV);

/** The largest size whose threshold holds amp (× factor), else the smallest size. */
function largestFitting(amp: number, options: readonly number[], laneMm: number, factor = 1): number {
  let best: number | null = null;
  for (const g of options) if (amp <= limitMv(g, laneMm) * factor && (best === null || g > best)) best = g;
  return best ?? Math.min(...options);
}

/**
 * Judge window k (its index on the clock's grid) with amplitude amp (mV). The first judgement takes the largest size that
 * fits at once; after that a smaller size needs amp over the current threshold × (1 + band), a larger one amp under its
 * own threshold × (1 − band), and either is shown only after AUTO_GAIN_HOLD consecutive windows asked for it. Returns the
 * size to show.
 */
export function judgeGain(j: GainJudge, amp: number, k: number, options: readonly number[], laneMm: number): number {
  if (!j.judged) {
    j.judged = true;
    j.mult = largestFitting(amp, options, laneMm);
    j.pending = null;
    return j.mult;
  }
  let want = j.mult;
  if (amp > limitMv(j.mult, laneMm) * (1 + AUTO_GAIN_BAND)) want = largestFitting(amp, options, laneMm);
  else {
    const up = largestFitting(amp, options, laneMm, 1 - AUTO_GAIN_BAND);
    if (up > j.mult) want = up;
  }
  if (want === j.mult) {
    j.pending = null;
    return j.mult;
  }
  j.held = j.pending === want && k === j.pendingK + 1 ? j.held + 1 : 1;
  j.pending = want;
  j.pendingK = k;
  if (j.held >= AUTO_GAIN_HOLD) {
    j.mult = want;
    j.pending = null;
  }
  return j.mult;
}

/**
 * The window's amplitude (mV): the median over its whole beats of each beat's peak to peak, a beat running from the
 * midpoint with the beat before to the midpoint with the beat after (so P, QRS and T are its own), so one ectopic or
 * paced beat does not decide the size. `samples[0]` is at time t0; `beats` are R times (s, any order, may extend past the
 * window). With no whole beat in the window (asystole, VF, leads off) it is the window's peak to peak.
 */
export function beatAmplitude(samples: ArrayLike<number>, n: number, t0: number, rate: number, beats: readonly number[]): number {
  const t1 = t0 + n / rate;
  const pp = (a: number, b: number) => {
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = Math.max(0, Math.floor((a - t0) * rate)); i < Math.min(n, Math.ceil((b - t0) * rate)); i++) {
      const v = samples[i] as number;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    return hi > lo ? hi - lo : 0;
  };
  const bs = [...beats].sort((a, b) => a - b);
  const per: number[] = [];
  bs.forEach((b, i) => {
    if (b < t0 + EDGE_S || b > t1 - EDGE_S) return;
    const prev = bs[i - 1];
    const next = bs[i + 1];
    per.push(pp(prev === undefined ? t0 : Math.max(t0, (prev + b) / 2), next === undefined ? t1 : Math.min(t1, (b + next) / 2)));
  });
  if (per.length === 0) return pp(t0, t1);
  per.sort((a, b) => a - b);
  const m = per.length >> 1;
  return per.length % 2 === 1 ? (per[m] as number) : ((per[m - 1] as number) + (per[m] as number)) / 2;
}
