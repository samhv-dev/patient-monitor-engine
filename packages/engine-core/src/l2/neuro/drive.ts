// Respiratory-drive depression (tables §5d "Respiratory-drive depression" feeding §4.6) and the NMB ventilatory
// consequence. Outputs are the Stage 7b drive inputs (opioidDep, hypnoticDep: depression of VE at a FIXED PaCO2) plus
// the multipliers Stage 3's MANUAL spontaneous breathing uses on the instructor's rr/vt (RESTING ventilation, where the
// rise in PaCO2 partly compensates), the NMB strength (pMax) and the airway flags. Concentrations come from 7g's bus
// (bus.ts): the opioid input is the remifentanil-equivalent at 7g's SEPARATE ventilatory site (R51 §2).
//   opioid:   dOp = x^1.25/(1 + x^1.25), x = Ce_vent,remi-eq/0.92 ng/mL (Bouillon 2003; fentanyl 0.55× in bus.ts, D-7f-3, Q54)
//   hypnotic: propofol C50 1.17 µg/mL, h 1.5 [ENG: Nieuwenhuijs 2003 −44 % at 1 µg/mL]; volatile C50 0.8 MAC, h 2 [ENG:
//             co2Slope ×0.4 at 1 MAC]; midazolam C50 150 ng/mL [VERIFY]; ketamine ≤ 0.3 [TXT: minimal]
//   synergy:  1 − (1 − dOp)(1 − dHyp)(1 − 0.5·dOp·dHyp) (Nieuwenhuijs 2003 "opioid–propofol synergy") [ENG size]
//   resting VE (MANUAL): (1 − dOp²)(1 − dHyp^2.48)(1 − 0.5·dOp·dHyp): remi 1 ng/mL −28 %, propofol 1 µg/mL −13 %
//             (Nieuwenhuijs 2003 resting values); pattern: opioid → RR falls, VT kept (slow, deep); hypnotic → VT falls,
//             RR rises (rapid, shallow) (tables §5d); apnoea when resting VE < 0.42 (resumes > 0.5) [ENG: propofol 2.5 mg/kg → brief apnoea].
export const REMI_VENT_C50 = 0.92;
export const REMI_VENT_H = 1.25;
export const PROP_VENT_C50 = 1170;
export const VOL_VENT_C50 = 0.8;
export const MIDAZ_VENT_C50 = 150;
export const SYNERGY = 0.5;
export const APNOEA_IN = 0.42;
export const APNOEA_OUT = 0.5;
export const DIAPH_WEAK = 0.3; // diaphragm strength below which VT falls (reserve) [ENG]
export const DIAPH_APNOEA = 0.05; // no effective breath below 5 % strength [ENG]
/**
 * FU-6 R3/R4 (E-FU6-2): loss of consciousness (depth.ts `hypnotic` level, ≥ 1 unconscious) as a 0–1 ramp over 0.6–1.0
 * (fully 'unconscious' from the LOC C50 up) — what removes the wakefulness drive (R3) and makes the lungs
 * "anaesthetised" (R4). [ENG ramp around depth.ts's LOC = 1]
 */
export const LOC_LO = 0.6;
export const LOC_HI = 1.0;
/**
 * FU-6 R3(d) (Q-FU6-4 ruled, D21): the share of a residual block's upper-airway obstruction that survives full
 * WAKEFULNESS. An awake patient defends his airway with phasic dilator (genioglossus) tone, so the same TOFR obstructs
 * him far less than the sedated patient of the parameter tables §4.6 `uaCollapse` row: Eikermann et al. 2003 AJRCCM
 * 167:1024 — awake volunteers at TOFR 0.5–0.7 keep a near-normal VT while upper-airway dilator function is measurably
 * impaired (so the load is small, not absent). [ENG 0.25; fit target: the awake rows of E-FU6-10.]
 */
export const UA_AROUSAL = 0.25;

export interface DriveInputs {
  vent: { opioid: number; propofol: number; midazolam: number; ketamine: number }; // ng/mL(-eq), bus.ts
  macVolatile: number; // brain MAC fraction of the potent volatiles (N2O excluded)
  diaBlock: number; // 0–1
  tofr: number; // thumb TOF ratio (pharyngeal weakness proxy)
  di: number; // raw depth index
  naturalAirway: boolean; // no tube / supraglottic device
  wasApnoeic: boolean;
  hypnotic?: number; // FU-6: depth.ts consciousness level (≥ 1 unconscious); absent = awake
}

export interface NeuroResp {
  opioidDep: number;
  hypnoticDep: number;
  totalDep: number;
  veRest: number;
  rrMult: number;
  vtMult: number;
  apnoea: boolean;
  pMaxMult: number;
  obstruction: number; // 0–1 upper-airway obstruction (natural airway only); ≥ 0.9 = complete
  nmbVtMult: number; // VT factor from diaphragm weakness alone (Stage 7b's MODELED path multiplies its own VT by it)
  cleft: number; // 0–1 own diaphragmatic effort visible during mechanical breaths while a block wears off
  loc: number; // FU-6 R3/R4: 0 awake … 1 unconscious (LOC_LO–LOC_HI ramp of the hypnotic level)
}

const hill = (x: number, h: number) => (x > 0 ? x ** h / (1 + x ** h) : 0);

export function neuroResp(x: DriveInputs): NeuroResp {
  const dOp = hill(x.vent.opioid / REMI_VENT_C50, REMI_VENT_H);
  const dProp = hill(x.vent.propofol / PROP_VENT_C50, 1.5);
  const dVol = hill(x.macVolatile / VOL_VENT_C50, 2);
  const dMid = hill(x.vent.midazolam / MIDAZ_VENT_C50, 1.5);
  const dKet = (0.3 * x.vent.ketamine) / (x.vent.ketamine + 2000);
  const dHyp = 1 - (1 - dProp) * (1 - dVol) * (1 - dMid) * (1 - dKet);
  const syn = 1 - SYNERGY * dOp * dHyp;
  const totalDep = 1 - (1 - dOp) * (1 - dHyp) * syn;
  const opR = 1 - dOp * dOp;
  const hyR = 1 - dHyp ** 2.48;
  const veRest = opR * hyR * syn;
  const strength = 1 - x.diaBlock;
  const nmbVt = Math.max(0, Math.min(1, strength / DIAPH_WEAK));
  const loc = Math.max(0, Math.min(1, ((x.hypnotic ?? 0) - LOC_LO) / (LOC_HI - LOC_LO)));
  let apnoea = x.wasApnoeic ? veRest < APNOEA_OUT : veRest < APNOEA_IN;
  if (strength < DIAPH_APNOEA) apnoea = true;
  // upper airway: residual block (TOFR < 0.9) and sedation (DI < 60 or dOp > 0.3: tables §4.6 uaCollapse)
  // FU-6 R3(d) (D21): arousal scales the RESIDUAL-BLOCK share between UA_AROUSAL (awake, Eikermann 2003) and 1
  // (unconscious — the tables' own value); the sedation arm below is untouched, and a complete-obstruction event
  // (`airway: 'obstructed'`, Task 5's `airwayObs`) is unaffected because it does not come through this term.
  const residual = Math.max(0, Math.min(1, (0.9 - x.tofr) / 0.4)) * 0.8 * (UA_AROUSAL + (1 - UA_AROUSAL) * loc);
  const sedation = x.di < 60 || dOp > 0.3 ? Math.max(0, Math.min(1, (60 - x.di) / 20 + (dOp > 0.3 ? 0.5 : 0))) : 0;
  const obstruction = x.naturalAirway ? Math.max(residual, sedation) : 0;
  return {
    opioidDep: dOp, hypnoticDep: dHyp, totalDep, veRest,
    rrMult: apnoea ? 0 : opR * hyR ** -0.6,
    vtMult: apnoea ? 0 : hyR ** 1.6 * syn * nmbVt * (1 - Math.min(0.9, obstruction)),
    apnoea, pMaxMult: strength, obstruction, nmbVtMult: nmbVt, loc,
    // the curare cleft is the sign of a PARTIAL block wearing off under mechanical ventilation (tables §5d)
    cleft: x.diaBlock > 0.05 ? Math.max(0, Math.min(1, strength * (1 - totalDep))) : 0,
  };
}
