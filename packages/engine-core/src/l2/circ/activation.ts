// Time-varying-elastance activation (R42; audit §1.1 #4): the double-Hill shape of Stergiopulos, Meister &
// Westerhof 1996, normalised to a peak of exactly 1, with its period T taken from the Weissler PEP + LVET at the
// current heart rate (audit A3) rather than ∝ RR (Pulse defect 11). One activation per mechanical beat (ventricles)
// or per atrial depolarisation (atria); activations are plain data so the pipeline state stays JSON-safe.
import { lvetS, pepS } from '../hemo/params.ts';
import { DH_A1, DH_A2, DH_N1, DH_N2, T_ACT_PER_SYSTOLE } from './params.ts';
// hot-loop locals: module bindings of imported constants go through getters under the vitest transform [perf]
const L_DH_A1 = DH_A1;
const L_DH_A2 = DH_A2;
const L_DH_N1 = DH_N1;
const L_DH_N2 = DH_N2;

function raw(u: number): number {
  if (u <= 0) return 0;
  const g1 = (u / L_DH_A1) ** L_DH_N1;
  return (g1 / (1 + g1)) * (1 / (1 + (u / L_DH_A2) ** L_DH_N2));
}

/** Peak of the raw double-Hill on u ∈ (0, 1] (Pulse's 0.598 at its own grid; computed here to 1e-9). */
export const DH_PEAK: number = (() => {
  let lo = 0.2;
  let hi = 0.6;
  for (let i = 0; i < 200; i++) {
    const a = lo + (hi - lo) / 3;
    const b = hi - (hi - lo) / 3;
    if (raw(a) < raw(b)) lo = a;
    else hi = b;
  }
  return raw((lo + hi) / 2);
})();

/** Normalised activation a(u) ∈ [0, 1] at u = (t − t0)/T; 0 before onset and after u = 1. */
export function doubleHill(u: number): number {
  return u <= 0 || u >= 1 ? 0 : raw(u) / DH_PEAK;
}

/** Ventricular activation period for a beat at heart rate hr (bpm). */
export function activationPeriodS(hr: number): number {
  return T_ACT_PER_SYSTOLE * (pepS(hr) + lvetS(hr));
}

/** One scheduled activation (plain data). amp scales Emax − Emin (dyssynchrony, ischaemia are applied elsewhere). */
export interface Activation {
  t0: number;
  T: number;
  amp: number;
  origin?: string; // Stage 7a: the beat's origin (ventricular beats never drive the MANUAL tracker)
}

/** Activation level at time t: the largest of the scheduled activations (overlaps never exceed 1). */
export function activationAt(list: readonly Activation[], t: number): number {
  let a = 0;
  for (const x of list) {
    const u = (t - x.t0) / x.T;
    if (u > 0 && u < 1) {
      const v = x.amp * doubleHill(u);
      if (v > a) a = v;
    }
  }
  return a;
}

/** Drop activations that ended before t. */
export function pruneActivations(list: Activation[], t: number): Activation[] {
  return list.filter((x) => x.t0 + x.T >= t);
}
