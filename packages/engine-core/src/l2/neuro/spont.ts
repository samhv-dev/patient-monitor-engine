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
/**
 * FU-3 item 16 (E-FU3-10, orchestrator ruling 2026-09-27): brainstem-perfusion gate. After the circulation stops,
 * agonal gasps persist for seconds to ≈ 2 min, then apnoea; after the circulation returns the drive comes back over
 * minutes (Clark JJ et al., Ann Emerg Med 1992;21:1464–1467; Bobrow BJ et al., Circulation 2008;118:2550–2554) [P].
 * The gate closes when 7d's CBF is below BRAINSTEM_CBF_MIN or there is no flow at all (pulseless / CO 0).
 */
export const BRAINSTEM_CBF_MIN = 0.2; // CBF < 20 % of rest (the ruling's threshold) [ENG]
export const GASP_ONSET_S = 30; // unperfused for > 30 s → gasps only [ENG, ruling]
export const GASP_END_S = 120; // gasps fade to apnoea by 2 min [ENG, ruling]
export const GASP_RR = 6; // gasp rate ceiling (/min) [ENG, ruling "RR ≤ 6"]
export const GASP_VT_FRAC = 0.3; // gasp VT ceiling × the resting VT ("small VT") [ENG]
export const GATE_REOPEN_S = 120; // the drive reopens linearly over 2 min once perfused [ENG, ruling "1–3 min"]
/**
 * FU-6 R3(a): the CO2 stimulus is partly CENTRAL (brain ECF PCO2, τ ≈ 60–150 s) and partly peripheral (carotid, fast):
 * Dahan et al. 1990 J Physiol 423:615 (dynamic end-tidal forcing: central τ ≈ 100 s, peripheral share ≈ 0.3) [TXT;
 * τ 90 s ENG]. The drive reads 0.3·PaCO2 + 0.7·Pc. At steady state Pc = PaCO2 (no change to any resting value).
 */
export const CENTRAL_TAU_S = 90;
export const PERIPH_SHARE = 0.3;

export interface SpontDrive {
  rr: number; // < 0: not yet evaluated (driverCtx falls back to the rr/vt targets)
  vt: number;
  ve: number;
  fatigue: number; // 1 fresh → 0.3 exhausted (7b)
  paco2Rest: number; // resting PaCO2 of the MANUAL etco2 calibration (NaN until it runs)
  paco2Set: number;
  nextT: number;
  anoxS?: number; // FU-3 item 16 (E-FU3-10): seconds without brainstem perfusion (absent while perfused)
  gate?: number; // FU-3 item 16 (E-FU3-10): 0 → 1 while the drive reopens after an anoxic spell (absent = open)
  pc?: number; // FU-6 R3(a): central (brain) PCO2 the drive reads, mmHg (absent = PaCO2)
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
  noFlow?: boolean; // FU-3 item 16 (E-FU3-10): no circulation (pulseless rhythm or cardiac output 0)
  wakeMmHg?: number; // FU-6 F7: the patient's drawn wakefulness shift (resp pipeline; absent = WAKE_MMHG)
  cbfRel?: number; // FU-3 item 16 (E-FU3-10): 7d's organs.brain.cbfRel (absent without 7d)
}

export function stepSpontDrive(s: SpontDrive, x: SpontInputs): void {
  if (x.t + 1e-9 < s.nextT) return;
  s.nextT = x.t + SPONT_DT_S;
  if (Number.isNaN(s.paco2Rest)) s.paco2Rest = x.paco2;
  s.paco2Set = paco2SetPoint(s.paco2Rest, x.hco3);
  const n = x.neuro;
  s.pc = (s.pc ?? x.paco2) + (x.paco2 - (s.pc ?? x.paco2)) * (1 - Math.exp(-SPONT_DT_S / CENTRAL_TAU_S)); // FU-6 R3(a)
  const out = drive({
    paco2: PERIPH_SHARE * x.paco2 + (1 - PERIPH_SHARE) * s.pc, pao2: x.pao2, paco2Set: s.paco2Set, ve0: (x.rr0 * x.vt0) / 1000, co2SlopeMult: x.co2SlopeMult,
    opioidDep: n?.opioidDep ?? 0, hypnoticDep: n?.hypnoticDep ?? 0, pain: 0, evlwi: x.evlwi, vt0: x.vt0, rr0: x.rr0,
    wakeMmHg: x.wakeMmHg, // FU-6 F7: this patient's drawn wakefulness shift
    wake: n?.loc ?? 0, apnoeic: s.rr === 0, // FU-6 R3(a)
  }, s.fatigue);
  const strength = n?.pMaxMult ?? 1;
  let { rr, vt } = out;
  if (strength < DIAPH_APNOEA) rr = vt = 0;
  else if (n) vt *= n.nmbVtMult * (1 - Math.min(0.9, n.obstruction));
  // FU-3 item 16 (E-FU3-10): brainstem-perfusion gate
  const unperfused = x.noFlow === true || (x.cbfRel !== undefined && x.cbfRel < BRAINSTEM_CBF_MIN);
  if (unperfused) s.anoxS = (s.anoxS ?? 0) + SPONT_DT_S;
  else if (s.anoxS !== undefined) {
    if (s.anoxS > GASP_ONSET_S) s.gate = 0; // a gasping or apnoeic brainstem recovers over GATE_REOPEN_S
    delete s.anoxS;
  }
  const anox = s.anoxS ?? 0;
  if (anox > GASP_ONSET_S) {
    const fade = Math.max(0, 1 - (anox - GASP_ONSET_S) / (GASP_END_S - GASP_ONSET_S));
    rr = Math.min(rr, GASP_RR * fade);
    vt = Math.min(vt, GASP_VT_FRAC * x.vt0 * fade);
    if (fade <= 0) rr = vt = 0;
  } else if (s.gate !== undefined) {
    if (!unperfused) s.gate = Math.min(1, s.gate + SPONT_DT_S / GATE_REOPEN_S);
    rr *= s.gate;
    if (s.gate >= 1) delete s.gate;
  }
  s.rr = rr;
  s.vt = vt;
  s.ve = (rr * vt) / 1000;
  if (rr > 0) {
    const ttot = 60 / rr;
    s.fatigue = stepFatigue(s.fatigue, pti(vt, x.complianceMl, x.resistance, TI_FRAC * ttot, ttot, strength * x.pMaxMult), SPONT_DT_S);
  }
}
