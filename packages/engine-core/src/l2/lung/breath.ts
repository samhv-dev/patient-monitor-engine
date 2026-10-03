// Stage 7k (R57): per-breath respiratory mechanics, measured the way a clinician measures them (Hess & Kacmarek,
// Essentials of Mechanical Ventilation 4e ch. 3 "Pulmonary mechanics"; Arnal 2018; the lung module's own measure.ts
// method): Ppeak = the airway-opening pressure at the end of inspiratory flow (the highest Paw of the breath); Pplat =
// the airway pressure after an END-INSPIRATORY HOLD; PEEPtot = the airway pressure after an END-EXPIRATORY HOLD;
// PEEPi = PEEPtot − set PEEP; ΔP = Pplat − PEEPtot; Cstat = VT/(Pplat − PEEPtot); Cdyn = VT/(Ppeak − PEEPtot);
// Rinsp = (Ppeak − Pplat)/V̇insp (square-flow volume control). Both holds run on a COPY of the unit state
// (measure.ts `holdPressure`), so measuring never disturbs the patient — the truth is "what a hold would read on
// this breath"; the ventilator link has its own hold buttons (V.1's `Measured.PLAT`/`autoPEEP`), which 7k does not
// duplicate. VT is the volume the lung received (FU-6: a pressure-limited breath delivers less than the set VT).
//
// OESOPHAGEAL PRESSURE IS AN ESTIMATE (glossary: "Pes (estimate)"), not a simulated balloon, and its reference depends
// on the context (orchestrator ruling on the 7k R50 review, F4):
//   AWAKE, SPONTANEOUS (upright-teaching context): Pes = the lung model's own pleural pressure (7a/7b `respPleural`,
//     mmHg → cmH2O): −5.4 cmH2O at FRC (P_PL0 −4 mmHg) falling ≈ 4 cmH2O in a quiet inspiration — West's textbook
//     values (Ppl ≈ −5 at FRC, ≈ −8 at end-inspiration; Respiratory Physiology ch. 7), so PL,ee ≈ +5, as a
//     spontaneously breathing lung at FRC must read (a positive transpulmonary pressure holds it open).
//   SUPINE AND VENTILATED OR ANAESTHETISED (gaLvl ≥ 0.5 or a positive-pressure source): the balloon's supine value,
//     Pes = PES_FRC_CMH2O + PES_BMI_SLOPE·(BMI − 22.5)₊ + ΔPpl(t). PES_FRC_CMH2O 6.9 cmH2O is the supine end-expiratory
//     Pes of lean subjects at the relaxation volume (Owens et al. 2012 Obesity 20:2354, PMC3443522: lean supine
//     6.9 ± 2.8, seated −3.3 — the mediastinal weight and the dependent position); the BMI slope 0.22 cmH2O per kg/m² is
//     the line through the same study's two group means (6.9 at BMI 22.5, 9.3 at 33.3) [ENG line through two means;
//     applied to children too, [ENG], no paediatric balloon data]. ΔPpl(t) on a PASSIVE breath is the lung model's own
//     chest-wall recoil ΣV/Ccw (+ `lp.pPtx`/7a `ext.pPtx`, + a cough's `pMus`), so ΔPes/ΔPaw = Ecw/Ers = Crs/Ccw
//     (≈ 0.27 healthy), as a balloon measures it — NOT 7a's haemodynamic transmission T_IT 0.65, tuned to pulse-
//     pressure variation (R45 (b)); on a spontaneous breath under GA, 7a's pleural swing.
// PL (transpulmonary, "direct" method, Talmor 2008 NEJM 359:2095) = Paw − Pes at the two holds (Paw 0 when
// spontaneous). EL/Ers (the lung's share of the respiratory-system elastance) is published too: the elastance-derived
// PL,ei = Pplat × EL/Ers (Chiumello 2008 AJRCCM 178:346).
import { holdPressure } from './measure.ts';
import type { MechParams, MechState } from './mechanics.ts';

export const PES_FRC_CMH2O = 6.9;
export const PES_BMI_SLOPE = 0.22; // cmH2O per kg/m² above PES_BMI_REF
export const PES_BMI_REF = 22.5;
/** End-inspiratory hold 0.3 s and end-expiratory hold 2 s (the lung module's measure.ts; Arnal 2018). */
export const HOLD_INSP_S = 0.3;
export const HOLD_EXP_S = 2;

export interface Mechanics {
  t: number; // sim time of this breath's end-inspiration
  kind: 'mech' | 'spont';
  vt: number; // mL delivered
  ppeak: number | null;
  pplat: number | null;
  peepTot: number | null;
  peepi: number | null;
  dp: number | null;
  cstat: number | null;
  cdyn: number | null;
  rinsp: number | null; // cmH2O·s/L
  flow: number | null; // L/s, mean inspiratory flow
  pesEi: number;
  pesEe: number;
  plEi: number;
  plEe: number;
  elErs: number;
}

/** Supine balloon estimate (cmH2O, ventilated/anaesthetised): `dPpl` = the pleural-pressure change from the relaxation volume. */
export function pesEstimate(dPpl: number, bmi: number): number {
  return PES_FRC_CMH2O + PES_BMI_SLOPE * Math.max(0, bmi - PES_BMI_REF) + dPpl;
}

/** End-expiratory hold on a copy: PEEPtot (cmH2O). */
export function expHold(mp: MechParams, ms: MechState): number {
  return holdPressure(mp, ms, HOLD_EXP_S, 0);
}
/** End-inspiratory hold on a copy: Pplat (cmH2O). */
export function inspHold(mp: MechParams, ms: MechState): number {
  return holdPressure(mp, ms, HOLD_INSP_S, 0);
}

export interface BreathInputs {
  /** `limited`: the flow was not square (a pressure-limited VCV breath at Pmax, or an external PCV/PSV frame): Rinsp is not measurable (F7). */
  t: number; mech: boolean; limited: boolean; vt: number; ti: number; peep: number;
  ppeak: number; pplat: number; peepTot: number; pesEi: number; pesEe: number; elErs: number;
}
const r1 = (x: number) => Math.round(x * 10) / 10;
const r2 = (x: number) => Math.round(x * 100) / 100;

export function breathMechanics(x: BreathInputs): Mechanics {
  const pawEi = x.mech ? x.pplat : 0;
  const pawEe = x.mech ? x.peepTot : 0;
  const base = { t: r2(x.t), vt: Math.round(x.vt), pesEi: r1(x.pesEi), pesEe: r1(x.pesEe), plEi: r1(pawEi - x.pesEi), plEe: r1(pawEe - x.pesEe), elErs: r2(x.elErs) };
  if (!x.mech) return { ...base, kind: 'spont', ppeak: null, pplat: null, peepTot: null, peepi: null, dp: null, cstat: null, cdyn: null, rinsp: null, flow: null };
  const dp = x.pplat - x.peepTot;
  const flow = x.vt / 1000 / Math.max(0.1, x.ti);
  return {
    ...base, kind: 'mech', ppeak: r1(x.ppeak), pplat: r1(x.pplat), peepTot: r1(x.peepTot), peepi: r1(Math.max(0, x.peepTot - x.peep)),
    dp: r1(dp), cstat: dp > 0.5 ? r1(x.vt / dp) : null, cdyn: x.ppeak - x.peepTot > 0.5 ? r1(x.vt / (x.ppeak - x.peepTot)) : null,
    rinsp: x.limited ? null : r1((x.ppeak - x.pplat) / Math.max(0.01, flow)), flow: r2(flow),
  };
}

export interface DeadSpace { anat: number; app: number; alv: number; phys: number; vdvt: number; peco2: number }
/**
 * The dead-space set of one breath. anat + app = FU-4's `physicalDeadSpace()` (the one series dead space); VD/VT is
 * ENGHOFF's with the inspired-CO2 correction, (PaCO2 − PĒCO2)/(PaCO2 − PICO2). The mixed-expired PCO2 of the breath
 * follows from the CO2 the lung actually eliminates (gas/co2.ts: V̇CO2,exp = φ·V̇A·e·(PaCO2 − PICO2)/0.863 above the
 * inspired CO2): PĒCO2 = PICO2 + φ·e·(1 − VDs/VT)·(PaCO2 − PICO2) — e is the lung's CO2-elimination efficiency
 * (alveolar dead space and venous admixture: the Enghoff dead space includes the shunt effect, as measured Enghoff
 * VD/VT does), so VD/VT = 1 − φ·e·(1 − VDs/VT). VD phys = VD/VT × VT; VD alv = VD phys − VDs (the volumetric-capnography
 * split: Fletcher 1981; Tusman 2012).
 */
export function deadSpaceSet(x: { vt: number; vdSeries: number; vdApp: number; paco2: number; pico2: number; e: number; phi: number }): DeadSpace {
  const vt = Math.max(1, x.vt);
  const pi = Math.max(0, x.pico2);
  const peco2 = pi + x.phi * x.e * Math.max(0, 1 - x.vdSeries / vt) * Math.max(0, x.paco2 - pi);
  const vdvt = x.paco2 - pi > 0.5 ? Math.min(1, Math.max(0, (x.paco2 - peco2) / (x.paco2 - pi))) : 1;
  const phys = vdvt * vt;
  return { anat: Math.round(x.vdSeries - x.vdApp), app: Math.round(x.vdApp), alv: Math.round(Math.max(0, phys - x.vdSeries)), phys: Math.round(phys), vdvt: r2(vdvt), peco2: r1(peco2) };
}
