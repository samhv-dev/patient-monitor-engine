// Valves as one-way conductances (R42; tables §2.2): forward flow through an open resistance in series with a
// stenotic Gorlin term, backward flow through a regurgitant orifice. Both branches are continuous functions of the
// pressure difference (no switching state), so the 2 ms RK4 step never chatters at valve closure.
//   forward  (ΔP > 0): ΔP = R·Q + k·Q²,  k = max(0, 1/(K·A)² − 1/(K·A_ref)²)          [Gorlin; excess over normal, ENG]
//   backward (ΔP < 0): Q = −44.3·EROA·|ΔP|/√(|ΔP| + ε)                                  [orifice law, smoothed]
import { REGURG_EPS, REGURG_K } from './params.ts';

export interface Valve {
  r: number; // open resistance incl. any series characteristic impedance, mmHg·s/mL
  k: number; // stenotic quadratic coefficient, mmHg·s²/mL²
  eroa: number; // regurgitant orifice, cm² (0 = competent)
}

/** Quadratic stenosis coefficient for area a (cm²), Gorlin constant kG, reference area aRef. */
export function stenosisK(a: number, kG: number, aRef: number): number {
  return Math.max(0, 1 / (kG * a) ** 2 - 1 / (kG * aRef) ** 2);
}

/** Flow (mL/s, positive = forward) for pressure difference dp = P_upstream − P_downstream. */
export function valveFlow(v: Valve, dp: number, rExtra = 0): number {
  if (dp > 0) {
    const r = v.r + rExtra; // rExtra: a series characteristic impedance (no per-call object allocation)
    if (v.k <= 0) return dp / r;
    return (-r + Math.sqrt(r * r + 4 * v.k * dp)) / (2 * v.k);
  }
  if (v.eroa <= 0) return 0;
  return (REGURG_K * v.eroa * dp) / Math.sqrt(-dp + REGURG_EPS);
}
