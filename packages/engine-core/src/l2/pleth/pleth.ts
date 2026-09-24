// Plethysmogram generator (brief §4.3 "Pleth"; research 03 §3.1–3.4). One pulse per MECHANICAL beat (so
// pulse deficits come for free), placed at t_R + PEP + site delay, built from two Gaussian kernels in time
// (Tang et al. 2020 "excellent" pulse, converted from the phase circle at RR 1 s: θ1 −1.5161 → peak 0.259 s,
// b1 0.6303 → σ 0.100 s; θ2 0.8186 → 0.630 s, b2 1.0225 → σ 0.163 s), time-scaled by LVET/311 ms.
// Amplitude = PI × (SV_i/SV_0)^γ with γ = 1, carried in PI units so the L3 PI numeric is measured from
// the trace. Vascular tone sets a2/a1: vasodilated 0.4–0.6, vasoconstricted 0.1–0.2.
import { uniform, type Sfc32State } from '../../rng/sfc32.ts';
import type { Spo2Site } from '../../types-hemo.ts';
import { EAR_DELAY_S, FINGER_DELAY_S, WK_R0 } from '../hemo/params.ts';

export const PLETH_KERNEL = { mu1: 0.259, s1: 0.1003, mu2: 0.63, s2: 0.1627 } as const;
const LVET_REF_S = 0.311; // Weissler LVET at 60 bpm
const SUPPORT_S = 1.3; // μ2 + 4σ2 at scale 1
const LEAD_S = 0.15; // μ1 − 4σ1 ≈ −0.14 s: the systolic kernel starts before its origin (no step at the foot)

export interface PlethPulse {
  t0: number;
  amp: number; // PI units (%)
  sc: number; // time scale (LVET / 311 ms)
  a2: number; // diastolic / systolic kernel ratio
}

export interface PlethState {
  state: 'on' | 'off' | 'motion';
  site: Spo2Site;
  pulses: PlethPulse[];
  motion: number[]; // phases of the motion artefact sinusoids
}

export function createPlethState(state: PlethState['state'] = 'on', site: Spo2Site = 'leftFinger'): PlethState {
  return { state, site, pulses: [], motion: [0, 0, 0] };
}

/** Site delay after aortic valve opening (research 03 §2.1: finger PPG foot 200–300 ms after R). */
export function plethDelayS(site: Spo2Site): number {
  return site === 'ear' || site === 'forehead' ? EAR_DELAY_S : FINGER_DELAY_S;
}

/** a2/a1 from systemic resistance: R halved → 0.5 (vasodilated), R doubled → 0.1 (vasoconstricted) [ENG]. */
export function toneRatio(R: number): number {
  return Math.min(0.6, Math.max(0.08, 0.2 - 0.3 * Math.log2(R / WK_R0)));
}

export function addPlethPulse(st: PlethState, t0: number, amp: number, lvet: number, R: number): void {
  if (!(amp > 0)) return;
  st.pulses.push({ t0, amp, sc: lvet / LVET_REF_S, a2: toneRatio(R) });
}

/** One pulse shape at u seconds after its origin; peak ≈ 1. */
export function plethShape(p: PlethPulse, u: number): number {
  const k = PLETH_KERNEL;
  const d1 = u - k.mu1 * p.sc;
  const d2 = u - k.mu2 * p.sc;
  const s1 = k.s1 * p.sc;
  const s2 = k.s2 * p.sc;
  return (Math.exp((-d1 * d1) / (2 * s1 * s1)) + p.a2 * Math.exp((-d2 * d2) / (2 * s2 * s2))) / (1 + 0.075 * p.a2);
}

/** Pleth sample at time t. `occlusion` ∈ [0, 1] is 1 with no cuff on the same limb. */
export function plethAt(st: PlethState, t: number, occlusion: number, pi: number): number {
  if (st.state === 'off') return 0;
  let v = 0;
  for (const p of st.pulses) {
    const u = t - p.t0;
    if (u > -LEAD_S * p.sc && u < SUPPORT_S * p.sc) v += p.amp * plethShape(p, u);
  }
  v *= occlusion;
  if (st.state === 'motion') {
    // motion artefact 0.5–5 Hz, larger than the pulse (research 03 §3.4) [ENG]
    const m = st.motion;
    v += 1.5 * pi * (Math.sin(2 * Math.PI * 1.3 * t + (m[0] as number)) + 0.6 * Math.sin(2 * Math.PI * 2.7 * t + (m[1] as number)) + 0.4 * Math.sin(2 * Math.PI * 0.7 * t + (m[2] as number)));
  }
  return v;
}

export function prunePleth(st: PlethState, t: number): void {
  st.pulses = st.pulses.filter((p) => p.t0 + SUPPORT_S * p.sc >= t);
}

/** attachSensor spo2 (brief §6.2): on / off / motion, site. Motion phases come from the artefact stream. */
export function setPlethSensor(st: PlethState, state: PlethState['state'], site: Spo2Site | undefined, rng: Sfc32State): void {
  st.state = state;
  if (site) st.site = site;
  if (state === 'motion') st.motion = [0, 1, 2].map(() => 2 * Math.PI * uniform(rng));
}
