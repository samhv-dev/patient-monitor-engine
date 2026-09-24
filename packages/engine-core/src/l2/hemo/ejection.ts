// Ventricular ejection and CPR pump flows (brief §4.2 "Ejection", "Arrest and CPR"; research 03 §2.8):
//   Q_ej(t) = Qpk·sin(π·(t/LVET)^p)^κ for 0 ≤ t < LVET, then a backflow bump −Qb·sin(π·(t − LVET)/T_b) for
//   T_b = 20 ms (the incisura). Qpk is chosen so that the NET ejected volume ∫Q = SV. The skew p (params
//   EJECTION_SKEW) moves peak flow to the first third of ejection, as in the real aortic flow wave; p = 1 is the
//   brief's plain sin^κ.
//   CPR: Q_cpr = SV_cpr·(π/(2T_c))·sin(πt/T_c) (κ = 1, no backflow) plus a thoracic pressure pulse.
import { BACKFLOW_S } from './params.ts';

/** One scheduled flow pulse (plain data). Times are absolute sim seconds. */
export interface Pulse {
  t0: number;
  dur: number;
  qpk: number; // mL/s
  kappa: number;
  skew: number; // p in sin(π·u^p)^κ
  back: number; // backflow peak, mL/s (0 = none)
  cpr?: boolean; // a chest compression (removed when CPR stops)
}

/** ∫₀¹ sin(π·u^p)^κ du by the 400-point midpoint rule (relative error < 1e-5 for κ 0.5–2, p 0.5–1). */
export function sinPowIntegral(kappa: number, skew = 1): number {
  let s = 0;
  for (let i = 0; i < 400; i++) s += Math.sin(Math.PI * ((i + 0.5) / 400) ** skew) ** kappa;
  return s / 400;
}

/** A pulse whose net volume is `sv` mL: forward volume sv·(1 + backFrac), backflow sv·backFrac. */
export function makePulse(t0: number, dur: number, sv: number, kappa: number, backFrac: number, skew = 1): Pulse {
  const vBack = sv * backFrac;
  return {
    t0,
    dur,
    qpk: (sv + vBack) / (dur * sinPowIntegral(kappa, skew)),
    kappa,
    skew,
    back: backFrac > 0 ? vBack / ((2 * BACKFLOW_S) / Math.PI) : 0,
  };
}

/** Total flow of all pulses at time t (mL/s). */
export function flowAt(list: readonly Pulse[], t: number): number {
  let q = 0;
  for (const p of list) {
    const u = t - p.t0;
    if (u < 0) continue;
    if (u < p.dur) q += p.qpk * Math.sin(Math.PI * (u / p.dur) ** p.skew) ** p.kappa;
    else if (p.back > 0 && u < p.dur + BACKFLOW_S) q -= p.back * Math.sin((Math.PI * (u - p.dur)) / BACKFLOW_S);
  }
  return q;
}

/** Thoracic-pump pressure pulses (CPR), half-sine of amplitude `qpk` mmHg (the field is reused). */
export function pressureAt(list: readonly Pulse[], t: number): number {
  let p = 0;
  for (const x of list) {
    const u = t - x.t0;
    if (u >= 0 && u < x.dur) p += x.qpk * Math.sin((Math.PI * u) / x.dur);
  }
  return p;
}

/** Drop pulses that ended before time t. */
export function prunePulses(list: Pulse[], t: number): Pulse[] {
  return list.filter((p) => p.t0 + p.dur + BACKFLOW_S >= t);
}
