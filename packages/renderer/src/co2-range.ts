// The capnogram lane's auto-range (skin `co2.autoScales`; owner ruling of 1 Nov 2026, E63 revisited): the lane widens
// its scale when the plateau exceeds it and narrows back when it falls, with hysteresis, as real units do. Vendor
// behaviour: the Saadat B9 offers a CO2 scale AUTO beside its fixed ones (research/06 §3.2, M p.304–305); capnographs
// in auto-scale pick the scale from the measured EtCO2, i.e. from breath peaks, and offer steps such as 0–60/0–80/0–100
// mmHg. None states a breath count or a margin, so these are [ENG]:
//  - the judged value is each breath's peak as the engine's EtCO2 detector finds it (engine-core co2-numerics.ts: a
//    breath rises above 50 % of a decaying recent peak and ends below 30 %), read from the same displayed samples, never
//    a single sample;
//  - WIDEN one step after CO2_WIDEN_BREATHS consecutive breaths whose peak reaches CO2_WIDEN_AT of the current top
//    (47.5 of 50: the plateau within 5 % of the roof);
//  - NARROW one step after CO2_NARROW_BREATHS consecutive breaths whose peak stays under CO2_NARROW_UNDER of the
//    next-lower top (40 of 50, 64 of 80). The band between (40–47.5 on the 50/80 step) is the hysteresis: a lane at 80
//    with peaks of 45 stays at 80, a lane at 50 with peaks of 45 stays at 50, so it never flaps at 50;
//  - nothing above the widest top widens further: the trace clips at the lane top there (E63 at the top range);
//  - no breath (apnoea, a detached line) changes nothing.
// The judgement runs over the engine's samples in index order, never over frames, so every window drawing the same
// timeline (the instructor's screen, a learner monitor, a phone: sample-identical engines) takes the same steps at the
// same breaths, as the pleth auto-scale and the ECG auto-gain are computed in each window from the same samples.

/** Consecutive breaths at the roof before the lane widens (two, as the EtCO2 number needs two breaths and the ECG
 *  auto-gain two windows: one spike never widens) [ENG]. */
export const CO2_WIDEN_BREATHS = 2;
/** Consecutive breaths well under the lower scale before the lane narrows (three times as long: ≈ 30 s at RR 12) [ENG]. */
export const CO2_NARROW_BREATHS = 6;
/** A breath peak at or over this fraction of the current top counts towards widening [ENG]. */
export const CO2_WIDEN_AT = 0.95;
/** A breath peak under this fraction of the next-lower top counts towards narrowing [ENG]. */
export const CO2_NARROW_UNDER = 0.8;
// The engine's EtCO2 detector (engine-core l3/co2-numerics/co2-numerics.ts, brief §4.4), repeated here: the renderer
// reads only the engine's public API, and these must stay equal to the engine's.
const DETECT_FRACTION = 0.5;
const RELEASE_FRACTION = 0.3;
const DETECT_FLOOR_MMHG = 4;
const RECENT_PEAK_TAU_S = 20;

/** One CO2 lane's auto-range state: the scale shown (index into the tops), the breath counts, the breath detector. */
export interface Co2Range {
  at: number;
  over: number;
  under: number;
  high: boolean;
  peak: number;
  recentPeak: number;
}

export function newCo2Range(at = 0): Co2Range {
  return { at, over: 0, under: 0, high: false, peak: 0, recentPeak: 30 };
}

/** Forget the breath in progress and the counts (a new timeline, a gap in the samples); the scale shown stays. */
export function restartCo2Range(r: Co2Range): void {
  Object.assign(r, newCo2Range(r.at));
}

/** Judge one whole breath's peak (mmHg) against the tops; returns the index of the scale to show. */
export function judgeCo2Breath(r: Co2Range, peak: number, tops: readonly number[]): number {
  const top = tops[r.at] as number;
  const lower = r.at > 0 ? (tops[r.at - 1] as number) : null;
  r.over = r.at < tops.length - 1 && peak >= CO2_WIDEN_AT * top ? r.over + 1 : 0;
  r.under = lower !== null && peak < CO2_NARROW_UNDER * lower ? r.under + 1 : 0;
  if (r.over >= CO2_WIDEN_BREATHS) {
    r.at++;
    r.over = r.under = 0;
  } else if (r.under >= CO2_NARROW_BREATHS) {
    r.at--;
    r.over = r.under = 0;
  }
  return r.at;
}

/** Feed `n` displayed CO2 samples (mmHg, `rate` Hz) in order; returns the index of the scale to show after them. */
export function feedCo2Range(r: Co2Range, samples: ArrayLike<number>, n: number, rate: number, tops: readonly number[]): number {
  const decay = Math.exp(-1 / rate / RECENT_PEAK_TAU_S);
  for (let i = 0; i < n; i++) {
    const x = samples[i] as number;
    r.recentPeak = Math.max(x, r.recentPeak * decay);
    if (!r.high) {
      if (x > Math.max(DETECT_FLOOR_MMHG, DETECT_FRACTION * r.recentPeak)) {
        r.high = true;
        r.peak = x;
      }
    } else {
      r.peak = Math.max(r.peak, x);
      if (x < Math.max(DETECT_FLOOR_MMHG * 0.6, RELEASE_FRACTION * r.recentPeak)) {
        r.high = false;
        judgeCo2Breath(r, r.peak, tops);
      }
    }
  }
  return r.at;
}
