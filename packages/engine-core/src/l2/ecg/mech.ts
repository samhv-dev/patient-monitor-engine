// Beat → mechanical output k_rhythm (brief §4.8 table; research 03 §8.2–8.3). The `mech` field of every beat event is
// the contract with Stage 2's haemodynamics: perfused === false ⇔ kSV === 0 (PEA, VF, dropped/too-early beats).
import { lvetMs } from './intervals.ts';
import { RHYTHMS } from './rhythms.ts';
import type { PendingV, RhythmState } from './rhythm-state.ts';

const PVC_NO_EJECTION_BELOW = 0.45; // no ejection at coupling < ~45% of RR (brief §4.8)
export const BASE_SV_ML = 70; // placeholder SV until the Stage 2 haemodynamic core [ENG]

export function fFill(rr: number): number {
  // f_fill(RR) = 1 − exp(−max(0, RR − t_sys)/τ_fill), t_sys = LVET + 0.08 s, τ_fill 0.18 s,
  // normalised to 1 at RR 1 s (brief §4.8; research 03 §8.2)
  const f = (x: number) => 1 - Math.exp(-Math.max(0, x - (Math.max(150, lvetMs(60 / x)) / 1000 + 0.08)) / 0.18);
  return f(rr) / f(1);
}

/** Stroke-volume factor k_rhythm for one beat (brief §4.8 table). */
export function kRhythm(st: RhythmState, p: PendingV, rr: number): number {
  const d = RHYTHMS[st.id];
  if (st.opts.pulseless) return 0; // PEA (brief §5)
  let k: number;
  if (p.pvc) k = p.coupling < PVC_NO_EJECTION_BELOW ? 0 : 0.3; // PVC 0–0.6
  else if (p.origin === 'paced') k = 0.9; // paced 0.85–1.0 (research 03 §1.5)
  else if (p.origin === 'ventricular') {
    const hr = 60 / rr;
    if (d.focus === 'vt') k = hr <= 150 ? 0.6 : hr >= 200 ? 0.2 : 0.6 - (0.4 * (hr - 150)) / 50; // VT 0.4–0.6 / 0–0.3
    else if (d.focus === 'torsades' || d.focus === 'vtPoly') k = 0.1; // torsades 0–0.2
    else if (d.focus === 'agonal') k = 0;
    else if (d.focus === 'idioventricular') k = 0.7; // idioventricular / AIVR 0.6–0.8
    else k = rr >= 1.5 ? 1.4 : 0.7; // CHB escape ≤40/min: SV × 1.3–1.5
  } else if (p.origin === 'junctional') k = d.focus === 'svt' || d.focus === 'avrt' ? 0.85 * fFill(rr) : 0.85; // junctional 0.8–0.9
  else if (d.atria === 'fib') k = 0.8 * fFill(rr); // AF 0.75–0.85 × f_fill
  else if (d.atria === 'flutter') k = 0.85; // flutter 0.8–0.9
  else k = 1.0; // sinus, atrial, AAI/DDD
  if (st.lastWasPvc && !p.pvc) k *= 1.2; // beat after a PVC 1.1–1.3
  return Math.max(0, k);
}
