// SpO2 device chain (brief §4.3 "Device chain (L3)", §6.1; research 03 §3.6–3.7): site SaO2 (after the
// circulatory dead time, l2/gas/delay.ts) → first-order sensor lag τ 3 s → device bias → moving average →
// display update → validity from the pleth (pulse search, low perfusion, probe off, motion, CPR, same-limb
// cuff). Stepped at 10 Hz with the gas model. Plain data.
import type { Measured } from '../../types.ts';

export const SPO2_LAG_TAU_S = 3; // brief §4.3 step 3 [ENG]
/** Masimo-SET-like default of the first skin (saadat-like, R13/R14): average 8 s, update 1 s (brief §4.3, §6.1). */
export const SPO2_PROFILE = { averagingS: 8, updateS: 1 } as const;
export const SPO2_STEP_S = 0.1;
export const PULSE_HOLD_S = 4; // no pleth foot for 4 s → value held, questionable [ENG]
export const PULSE_LOST_S = 10; // … for 10 s → invalid, "no pulse" (brief §4.3 Arrest: 10–30 s)
export const LOW_PERF_PI = 0.3; // "LOW PERF" below PI 0.3 % (brief §4.3)
export const LOW_PERF_SLOWDOWN = 2; // low perfusion doubles the averaging window [ENG]

export interface Spo2Inputs {
  siteSa: number; // SaO2 at the probe site (0–1)
  probe: 'on' | 'off' | 'motion';
  lastFootT: number; // last detected pleth foot (s), −Infinity if none
  pi: number | null; // measured PI (%), null when invalid
  cuffOnLimb: boolean; // same-limb NIBP cuff inflated: hold the value (brief §4.3 artefacts)
  cpr: boolean;
}

export interface Spo2State {
  lag: number; // %
  ring: number[]; // lagged + biased values at 10 Hz, newest last (≤ 16 s × 2 × 10)
  shown: number | null; // displayed value (integer %)
  flag: Measured['flag'];
  nextUpdate: number;
  validSince: number; // time the pulse returned after an invalid spell (averaging must refill); 1e12 = invalid now
  bias: number; // per-patient device offset (%)
}

export function createSpo2(sa0: number, bias: number): Spo2State {
  return { lag: sa0 * 100, ring: [], shown: Math.round(sa0 * 100 + bias), flag: 'valid', nextUpdate: 0, validSince: -1e12, bias };
}

/** Device bias: the per-patient offset above 80 %, plus under-reading that grows below 80 % (research 03 §3.6). */
export function deviceBias(sat: number, bias: number): number {
  return bias - (sat < 80 ? 0.1 * (80 - sat) : 0);
}

export function stepSpo2(st: Spo2State, x: Spo2Inputs, t: number): void {
  st.lag += (x.siteSa * 100 - st.lag) * (1 - Math.exp(-SPO2_STEP_S / SPO2_LAG_TAU_S));
  const v = Math.min(100, Math.max(0, st.lag + deviceBias(st.lag, st.bias)));
  const lowPerf = x.pi !== null && x.pi < LOW_PERF_PI;
  const win = Math.round((SPO2_PROFILE.averagingS * (lowPerf ? LOW_PERF_SLOWDOWN : 1)) / SPO2_STEP_S);
  st.ring.push(v);
  while (st.ring.length > win) st.ring.shift();
  if (t + 1e-9 < st.nextUpdate) return;
  st.nextUpdate = t + SPO2_PROFILE.updateS;
  const noPulse = t - x.lastFootT;
  if (x.probe === 'off') {
    st.shown = null;
    st.flag = 'invalid';
    st.validSince = 1e12;
    return;
  }
  if (x.cuffOnLimb && st.shown !== null) return; // hold the last value while the cuff occludes the limb
  if (noPulse > PULSE_LOST_S) {
    st.shown = null;
    st.flag = 'invalid';
    st.validSince = 1e12;
    return;
  }
  if (noPulse > PULSE_HOLD_S) {
    st.flag = st.shown === null ? 'invalid' : 'questionable';
    return;
  }
  if (st.validSince === 1e12) st.validSince = t;
  if (t - st.validSince < SPO2_PROFILE.averagingS) return; // the average refills after a pulse returns (ROSC)
  st.shown = Math.round(st.ring.reduce((a, b) => a + b, 0) / st.ring.length);
  st.flag = x.probe === 'motion' || x.cpr || lowPerf ? 'questionable' : 'valid';
}

export function spo2Measured(st: Spo2State, t: number): Measured {
  return { value: st.shown, flag: st.shown === null ? 'invalid' : st.flag, at: t };
}

/**
 * QRS/pulse tone pitch from the displayed SpO2 (research 03 §3.6 item 6): f = 880·2^(−(100 − SpO2)·s/12) with
 * s = 0.1 semitone per % ("standard", ≈ 5 Hz/% near 880 Hz). 90 % → 830.6 Hz (BUILD-PLAN Stage 3 test 9).
 */
export function spo2PitchHz(spo2: number | null, semitonePerPct = 0.1): number {
  return spo2 === null ? 880 : 880 * 2 ** ((-(100 - spo2) * semitonePerPct) / 12);
}
