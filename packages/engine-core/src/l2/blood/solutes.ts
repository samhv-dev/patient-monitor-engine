// Extracellular solutes as AMOUNTS (mmol) so that dilution, infusion and bleeding are mass-conserving; concentrations
// are amount / ECF volume (tables §5b.1–5b.2; annex B1 "Electrolytes: take the initial values … ours: K transcellular
// shift, pH–K, citrate/iCa, Mg"). The strong-ion difference is recomputed from these every step (audit #5: DYNAMIC
// SID), so lactate, saline chloride, ketoacids and sodium bicarbonate all move the pH by construction.
import { MG_ION_FRAC, NORMAL, OSM0, type Composition } from './params.ts';

export interface SoluteState {
  na: number; k: number; cl: number;
  ca: number; // ionised-calcium-equivalent amount (mmol)
  mg: number; // total Mg amount
  xa: number; // unmeasured strong anions (sulphate, urate, …), calibrated so the start is pH 7.40 / HCO3 24.4
  keto: number; // ketoacid anions (DKA input)
  metab: number; // acetate/gluconate awaiting metabolism
  citrate: number; // free citrate (transfusion)
  osmOther: number; // glycine and other non-Na effective osmoles
  lac: number; // lactate amount in its distribution volume
  kIcf: number; // cellular K pool (mmol)
  pi: number; // phosphate amount (mmol; dilutes with the ECF) [ENG]
  set: { k: number; ca: number; mg: number; ph: number }; // homeostatic set points (mmol/L; pH of the K reference)
}

export interface Conc {
  na: number; k: number; cl: number; iCaRaw: number; mg: number; xa: number; keto: number; metab: number;
  citrate: number; osmOther: number; lactate: number; pi: number;
}

export function concOf(s: SoluteState, ecfMl: number, vLacL: number, ecf0Ml: number): Conc {
  const v = ecfMl / 1000;
  return {
    na: s.na / v, k: s.k / v, cl: s.cl / v, iCaRaw: s.ca / v, mg: s.mg / v, xa: s.xa / v, keto: s.keto / v,
    metab: s.metab / v, citrate: s.citrate / v, osmOther: s.osmOther / v, pi: s.pi / v,
    lactate: s.lac / (vLacL + (ecfMl - ecf0Ml) / 1000),
  };
}

/** Apparent SID (mEq/L): Na + K + 2·iCa + 2·Mg_ion − Cl − lactate − keto − metab − XA (tables §5b.1 "Stewart-lite"). */
export function sidOf(c: Conc, iCa: number): number {
  return c.na + c.k + 2 * iCa + 2 * MG_ION_FRAC * c.mg - c.cl - c.lactate - c.keto - c.metab - c.xa;
}

/** Effective ECF osmolality (mOsm/kg): 2·Na + 10 (glucose + urea at normal) + other osmoles. */
export function osmEcf(c: Conc): number {
  return 2 * c.na + 10 + c.osmOther;
}

export function createSolutes(p: { na: number; k: number; cl: number; iCa: number; mg: number; lactate: number }, ecfMl: number, vLacL: number, icfMl: number): SoluteState {
  const v = ecfMl / 1000;
  return {
    na: p.na * v, k: p.k * v, cl: p.cl * v, ca: p.iCa * v, mg: p.mg * v, xa: 0, keto: 0, metab: 0, citrate: 0, osmOther: 0,
    lac: p.lactate * vLacL, kIcf: 140 * (icfMl / 1000), pi: NORMAL.piMmolL * v, set: { k: p.k, ca: p.iCa, mg: p.mg, ph: 7.4 },
  };
}

/** Add `ml` of a fluid/product (its non-cell part carries the solutes; Ca in products is already chelated). */
export function addFluid(s: SoluteState, ml: number, c: Composition): void {
  const l = (ml * (1 - c.hct)) / 1000;
  s.na += c.na * l;
  s.k += c.k * l;
  s.cl += c.cl * l;
  s.ca += 0.5 * c.ca * l; // half of a crystalloid's Ca is ionised once albumin binds it [ENG]
  s.mg += c.mg * l;
  s.lac += c.lactate * l;
  s.metab += c.metab * l;
  s.xa += c.xa * l;
  s.citrate += c.citrate * l;
  s.osmOther += c.osmOther * l;
}

/** Remove the solutes carried by `plasmaMl` of plasma (haemorrhage), at the current ECF concentrations. */
export function removePlasma(s: SoluteState, plasmaMl: number, ecfMl: number, c: Conc): void {
  const f = plasmaMl / ecfMl;
  for (const k of ['na', 'k', 'cl', 'ca', 'mg', 'xa', 'keto', 'metab', 'citrate', 'osmOther', 'pi'] as const) s[k] -= s[k] * f;
  s.lac -= c.lactate * (plasmaMl / 1000);
}

/** Starting XA (mmol) so that the start state has the target SID. */
export function calibrateXa(s: SoluteState, ecfMl: number, sidNow: number, sidTarget: number): void {
  s.xa += (sidNow - sidTarget) * (ecfMl / 1000);
}

/** Homeostasis and first-order kinetics (per step): transcellular K, Ca and Mg buffering, citrate and metabolisable anions. */
export const K_TAU_MIN = 43; // 50 % of a K load into cells in 30 min (tables `vK`) [ENG]
export const CA_TAU_MIN = 15; // ionised Ca returns to its set point (bone/protein buffer, PTH) [ENG, Q46]
export const MG_TAU_MIN = 60; // Mg load distributes into cells/bone [ENG]
export const CITRATE_TAU_MIN = 5; // hepatic citrate clearance at normal hepatic flow (tables `citrateUnit`) [TXT]
export const METAB_TAU_MIN = 15; // acetate/gluconate metabolism to bicarbonate [ENG]
export const OSM_OTHER_T12_MIN = 85; // glycine metabolism [TXT]

/**
 * `clearF` = hepatic flow × function (citrate, acetate); `kUptake` = the Na/K-ATPase rate multiplier (1 at rest;
 * insulin/β2 stimulation raises it, core.ts) that divides the transcellular K time constant.
 */
export function stepSolutes(s: SoluteState, ecfMl: number, dtS: number, kSet: number, clearF: number, kUptake = 1): void {
  const dtM = dtS / 60;
  const v = ecfMl / 1000;
  const jk = ((s.k / v - kSet) * v * dtM * kUptake) / K_TAU_MIN; // mmol into cells
  s.k -= jk;
  s.kIcf += jk;
  s.ca -= ((s.ca / v - s.set.ca) * v * dtM) / CA_TAU_MIN;
  s.mg -= ((s.mg / v - s.set.mg) * v * dtM) / MG_TAU_MIN;
  const liver = Math.max(0.05, clearF);
  s.citrate *= Math.exp((-dtM * liver) / CITRATE_TAU_MIN);
  s.metab *= Math.exp((-dtM * liver) / METAB_TAU_MIN);
  s.osmOther *= Math.exp((-Math.LN2 * dtM) / OSM_OTHER_T12_MIN);
}

/**
 * Ionised calcium (mmol/L): the buffered ionised amount, shifted by pH (−0.05 per +0.1 pH) [TXT] and chelated by free
 * citrate (0.09 mmol/L per mmol/L citrate: 1 RBC unit per 5 min at steady state → −0.1, tables `citrateUnit`) [ENG, Q46].
 */
export const K_CIT = 0.09;
export function ionisedCa(c: Conc, ph: number): number {
  return Math.max(0.3, c.iCaRaw * (1 - 0.42 * (ph - 7.4)) - K_CIT * c.citrate);
}

/** ICF osmolality / ECF osmolality ratio (cells swell when > 1). */
export function osmRatio(c: Conc): number {
  return osmEcf(c) / OSM0;
}
