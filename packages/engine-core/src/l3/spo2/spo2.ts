// SpO2 device chain (brief §4.3 "Device chain (L3)", §6.1; research 03 §3.6–3.7): site SaO2 (after the
// circulatory dead time, l2/gas/delay.ts) → first-order sensor lag τ 3 s → device bias → moving average →
// display update → validity from the pleth (pulse search, low perfusion, probe off, motion, CPR, same-limb
// cuff). Stepped at 10 Hz with the gas model. Plain data.
//
// E126 (owner ruling 2026-10-26, "mimic the real monitor"): with no pulsatile signal the oximeter cannot give a value
// and shows dashes (Masimo Radical-7 Operator's Manual LAB-5476J, p. 113 "Pulse Search", p. 114 "- -" = "Unable to
// provide a parameter value"); there is no held, marked number ("99?") any more. During chest compressions the pleth
// carries the compression-generated pulses (hemo pipeline: the circuit's forward volume per compression), so the value
// is the model's own saturation read through them, flagged questionable — the low signal confidence Masimo reports as
// "Low Signal IQ" (p. 24, p. 113) — and the alarm layer shows that as a message, never as a valid desaturation.
import type { Measured } from '../../types.ts';

export const SPO2_LAG_TAU_S = 3; // brief §4.3 step 3 [ENG]
/**
 * Masimo-SET-like default of the first skin (saadat-like): average 8 s, update 1 s (brief §4.3, §6.1). A skin's
 * `spo2.avgDefault` / `updateHz` replace it through `Spo2State.avgS/updS` (philips-like 10 s / 2 s).
 */
export const SPO2_PROFILE = { averagingS: 8, updateS: 1 } as const;
export const SPO2_STEP_S = 0.1;
/**
 * No completed pleth pulse for this long → no value (dashes, "pulse search"/"no pulse"). It was a 4 s hold with a
 * questionable "99?" and invalid only at 10 s (brief §4.3 "10–30 s"); E126 removed the held number [ENG: two missed
 * beats at 30/min].
 */
export const PULSE_LOST_S = 4;
export const LOW_PERF_PI = 0.3; // "LOW PERF" below PI 0.3 % (brief §4.3)
export const LOW_PERF_SLOWDOWN = 2; // low perfusion doubles the averaging window [ENG]

export interface Spo2Inputs {
  siteSa: number; // SaO2 at the probe site (0–1)
  probe: 'on' | 'off' | 'motion';
  lastFootT: number; // End of the last COMPLETED pleth pulse (s), −Infinity if none (one lone foot is not a pulse)
  pi: number | null; // measured PI (%), null when invalid
  cuffOnLimb: boolean; // same-limb NIBP cuff inflated: hold the value (brief §4.3 artefacts)
  cpr: boolean; // chest compressions move the probe: the signal's confidence is low, as with motion (E126)
}

export interface Spo2State {
  lag: number; // %
  ring: number[]; // lagged + biased values at 10 Hz, newest last (≤ 16 s × 2 × 10)
  shown: number | null; // displayed value (integer %)
  flag: Measured['flag'];
  nextUpdate: number;
  validSince: number; // time the pulse returned after an invalid spell (averaging must refill); 1e12 = invalid now
  bias: number; // per-patient device offset (%)
  /** The active skin's averaging window and display update (s); absent = SPO2_PROFILE. */
  avgS?: number;
  updS?: number;
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
  const avgS = st.avgS ?? SPO2_PROFILE.averagingS;
  const win = Math.round((avgS * (lowPerf ? LOW_PERF_SLOWDOWN : 1)) / SPO2_STEP_S);
  st.ring.push(v);
  while (st.ring.length > win) st.ring.shift();
  if (t + 1e-9 < st.nextUpdate) return;
  st.nextUpdate = t + (st.updS ?? SPO2_PROFILE.updateS);
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
  if (st.validSince === 1e12) st.validSince = t;
  if (t - st.validSince < avgS) return; // the average refills after a pulse returns (ROSC)
  st.shown = Math.round(st.ring.reduce((a, b) => a + b, 0) / st.ring.length);
  st.flag = x.probe === 'motion' || x.cpr || lowPerf ? 'questionable' : 'valid';
}

export function spo2Measured(st: Spo2State, t: number): Measured {
  return { value: st.shown, flag: st.shown === null ? 'invalid' : st.flag, at: t };
}

/** The beep's pitch at SpO2 100 %, Hz: measured on the Saadat unit (research/34 row 6, the owner's ruling). It was 880 Hz, the
 *  pitch of the alarm pulses, which made a beep and an alarm hard to tell apart. */
export const BEEP_BASE_HZ = 1245;

/**
 * QRS/pulse tone pitch from the displayed SpO2 (research 03 §3.6 item 6): f = BEEP_BASE_HZ·2^(−(100 − SpO2)·s/12) with
 * s = 0.1 semitone per % ("standard", ≈ 7 Hz/% near 1245 Hz). 90 % → 1175.1 Hz; it reaches 880 Hz only at 40 %.
 */
export function spo2PitchHz(spo2: number | null, semitonePerPct = 0.1): number {
  return spo2 === null ? BEEP_BASE_HZ : BEEP_BASE_HZ * 2 ** ((-(100 - spo2) * semitonePerPct) / 12);
}
