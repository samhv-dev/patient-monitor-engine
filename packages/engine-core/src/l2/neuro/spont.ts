// MODELED spontaneous breathing (G7b ruling 8, R51 addendum 17): Stage 7b's chemoreflex drive, work of breathing and
// fatigue (l2/lung/drive.ts: drive(), pti(), stepFatigue() — 7b left them unwired) set the rate and tidal volume of
// spontaneous cycles in MODELED mode, with 7f's depression on top. MANUAL keeps the instructor's rr/vt × 7f's
// multipliers (driverCtx). Re-evaluated at 1 Hz on the gas grid; plain data (snapshots, look-ahead clone).
//   set point: the resting PaCO2 the MANUAL etco2 calibration placed (paco2Rest), lowered in metabolic acidosis to
//     Winter's expected PaCO2 = 1.5·HCO3 + 8 (Albert, Dell & Winters 1967; ±2) — HCO3 from 7c's blood.core.ab.hco3
//     (24 without 7c → no shift): paco2Set = min(paco2Rest, 1.5·HCO3 + 8). Metabolic alkalosis is not compensated (v1).
//   drive: 7b's VE = [S·(PaCO2 − B)]₊·H(PaO2)·(1 − opioidDep)·(1 − hypnoticDep)·F with 7f's opioidDep/hypnoticDep
//     (fixed-CO2 depression, decision 7); the resting pattern rr0/vt0 is the instructor's rr/vt target.
//   NMB: VT × nmbVtMult (diaphragm strength), apnoea below DIAPH_APNOEA strength; upper-airway obstruction × (1 − obs);
//     pti's pMax × diaphragm strength × 7b's condition pMax (fatigue comes sooner in a weak patient).
import { drive, pti, stepFatigue } from '../lung/drive.ts';
import { DIAPH_APNOEA, type NeuroResp } from './drive.ts';

export const SPONT_DT_S = 1;
export const WINTER_SLOPE = 1.5;
export const WINTER_OFFSET = 8;
/** Spontaneous Ti/Ttot (Stage 3 driver's SPONT_TI_FRACTION 0.38). */
const TI_FRAC = 0.38;

export interface SpontDrive {
  rr: number; // < 0: not yet evaluated (driverCtx falls back to the rr/vt targets)
  vt: number;
  ve: number;
  fatigue: number; // 1 fresh → 0.3 exhausted (7b)
  paco2Rest: number; // resting PaCO2 of the MANUAL etco2 calibration (NaN until it runs)
  paco2Set: number;
  nextT: number;
}

export function createSpontDrive(): SpontDrive {
  return { rr: -1, vt: 0, ve: 0, fatigue: 1, paco2Rest: Number.NaN, paco2Set: Number.NaN, nextT: 0 };
}

/** Winter's expected PaCO2 in metabolic acidosis (mmHg). */
export function winterPaco2(hco3: number): number {
  return WINTER_SLOPE * hco3 + WINTER_OFFSET;
}

/** The chemoreflex set point: the resting PaCO2, lowered to Winter's value in metabolic acidosis only. */
export function paco2SetPoint(paco2Rest: number, hco3: number): number {
  return Math.min(paco2Rest, winterPaco2(hco3));
}

export interface SpontInputs {
  t: number;
  paco2: number; // arterial (Stage 3's fast CO2 compartment)
  pao2: number;
  hco3: number; // 7c's blood.core.ab.hco3 (24 without 7c)
  rr0: number; // instructor's rr/vt targets = the resting pattern
  vt0: number;
  co2SlopeMult: number; // 7b's condition co2Slope (COPD)
  pMaxMult: number; // 7b's condition pMax
  evlwi: number; // mL/kg (J-receptor term)
  complianceMl: number; // mL/cmH2O
  resistance: number; // cmH2O·s/L
  neuro?: NeuroResp;
}

export function stepSpontDrive(s: SpontDrive, x: SpontInputs): void {
  if (x.t + 1e-9 < s.nextT) return;
  s.nextT = x.t + SPONT_DT_S;
  if (Number.isNaN(s.paco2Rest)) s.paco2Rest = x.paco2;
  s.paco2Set = paco2SetPoint(s.paco2Rest, x.hco3);
  const n = x.neuro;
  const out = drive({
    paco2: x.paco2, pao2: x.pao2, paco2Set: s.paco2Set, ve0: (x.rr0 * x.vt0) / 1000, co2SlopeMult: x.co2SlopeMult,
    opioidDep: n?.opioidDep ?? 0, hypnoticDep: n?.hypnoticDep ?? 0, pain: 0, evlwi: x.evlwi, vt0: x.vt0, rr0: x.rr0,
  }, s.fatigue);
  const strength = n?.pMaxMult ?? 1;
  let { rr, vt } = out;
  if (strength < DIAPH_APNOEA) rr = vt = 0;
  else if (n) vt *= n.nmbVtMult * (1 - Math.min(0.9, n.obstruction));
  s.rr = rr;
  s.vt = vt;
  s.ve = (rr * vt) / 1000;
  if (rr > 0) {
    const ttot = 60 / rr;
    s.fatigue = stepFatigue(s.fatigue, pti(vt, x.complianceMl, x.resistance, TI_FRAC * ttot, ttot, strength * x.pMaxMult), SPONT_DT_S);
  }
}
