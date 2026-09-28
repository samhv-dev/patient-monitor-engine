// FU-4 G1/G3/G12: the emergent arrest state machine (MODELED and MANUAL alike). FU-3's hypoxic path (hypoxic-arrest.ts)
// declares an asphyxial arrest from the O2-content share of the myocardial deficit (cor.hyp); this module adds
//   (1) the LOW-FLOW arrest: the flow share of either ventricle (cor.kIsch, cor.kIschRv; no floor in MODELED since FU-4)
//       falls to K_ISCH_ARREST — the heart can no longer eject; or NO FLOW (continuous MAP < MAP_NO_FLOW for NO_FLOW_S),
//       the only route MANUAL can reach (its kIsch keeps R23's floor, coronary.ts K_ISCH_MIN_MANUAL). Onset rhythm: one
//       seeded draw — VF with a share rising with catecholamines, K and cold, asystole, else PEA on the running rhythm;
//   (2) the HAZARDS of a beating heart: hyperkalaemic sine wave → VF/asystole above K_HAZARD (the membrane-effective K,
//       so calcium delays it), and hypothermic VF below T_HAZARD;
//   (3) ROSC of an engine-declared organised arrest: once CPR (or the recovered circulation) has held the continuous
//       CPP ≥ CPP_ROSC (Paradis 1990) and the myocardium's state kIsch·(1 − hyp) ≥ M_ROSC for ROSC_HOLD_S, the
//       organised rhythm regains its pulse. VF needs a shock (Stage 4b's defibrillator, its outcome table unchanged);
//       a shock into an unrecovered myocardium re-arrests through (1) — the circulatory/metabolic phases of the
//       three-phase model (Weisfeldt & Becker 2002). Asystole stays (Q3).
// Every draw uses the engine's `outcome` stream and is taken only when a hazard is non-zero or an arrest is declared,
// so runs without them keep every stream untouched.
import type { RhythmId, RhythmOpts } from '../../types.ts';
import { NO_BEAT_RHYTHMS } from './coronary.ts';
import { P_ASYSTOLE_ONSET, P_VF_ONSET } from './hypoxic-arrest.ts';
import type { CircModelState } from './model.ts';

/** Contractility (flow share) at which the ischaemic heart no longer ejects: ≤ 10 % of rest — FU-3's HYP_ARREST analogue [ENG]. */
export const K_ISCH_ARREST = 0.1;
/**
 * No flow: a continuous MAP below this for NO_FLOW_S declares the arrest whatever the myocardial state says — the
 * diastolic pressure is then below the coronary zero-flow pressure P_ZF 15 (coronary.ts) [ENG: P_ZF + 10].
 */
export const MAP_NO_FLOW = 25;
export const NO_FLOW_S = 60;
/** Myocardial state kIsch·(1 − hyp) a resuscitated heart needs before an organised rhythm regains a pulse [ENG]. */
export const M_ROSC = 0.4;
/** Paradis 1990 (JAMA 263:1106): no ROSC below a CPR coronary perfusion pressure of 15 mmHg [P]. */
export const CPP_ROSC = 15;
/** How long the ROSC conditions must hold [ENG]. */
export const ROSC_HOLD_S = 60;
/** Hyperkalaemic arrest hazard above this membrane-effective K, per mmol/L above it: 1/K_HAZARD_S per second [ENG; Q5]. */
export const K_HAZARD = 8.5;
export const K_HAZARD_S = 120;
/** Hypothermic VF hazard below this core temperature, per °C below it: 1/T_HAZARD_S per second (ERC 2021: VF risk < 28 °C) [ENG]. */
export const T_HAZARD = 28;
export const T_HAZARD_S = 600;
/** FU-4 G8: hyperthermic VF hazard above this core temperature, per °C above it: 1/T_HOT_S per second (untreated MH:
 * VF with hyperkalaemia and hyperthermia — Miller, MH chapter [TXT]) [ENG; Q6]. */
export const T_HOT = 42;
export const T_HOT_S = 300;
/** VF share multipliers at an arrest's onset: per unit catecholamine inotropy, per mmol/L K above 6, per °C below 32 [ENG]. */
export const VF_CAT = 2;
export const VF_K = 0.5;
export const VF_T = 0.25;
export const VF_MAX = 0.6;

export interface ArrestRisk {
  kEcg: number;
  tempC: number;
  cat: number; // catecholamine inotropy above 1 (endogenous surge × drugs)
}
export type ArrestRequest = { id: RhythmId; opts: RhythmOpts; cause: string };

export function riskOf(m: CircModelState): ArrestRisk {
  const x = m.ext;
  return { kEcg: x.kEcg ?? 4.2, tempC: x.tempC ?? 37, cat: Math.max(0, (x.endoEesF ?? 1) - 1) + Math.max(0, (x.drug?.ees ?? 1) - 1) };
}

export function vfShare(r: ArrestRisk): number {
  return Math.min(VF_MAX, P_VF_ONSET * (1 + VF_CAT * r.cat + VF_K * Math.max(0, r.kEcg - 6) + VF_T * Math.max(0, 32 - r.tempC)));
}

/** The onset rhythm: VF (share by risk), asystole (FU-3's 2/30), else the organised rhythm continues pulseless (PEA). */
export function onsetRhythm(x: number, from: string, rate: number, pVf: number, cause: string): ArrestRequest {
  if (x < pVf) return { id: 'vfCoarse', opts: {}, cause };
  if (x < pVf + P_ASYSTOLE_ONSET) return { id: 'asystole', opts: {}, cause };
  return { id: from as RhythmId, opts: { pulseless: true, rateBpm: Math.round(Math.max(20, rate)) }, cause };
}

/** One step of dt seconds (1 Hz): an arrest to declare, or null. `u` draws one uniform from the outcome stream. */
export function arrestStep(m: CircModelState, rhythmId: string, pulseless: boolean, hrNow: number, u: () => number, dt: number): ArrestRequest | null {
  if (pulseless || NO_BEAT_RHYTHMS.has(rhythmId)) {
    m.noFlowS = 0;
    return null;
  }
  const r = riskOf(m);
  m.noFlowS = m.mapNow < MAP_NO_FLOW ? m.noFlowS + dt : 0;
  if (Math.min(m.cor.kIsch, m.cor.kIschRv) <= K_ISCH_ARREST || m.noFlowS >= NO_FLOW_S) return onsetRhythm(u(), rhythmId, hrNow, vfShare(r), 'lowFlow');
  const lamK = Math.max(0, r.kEcg - K_HAZARD) / K_HAZARD_S;
  const lamT = Math.max(0, T_HAZARD - r.tempC) / T_HAZARD_S + Math.max(0, r.tempC - T_HOT) / T_HOT_S; // FU-4 G12 cold, G8 hot
  const lam = (lamK + lamT) * dt;
  if (lam <= 0) return null;
  if (u() >= lam) return null;
  if (u() * (lamK + lamT) < lamK) return { id: u() < 0.5 ? 'vfCoarse' : 'asystole', opts: {}, cause: 'hyperkalaemia' };
  return { id: 'vfCoarse', opts: {}, cause: r.tempC > T_HOT ? 'hyperthermia' : 'hypothermia' };
}

/** ROSC of an engine-declared organised arrest (PEA): the rhythm it came from, with a pulse, or null. */
export function roscStep(m: CircModelState, rhythmId: string, pulseless: boolean, cpp: number, dt: number): { id: RhythmId; opts: RhythmOpts } | null {
  const a = m.arrest;
  if (!a) return null;
  if (!pulseless && !NO_BEAT_RHYTHMS.has(rhythmId)) {
    m.arrest = null; // a pulse returned another way (shock, instructor)
    return null;
  }
  if (NO_BEAT_RHYTHMS.has(rhythmId)) return null; // VF needs a shock; asystole stays (Q3)
  const ok = cpp >= CPP_ROSC && m.cor.kIsch * (1 - m.cor.hyp) >= M_ROSC;
  a.roscS = ok ? a.roscS + dt : 0;
  if (a.roscS < ROSC_HOLD_S) return null;
  m.arrest = null;
  return { id: rhythmId as RhythmId, opts: {} };
}
