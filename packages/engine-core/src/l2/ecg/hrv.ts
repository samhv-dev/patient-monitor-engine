// HRV / RSA (brief §4.1 "HRV"; research 03 §1.4):
//   RR_n = RR_mean + A_RSA·sin(2π·f_resp·t_n + φ) + A_LF·sin(2π·0.1·t_n + ψ) + ε_n
// Awake adult: A_RSA 30–60 ms, A_LF 20–40 ms, ε SD 10–20 ms. Amplitudes here are scaled by RR_mean (s)
// so that tachycardia does not get 60 ms swings [ENG]. Breathing is a FIXED-RATE clock until Stage 3.
import { normal, uniform, type Sfc32State } from '../../rng/sfc32.ts';
import type { Modifiers } from '../../types.ts';

export const F_RESP_HZ = 0.25; // 15 breaths/min [ENG, Stage 1 stand-in for the respiratory driver]
export const A_RSA_MAX_S = 0.06; // rsa = 1 → 60 ms at RR 1 s
export const A_LF_S = 0.03;
export const EPS_SD_S = 0.012;
export const MIN_RR_S = 0.2; // floor on a sinus RR (300/min), far above any sinus rate [ENG]

export interface HrvPhase {
  phi: number;
  psi: number;
}

/** Random starting phases for the RSA and LF oscillators, drawn once per engine from the 'hrv' stream. */
export function drawHrvPhase(s: Sfc32State): HrvPhase {
  return { phi: 2 * Math.PI * uniform(s), psi: 2 * Math.PI * uniform(s) };
}

/**
 * Respiratory phase term in [−1, 1] at time t (used for RSA, baseline wander and QRS amplitude modulation). With a
 * BreathClock (Stage 5.1, breath-clock.ts) it follows the breathing; without one, Stage 1's fixed 15/min clock.
 */
export function respSin(t: number, ph: HrvPhase, clock?: { phaseRad(t: number): number }): number {
  return clock ? Math.sin(clock.phaseRad(t)) : Math.sin(2 * Math.PI * F_RESP_HZ * t + ph.phi);
}

/** Next sinus RR interval (s) for a beat starting at time t. Consumes one normal draw when HRV is on. */
export function sinusRR(meanRR: number, t: number, ph: HrvPhase, mods: Pick<Modifiers, 'rsa' | 'hrvScale'>, s: Sfc32State, clock?: { phaseRad(t: number): number }): number {
  const k = mods.hrvScale;
  if (!(k > 0)) return meanRR;
  const rsa = A_RSA_MAX_S * mods.rsa * meanRR * k * respSin(t, ph, clock);
  const lf = A_LF_S * meanRR * k * Math.sin(2 * Math.PI * 0.1 * t + ph.psi);
  const eps = EPS_SD_S * meanRR * k * normal(s);
  return Math.max(MIN_RR_S, meanRR + rsa + lf + eps);
}
