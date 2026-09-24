// MANUAL pressure-target tracker (brief §4.9 coupling rule M2): "a per-beat PI tracker adjusts SV (pulse
// pressure) and R (mean) with τ ≈ 3 beats, so site SBP/DBP converge on the targets. AF, PVCs, CPR and line
// faults still act." Implementation [ENG]:
//   - input: the TRUE site pressures of each completed beat (before the transducer, so damping and line
//     faults still show on the display);
//   - only REFERENCE beats enter it: supraventricular, ejection factor 0.4 ≤ E ≤ 1.05, carry-over ≤ 25% of a
//     normal SV, and the previous beat also a reference beat. So PVCs, post-PVC potentiated beats, tiny AF beats
//     and every ventricular rhythm (VT, idioventricular escape) neither drive nor get cancelled by the tracker,
//     while ordinary AF beats still let the instructor move the pressure;
//   - multiplicative updates per reference beat (time constant ≈ 3–4 beats):
//       g ← g·(PP*/PP)^0.25                    PP = mean of the last 4 reference beats
//       R ← R·(R*/R)^0.5,  R* = (MAP* − P_floor)/Q̄  the steady-state Windkessel inverse (MAP = P_floor + R·Q̄),
//     with Q̄ = Σ SV / Σ beat duration over the last 4 reference beats, MAP* = DBP* + ff·PP*, and
//     ff = measured form factor (MAP − DBP)/PP. Feeding back MAP itself would lag by R·C (≈ 2 beats) and
//     oscillate; the inverse does not;
//   - g is capped by the M3 ceiling (SV plateaus above ~150 bpm) and R by [rMin, rMax]; a binding cap sets
//     `saturated`, which the pipeline reports as the 'override' flag on sbp/dbp.

export const TRACK_ALPHA = 0.25; // g: PP feedback (4-beat mean + one beat of intake delay → larger gains ring)
export const TRACK_ALPHA_R = 0.5; // R: steady-state inverse, no feedback lag
export const TRACK_BEATS = 4;
export const REF_E_MIN = 0.4;
export const REF_E_MAX = 1.05;
export const REF_CARRY_MAX = 0.25;

/** Whether a beat may drive the tracker (see header; the "previous beat" rule is applied by the caller). */
export function isReferenceBeat(e: number, carryMl: number, nominalMl: number, ventricular = false): boolean {
  return !ventricular && e >= REF_E_MIN && e <= REF_E_MAX && carryMl <= REF_CARRY_MAX * nominalMl;
}

export interface TrackerLimits {
  gMin: number;
  gMax: number;
  rMin: number;
  rMax: number;
}

export interface TrackerState {
  g: number;
  R: number;
  ref: number[][]; // [sbp, dbp, map, sv, dur] of the last TRACK_BEATS reference beats
  saturated: boolean;
  lastRefT: number;
}

export function createTracker(R0: number): TrackerState {
  return { g: 1, R: R0, ref: [], saturated: false, lastRefT: -1e12 };
}

export interface SiteBeat {
  t: number;
  sbp: number;
  dbp: number;
  map: number;
  ref: boolean; // isReferenceBeat(...) at ejection time
  sv: number; // mL ejected by this beat
  dur: number; // s, from this ejection to the next
}

/** Feed one completed beat. `gCap` is the M3 ceiling for this RR (params.gainCeiling). */
export function trackBeat(
  tr: TrackerState,
  b: SiteBeat,
  target: { sbp: number; dbp: number },
  pFloor: number,
  lim: TrackerLimits,
  gCap: number,
): void {
  if (!b.ref) return;
  tr.lastRefT = b.t;
  tr.ref.push([b.sbp, b.dbp, b.map, b.sv, b.dur]);
  if (tr.ref.length > TRACK_BEATS) tr.ref.shift();
  const sum = (i: number) => tr.ref.reduce((a, r) => a + (r[i] as number), 0);
  const n = tr.ref.length;
  const pp = Math.max(1, (sum(0) - sum(1)) / n);
  const dbp = sum(1) / n;
  const map = sum(2) / n;
  const ppT = Math.max(2, target.sbp - target.dbp);
  const ff = Math.min(0.6, Math.max(0.25, (map - dbp) / pp));
  const mapT = target.dbp + ff * ppT;
  const qBar = sum(3) / Math.max(1e-3, sum(4));
  const rStar = Math.max(1, mapT - pFloor) / Math.max(1, qBar);
  const g = tr.g * (ppT / pp) ** TRACK_ALPHA;
  const r = tr.R * (rStar / tr.R) ** TRACK_ALPHA_R;
  const gHi = Math.min(lim.gMax, gCap);
  tr.g = Math.min(gHi, Math.max(lim.gMin, g));
  tr.R = Math.min(lim.rMax, Math.max(lim.rMin, r));
  tr.saturated = tr.g !== g || tr.R !== r;
}
