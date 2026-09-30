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
/** FU-7 (addendum 20; review F2 / Orchestrator ruling (FU-7 review) 2): the VENTILATORY response-surface α is PER CLASS.
 * Opioid + benzodiazepine is strongly synergistic for breathing — VENT_ALPHA_BENZO [ENG; fit target Bailey 1990:
 * fentanyl 2 µg/kg + midazolam 0.05 mg/kg → SpO2 < 90 % in 11/12, apnoea in 6/12 (DI-03 nadir 70–89 %)]. Opioid +
 * propofol (and the other non-benzodiazepine hypnotics and the volatiles) is close to ADDITIVE for breathing although
 * the BIS interaction is synergistic — VENT_ALPHA_HYP [ENG, low; Nieuwenhuijs 2003]. pd.ts's SURFACE_ALPHA is the EEG
 * surface's [ENG] constant and is NOT reused here. (Replaces SYNERGY 0.5, whose only reader was the old product term.) */
export const VENT_ALPHA_BENZO = 1.5;
export const VENT_ALPHA_HYP = 0.3;
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
 * FU-6 R12: the hypoxic ventilatory response is the MORE anaesthetic-sensitive arm. VOLATILE (the arm the audit asked
 * for): Knill & Gelb, Anesthesiology 1978;49:244 — halothane/enflurane 0.1 MAC abolish most of it; Dahan & Teppema,
 * BJA 2003;91:40 — 0.1 MAC blunts it 30–70 %. Emax 0.9, C50 0.1 MAC.
 * PROPOFOL: contested at SEDATIVE doses — Nieuwenhuijs et al. 2001 (Anesthesiology 95:889, "absence of depression of the
 * peripheral chemoreflex loop by low-dose propofol") found NO peripheral (hypoxic) depression at 0.75–1.5 µg/mL while the
 * CENTRAL loop was depressed; reduced hypoxic responses appear at higher, anaesthetic concentrations (Blouin et al. 1993,
 * Anesthesiology 79:1177). [ENG] The C50 is therefore set at an ANAESTHETIC concentration — 3 × PROP_VENT_C50 ≈ 3.5 µg/mL
 * — so a sedative dose leaves the hypoxic arm nearly intact (hvrDep 0.13 at 1.0 µg/mL, 0.22 at 1.5, 0.55 at 4.0) while a
 * full induction dose depresses it; fit target: the isocapnic unit rows of Task 10.
 * Opioids and midazolam depress it as their CO2 depression [ENG sizes, directions sourced]. Sizes: Q-FU6-5 (Ali).
 */
export const HVR_VOL_C50 = 0.1;
export const HVR_VOL_EMAX = 0.9;
export const HVR_PROP_C50 = 3 * PROP_VENT_C50; // FU-6 F3b: an ANAESTHETIC C50 ≈ 3.5 µg/mL (was PROP_VENT_C50 / 3 = 0.39)
/**
 * FU-6 R3(d) (Q-FU6-4 ruled, D21 — the second half of that ruling; Task 5 Step 5 carries the first): a PARTIAL
 * neuromuscular block depresses the CAROTID hypoxic ventilatory response by ≈ 30 % at TOFR 0.7 (Eriksson, Sato &
 * Severinghaus 1993 Anesthesiology 78:693 — nicotinic receptors in the carotid body; the coverage matrix's NN-08).
 * It is a chemoreceptor effect, so unlike the obstruction arm it acts with a tube in place too. Ramp over TOFR 0.9 →
 * HVR_NMB_TOFR_LO, Emax 0.3 [ENG ramp, size sourced]. This is the ONLY NMB arm of `hvrDep` (Q-FU6-15 answered for the
 * residual-block range; FU-7 adds none).
 */
export const HVR_NMB_EMAX = 0.3;
export const HVR_NMB_TOFR_LO = 0.7;
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
  /** FU-7 (addendum 20): 7g's propofol-equivalent hypnotic Ce at the VENTILATORY site, ng/mL — every hypnotic in ONE
   * input (thiopental and etomidate depress breathing too); replaces the per-agent propofol/midazolam/ketamine terms. */
  hypVentPropEq?: number;
  /** FU-7 (D7): the MODELED chemoreflex's committed spontaneous rate (`resp.spont.rr`, FU-6's relative threshold puts
   * it at 0 for apnoea). Present in MODELED whatever the ventilator is doing (FU-6 evaluates `spont` for the trigger
   * while ventilated); when present it IS the apnoea truth. */
  spontRr?: number;
  /** FU-7 (review F2): the benzodiazepine share of `hypVentPropEq` (7g's `cns.benzoShare`), 0–1 — the per-class α. */
  benzoShare?: number;
  macVolatile: number; // brain MAC fraction of the potent volatiles (N2O excluded)
  diaBlock: number; // 0–1
  tofr: number; // thumb TOF ratio (pharyngeal weakness proxy)
  di: number; // raw depth index
  naturalAirway: boolean; // no tube / supraglottic device
  wasApnoeic: boolean;
  hypnotic?: number; // FU-6: depth.ts consciousness level (≥ 1 unconscious); absent = awake
  stress?: number; // FU-6 R12: depth.ts `stress` = noxious stimulus × (1 − antinociception), 0–1; absent = 0
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
  pain: number; // FU-6 R12: the nociceptive drive input to 7b's drive (depth.ts stress)
  hvrDep: number; // FU-6 R12: depression of the hypoxic ventilatory response (0–1)
}

const hill = (x: number, h: number) => (x > 0 ? x ** h / (1 + x ** h) : 0);
/** FU-7 (addendum 20): the ventilatory hypnotic equivalent, or the pre-FU-7 per-agent sum when 7g does not publish it. */
const hypVent = (x: DriveInputs): number => x.hypVentPropEq ?? x.vent.propofol + (PROP_VENT_C50 / MIDAZ_VENT_C50) * x.vent.midazolam + 0.3 * (PROP_VENT_C50 / 2000) * x.vent.ketamine;
/** FU-7 (review F2): the hypnotic class's α on the opioid–hypnotic surface — VENT_ALPHA_BENZO for the benzodiazepine
 * share of the equivalent, VENT_ALPHA_HYP for the rest (7g's benzoShare; the per-agent share as the fallback). */
const alphaHyp = (x: DriveInputs): number => {
  const h = hypVent(x);
  const share = x.benzoShare ?? (h > 0 ? ((PROP_VENT_C50 / MIDAZ_VENT_C50) * x.vent.midazolam) / h : 0);
  return VENT_ALPHA_HYP + (VENT_ALPHA_BENZO - VENT_ALPHA_HYP) * Math.min(1, Math.max(0, share));
};

export function neuroResp(x: DriveInputs): NeuroResp {
  // FU-7 (addendum 20; review F2): the opioid C50 is divided by 1 + α·(the hypnotic units), each class with its own α
  const dOp = hill(x.vent.opioid / (REMI_VENT_C50 / (1 + alphaHyp(x) * (hypVent(x) / PROP_VENT_C50) + VENT_ALPHA_HYP * (x.macVolatile / VOL_VENT_C50))), REMI_VENT_H);
  // FU-7 (addendum 20): ONE hypnotic ventilatory term from 7g's equivalent (ketamine already weighted by `ventShare`,
  // etomidate by its 0.7). Each class's C50 is divided by 1 + α·(the OTHER class's units) — a single agent keeps its
  // own calibration (Nieuwenhuijs 2003: remifentanil 1 ng/mL −28 %, propofol 1 µg/mL −13 %); the benzodiazepine pair is
  // supra-additive (Bailey 1990, α 1.5) and propofol–opioid nearly additive (Nieuwenhuijs 2003, α 0.3) — review F2.
  const hypC = hypVent(x);
  const uO = x.vent.opioid / REMI_VENT_C50;
  const dProp = hill(hypC / (PROP_VENT_C50 / (1 + alphaHyp(x) * uO)), 1.5);
  const dVol = hill(x.macVolatile / (VOL_VENT_C50 / (1 + VENT_ALPHA_HYP * uO)), 2);
  const dHyp = 1 - (1 - dProp) * (1 - dVol);
  const syn = 1; // the surface replaces the old product term (SYNERGY deleted, review F17)
  const totalDep = 1 - (1 - dOp) * (1 - dHyp) * syn;
  const opR = 1 - dOp * dOp;
  const hyR = 1 - dHyp ** 2.48;
  const veRest = opR * hyR * syn;
  const strength = 1 - x.diaBlock;
  const nmbVt = Math.max(0, Math.min(1, strength / DIAPH_WEAK));
  const loc = Math.max(0, Math.min(1, ((x.hypnotic ?? 0) - LOC_LO) / (LOC_HI - LOC_LO)));
  // FU-6 R3(d) (D21, Eriksson 1993): a residual block blunts the carotid hypoxic response — with or without a tube
  const hvrNmb = HVR_NMB_EMAX * Math.max(0, Math.min(1, (0.9 - x.tofr) / (0.9 - HVR_NMB_TOFR_LO)));
  // FU-7 (ruling 3): the hypnotic factor reads the ONE ventilatory equivalent (thiopental, etomidate and midazolam depress
  // the hypoxic arm too) and dMid is gone (its share is inside hypC). HVR_PROP_C50 = 3 × PROP_VENT_C50 (FU-6 F3b) and the
  // volatile, opioid and NMB factors are FU-6's, unchanged — propofol's own hvrDep is identical by construction.
  const hvrDep = 1 - (1 - HVR_VOL_EMAX * hill(x.macVolatile / HVR_VOL_C50, 1)) * (1 - hill(hypC / HVR_PROP_C50, 1.5)) * (1 - dOp) * (1 - hvrNmb);
  // FU-7 (D7): ONE truth. In MODELED the chemoreflex decides whether the patient breathes (FU-6's relative threshold
  // puts `resp.spont.rr` at 0), so the flag and the `apnoea` neuro mark read it; the drug-derived hysteresis stays for
  // MANUAL, where there is no chemoreflex. research/14 DI-89: the flag was set for 255 s at VE 8.4 L/min.
  let apnoea = x.spontRr !== undefined ? x.spontRr <= 0 : x.wasApnoeic ? veRest < APNOEA_OUT : veRest < APNOEA_IN;
  if (strength < DIAPH_APNOEA) apnoea = true; // no effective breath whatever the drive (diaphragm block)
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
    apnoea, pMaxMult: strength, obstruction, nmbVtMult: nmbVt, loc, pain: Math.max(0, Math.min(1, x.stress ?? 0)), hvrDep,
    // the curare cleft is the sign of a PARTIAL block wearing off under mechanical ventilation (tables §5d)
    cleft: x.diaBlock > 0.05 ? Math.max(0, Math.min(1, strength * (1 - totalDep))) : 0,
  };
}
