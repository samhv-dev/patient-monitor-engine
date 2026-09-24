// Electrode / amplifier front end, per lead (brief §5 "Artefacts", §6.5 "Shock artefact"; research 03 §1.9,
// §1.11). Pure functions of (modifiers, lead, sample index): deterministic, snapshot-free and identical in the
// committed pass and the look-ahead pass. Lead-specific constants come from a hash of the lead name.
import { hash53 } from '../../../rng/sfc32.ts';
import type { LeadId, Modifiers } from '../../../types.ts';

export const RAIL_MV = 5; // amplifier saturation [ENG]
export const MAINS_MAX_MV = 0.5; // 0.01–0.5 mV
const MAINS_H3 = 0.3; // 3rd harmonic relative amplitude [ENG]
export const MOTION_MAX_MV = 3; // 0.5–5 mV
const DIATHERMY_MV = 8; // broadband, saturating [ENG]
const SHOCK_SAT_MIN_S = 0.05; // rail for 50–500 ms, longer at higher energy
const SHOCK_SAT_SPAN_S = 0.45;
const SHOCK_TAU_MIN_S = 0.5; // recovery τ 0.5–1.0 s so the baseline is back < 5 s (brief §6.5)
const SHOCK_TAU_SPAN_S = 0.5;
const SHOCK_OFFSET_MIN_MV = 1; // post-saturation offset step 1–3 mV [ENG]
const SHOCK_OFFSET_SPAN_MV = 2;

/** Four uniform [0,1) numbers fixed per lead (and optionally per event), from a hash. */
function leadRand(lead: LeadId, salt: number): [number, number, number, number] {
  const [a, b] = hash53(lead, salt);
  const [c, d] = hash53(`${lead}#`, salt ^ 0x5bd1e995);
  return [a / 4294967296, b / 4294967296, c / 4294967296, d / 4294967296];
}

/** Deterministic zero-mean noise in [−1, 1] per (lead, sample). */
function hashNoise(lead: LeadId, n: number): number {
  const [a, b] = hash53(lead, n);
  return (a / 4294967296 + b / 4294967296 - 1);
}

export function mainsStage(mods: Modifiers, mainsHz: 50 | 60, lead: LeadId, n: number, v: number): number {
  const lvl = mods.artefact.mains;
  if (lvl <= 0) return v;
  const [g, ph] = leadRand(lead, 1);
  const a = lvl * MAINS_MAX_MV * (0.6 + 0.8 * g);
  const s = n / 500;
  return v + a * (Math.sin(2 * Math.PI * mainsHz * s + 2 * Math.PI * ph) + MAINS_H3 * Math.sin(2 * Math.PI * 3 * mainsHz * s + 4 * Math.PI * ph));
}

export function motionStage(mods: Modifiers, _mainsHz: 50 | 60, lead: LeadId, n: number, v: number): number {
  const lvl = mods.artefact.motion;
  if (lvl <= 0) return v;
  const [r1, r2, r3, r4] = leadRand(lead, 2);
  const s = n / 500;
  const env = Math.max(0, Math.sin(2 * Math.PI * 0.07 * s + 2 * Math.PI * r4)) ** 2; // intermittent bursts [ENG]
  const m = 0.5 * Math.sin(2 * Math.PI * 0.6 * (0.8 + 0.4 * r1) * s) + 0.3 * Math.sin(2 * Math.PI * 1.3 * (0.8 + 0.4 * r2) * s + 1) + 0.2 * Math.sin(2 * Math.PI * 2.4 * (0.8 + 0.4 * r3) * s + 2);
  return v + lvl * MOTION_MAX_MV * env * m * 2;
}

export function diathermyStage(mods: Modifiers, _mainsHz: 50 | 60, lead: LeadId, n: number, v: number): number {
  const b = mods.artefact.electrosurgery;
  const s = n / 500;
  if (!b || s < b.atS || s > b.atS + b.durationS) return v;
  return v + DIATHERMY_MV * hashNoise(lead, n);
}

/** Per-lead shock response: saturation time, rail sign, offset (mV) and recovery τ (s). */
export function shockResponse(lead: LeadId, atS: number, energyJ: number): { satS: number; sign: number; offsetMv: number; tauS: number } {
  const [r1, r2, r3, r4] = leadRand(lead, Math.round(atS * 1000));
  return {
    satS: SHOCK_SAT_MIN_S + SHOCK_SAT_SPAN_S * Math.min(1, energyJ / 360) * (0.7 + 0.3 * r1),
    sign: r2 < 0.5 ? -1 : 1,
    offsetMv: (r3 < 0.5 ? -1 : 1) * (SHOCK_OFFSET_MIN_MV + SHOCK_OFFSET_SPAN_MV * r3),
    tauS: SHOCK_TAU_MIN_S + SHOCK_TAU_SPAN_S * r4,
  };
}

export function shockStage(mods: Modifiers, _mainsHz: 50 | 60, lead: LeadId, n: number, v: number): number {
  const sh = mods.artefact.shock;
  const s = n / 500;
  if (!sh || s < sh.atS) return v;
  const r = shockResponse(lead, sh.atS, sh.energyJ);
  const dt = s - sh.atS;
  if (dt < r.satS) return r.sign * RAIL_MV;
  return v + r.offsetMv * Math.exp(-(dt - r.satS) / r.tauS);
}

export function leadOffStage(mods: Modifiers, _mainsHz: 50 | 60, _lead: LeadId, _n: number, v: number): number {
  return mods.artefact.leadOff ? 0 : v;
}

export function railStage(_mods: Modifiers, _mainsHz: 50 | 60, _lead: LeadId, _n: number, v: number): number {
  return Math.min(RAIL_MV, Math.max(-RAIL_MV, v));
}
