// Respiratory clock seam for the ECG (Stage 5.1, ruling R29 item R-S3-3): RSA, respiratory baseline wander and QRS
// amplitude modulation read a BreathClock instead of Stage 1's fixed 15/min sinusoid. The default is that sinusoid,
// bit-identical; a breath driver (Stage 3's, once merged) plugs in through cycleBreathClock without this module
// importing it (structural typing only).
import { F_RESP_HZ, type HrvPhase } from './hrv.ts';

export interface BreathClock {
  /** Breaths per minute at sim time t (0 = no breath in progress: apnoea). */
  rateBpm(t: number): number;
  /** Unwrapped respiratory phase angle at t, radians; the ECG uses sin(phaseRad(t)) (+1 = slowest heart rate). */
  phaseRad(t: number): number;
}

/** Stage 1's fixed 15/min clock: phaseRad = 2π·0.25·t + φ, exactly the expression hrv.ts has always used. */
export function fixedBreathClock(ph: HrvPhase): BreathClock {
  return { rateBpm: () => F_RESP_HZ * 60, phaseRad: (t) => 2 * Math.PI * F_RESP_HZ * t + ph.phi };
}

/** The part of a breath cycle the clock needs (Stage 3's `Cycle` has these fields). */
export interface BreathCycleLike {
  seq: number;
  t0: number;
  ti: number;
  te: number;
}

/**
 * A clock driven by breath cycles: phase advances 2π per cycle (inspiration onset = +π/2, so the heart is slowest at
 * the start of inspiration and fastest half a cycle later [ENG]); after the last cycle ends the phase holds (apnoea:
 * RR and wander stop swinging) and the rate reads 0. Before the first cycle the fallback clock is used.
 */
export function cycleBreathClock(lastCycleBefore: (t: number) => BreathCycleLike | undefined, fallback: BreathClock): BreathClock {
  return {
    rateBpm(t) {
      const c = lastCycleBefore(t);
      if (!c) return fallback.rateBpm(t);
      const T = c.ti + c.te;
      return T > 0 && t - c.t0 <= T ? 60 / T : 0;
    },
    phaseRad(t) {
      const c = lastCycleBefore(t);
      if (!c) return fallback.phaseRad(t);
      const T = Math.max(1e-3, c.ti + c.te);
      return 2 * Math.PI * (c.seq + Math.min(1, (t - c.t0) / T)) + Math.PI / 2;
    },
  };
}
